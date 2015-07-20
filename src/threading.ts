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

// How responsive Ninia should aim to be, in milliseconds.
const responsiveness: number = 1000;

var maxMethodResumes: number = 10000,
    // The number of method resumes until Doppio should yield again.
    methodResumesLeft: number = maxMethodResumes,
    // Used for the CMA.
    numSamples: number = 1;

class Thread {
    // Current state of Thread
    private status: ThreadStatus = ThreadStatus.NEW;
    private stack: IPy_FrameObj[] = [];
    public raise_lno: number = 0;
    public traceback: string = "";
    public codefile: string[] = [];
    public cb: () => void;
    public sys: Py_Sys;

    constructor(sys: Py_Sys, cb : () => void) {
        this.sys = sys;
        this.cb = cb;
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

    // Change Thread status
    public setStatus(status: ThreadStatus): void {
        // Fix for a single thread terminating multiple times in run(), whenever its stack is empty
        if (this.status === ThreadStatus.TERMINATED && status === ThreadStatus.TERMINATED)
        {
            return;
        }
        this.status = status;
        switch (this.status) {
            // If thread is runnable, yield to JS event loop and then change the thread to running
            case ThreadStatus.RUNNABLE:
                setImmediate(() => { this.setStatus(ThreadStatus.RUNNING); });
                break;
            case ThreadStatus.RUNNING:
                // I'm scheduled to run!
                this.run();
                break;
            case ThreadStatus.TERMINATED:
                this.exit();
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
    }

    // Output the traceback when thread cannot handle an exception, and exit the thread
    public throwException(): void {
        this.writeTraceback();
        this.exit();
    }

    public getTopOfStack(): IPy_FrameObj {
        return this.stack[this.stack.length - 1];
    }

    public stackDepth(): number {
        return this.stack.length;
    }

    public asyncReturn(rv?: any): void {
        var stack = this.stack,
          length: number;
        // framePop
        stack.pop();
        length = stack.length;
        if (length > 0) {
            stack[length - 1].resume(rv);
            this.setStatus(ThreadStatus.RUNNABLE);
        } else {
            // Program has ended.
            this.setStatus(ThreadStatus.TERMINATED);
        }
    }

    // Terminates execution of a Thread by changing its status and then emptying its stack
    public exit(): void {
        this.status = ThreadStatus.TERMINATED;
        while(this.stack.length !== 0) {
            this.framePop();
        }
        // execute callback
        this.cb();
    }
}
export = Thread;
