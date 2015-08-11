import {IPy_Object, IPy_FrameObj} from './interfaces';
import {ThreadStatus} from './enums';
import os = require('os');
import Py_CodeObject = require('./codeobject');
import Py_FuncObject = require('./funcobject');
import opcodes = require('./opcodes');
import optable = require('./optable');
import Py_Cell = require('./cell');
import Py_FrameObject = require('./frameobject');
import Py_Sys = require('./sys');
import {Py_Thread, Py_Lock} from './thread';
import assert = require('./assert');

// How responsive Ninia should aim to be, in milliseconds.
const responsiveness: number = 1000;

var maxMethodResumes: number = 10000,
    // The number of method resumes until Doppio should yield again.
    methodResumesLeft: number = maxMethodResumes,
    // Used for the CMA.
    numSamples: number = 1;

export class Thread {
    // Current state of Thread
    private status: ThreadStatus = ThreadStatus.NEW;
    private stack: IPy_FrameObj[] = [];
    public raise_lno: number = 0;
    public traceback: string = "";
    public codefile: string[] = [];
    public sys: Py_Sys;
    public exc: IPy_Object;
    public tpool: ThreadPool;
    public isMainThread: boolean = false;
    public id: number = -1;

    constructor(sys: Py_Sys, tpool: ThreadPool, id: number) {
        this.sys = sys;
        this.tpool = tpool;
        this.id = id;
    }
    // Executes bytecode method calls
    private run(): void {
        var stack = this.stack,
            startTime: number = (new Date()).getTime(),
            endTime: number,
            duration: number,
            estMaxMethodResumes: number;

        methodResumesLeft = maxMethodResumes;
        // If methodResumes not exceeded, execute the Py_FrameObject
        // else, reset the counter, suspend thread and resume thread using setImmediate
        // Use cumulative moving average to calculate to estimate number of methodResumes in one second
        while (this.status === ThreadStatus.RUNNING && stack.length > 0) {
            var bytecodeMethod: IPy_FrameObj = stack[stack.length - 1];
            // Execute python bytecode methods
            bytecodeMethod.exec(this);

            // If no method resumes are left, yield to javascript event loop
            if (--methodResumesLeft === 0) {
                endTime = (new Date()).getTime();
                duration = endTime - startTime;
                // Estimated number of methods we can resume before needing to yield.
                estMaxMethodResumes = Math.floor((maxMethodResumes / duration) * responsiveness);
                // Update CMA.
                maxMethodResumes = Math.floor((estMaxMethodResumes + numSamples * maxMethodResumes) / (numSamples + 1));
                numSamples++;
                // Yield.
                this.setStatus(ThreadStatus.ASYNC_WAITING);
                setImmediate(() => { this.setStatus(ThreadStatus.RUNNABLE); });
            }
        }

        if (stack.length === 0) {
            this.setStatus(ThreadStatus.TERMINATED);
        }
    }

    public rawSetStatus(status: ThreadStatus): void {
        this.status = status;
    }

    // Change Thread status
    public setStatus(status: ThreadStatus): void {
        // Fix for a single thread terminating multiple times in run(), whenever its stack is empty
        if (this.status === ThreadStatus.TERMINATED && status === ThreadStatus.TERMINATED)
        {
            return;
        }
        this.rawSetStatus(status);
        switch (this.status) {
            // If thread is runnable, yield to JS event loop and then change the thread to running
            case ThreadStatus.RUNNABLE:
                this.tpool.scheduleNextThread();
                break;
            case ThreadStatus.RUNNING:
                // I'm scheduled to run!
                this.run();
                break;
            case ThreadStatus.TERMINATED:
                this.exit();
                break;
            default:
                // ASYNC_WAITING, changing running thread to be null
                this.tpool.threadSuspended(this);
                break;        
        }
    }

    public getStatus(): ThreadStatus {
        return this.status;
    }

    public framePop(): void {
        this.stack.pop();
    }

    public framePush(frame: IPy_FrameObj): void {
        this.stack.push(frame);
    }

    public clearTraceback(): void {
        this.traceback = "";
    }

    // Maintains thread level tracebacks
    public addToTraceback(str : string): void {
        this.traceback = str + this.traceback;
    }

    // Writes thread tracebacks to console
    public writeTraceback(): void {
        this.traceback = `Traceback (most recent call last):${os.EOL}${this.traceback}`;
        process.stdout.write(this.traceback);
        this.exit();
    }

    public throwException(exc: IPy_Object): void {
        // Whenever an exception occurs, tries to find a handler and if it can't outputs the traceback 
        this.exc = exc;
        var f: IPy_FrameObj;
        for (var i = this.stack.length - 1; i >= 0; i--) {
            f = this.stack[i];
            if(f.tryCatchException(this, exc)) {
                return;
            }
            else {
                this.framePop();
            }
        }
        this.writeTraceback();
    }

    public getTopOfStack(): IPy_FrameObj {
        return this.stack[this.stack.length - 1];
    }

    public stackDepth(): number {
        return this.stack.length;
    }

    public asyncReturn(rv?: any, exc?: any): void {
        var stack = this.stack,
          length: number;
        // framePop
        stack.pop();
        length = stack.length;
        if (length > 0) {
            stack[length - 1].resume(rv, exc);
            this.setStatus(ThreadStatus.RUNNABLE);
        } else {
            // Program has ended.
            this.setStatus(ThreadStatus.TERMINATED);
        }
    }
    public getThreadPool(): ThreadPool {
        return this.tpool;
     }

    // Terminates execution of a Thread by changing its status and then emptying its stack
    public exit(): void {
        this.status = ThreadStatus.TERMINATED;
        this.stack = [];
        // If main thread exits, terminate execution of all threads and end program
        if (this.isMainThread) {
            this.tpool.terminateAllThreads();
        }
        else {
            this.tpool.threadTerminated(this);
        }
    }
}

export class ThreadPool {
    private threads: Thread[] = [];
    private sys: Py_Sys;
    private runningThread: Thread = null;
    private runningThreadIndex: number = -1;
    private id: number = 0;
    /**
    * Called when the ThreadPool becomes empty. This is usually a sign that
    * execution has finished, and the JVM should be terminated.
    */
    private cb: () => void;
    public mainThread: Thread = null;
    constructor(sys: Py_Sys, cb: () => void) {
        this.sys = sys;
        this.cb = cb;
    }

    public getThreads(): Thread[] {
        // Return a copy of our internal array.
        return this.threads.slice(0);
    }

    private addThread(t: Thread): void {
        if (this.threads.indexOf(t) === -1) {
            this.threads.push(t);
        }
    }

    // Create a new Thread object and push it on stack
    public newThread(): Thread {
        var t = new Thread(this.sys, this, this.id);
        this.addThread(t);
        this.id++;
        return t;
    }

    /**
    * Schedules and runs the next thread.
    */
    public scheduleNextThread(): void {
        // Reset stack depth, start at beginning of new JS event.
        setImmediate(() => {
            var i: number, iFixed: number, threads = this.threads, t: Thread;
            for (i = 0; i < threads.length; i++) {
                // Cycle through the threads, starting at the thread just past the
                // previously-run thread. (Round Robin scheduling algorithm)
                iFixed = (this.runningThreadIndex + 1 + i) % threads.length;
                t = threads[iFixed];
                if (t.getStatus() === ThreadStatus.RUNNABLE) {
                    this.runningThread = t;
                    this.runningThreadIndex = iFixed;
                    t.setStatus(ThreadStatus.RUNNING);
                    break;
                }
            }
        });
    }

    /**
    * Checks if any remaining threads are non-daemonic and could be runnable.
    * If not, we can terminate execution.
    */
    private anySchedulableThreads(t: Thread): boolean {
        var i: number, t: Thread, status: ThreadStatus;
        for (i = 0; i < this.threads.length; i++) {
            t = this.threads[i];
            status = t.getStatus();
            if (status != ThreadStatus.NEW && status != ThreadStatus.TERMINATED) {
                return true;
            }
        }
        return false;
    }

    // Terminate thread and remove it from thread pool
    public threadTerminated(t: Thread): void {
        var idx: number = this.threads.indexOf(t);
        assert(idx >= 0, "Terminated thread not found in thread pool");
        // Remove the specified thread from the threadpool.
        this.threads.splice(idx, 1);

        // If this was the running thread, schedule a new one to run.
        if (this.runningThread === t) {
            this.runningThread = null;
            // The runningThreadIndex is currently pointing to the *next* thread we
            // should schedule, so take it back by one.
            this.runningThreadIndex = this.runningThreadIndex - 1;
            if (this.anySchedulableThreads(t)) {
                this.scheduleNextThread();
            }
        } else {
            // Update the index so it still points to the running thread.
            this.runningThreadIndex = this.threads.indexOf(this.runningThread);
        }
    }

    public terminateAllThreads(): void {
        this.threads = [];
        this.runningThread = null;
        this.cb();
    }

    public threadSuspended(t: Thread): void {
        // If this was the running thread, schedule a new one to run.
        if (t === this.runningThread) {
            this.runningThread = null;
            this.scheduleNextThread();
        }
    }
}