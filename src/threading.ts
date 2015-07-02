import interfaces = require('./interfaces');
import IPy_Object = interfaces.IPy_Object;
import Py_CodeObject = require('./codeobject');
import Py_FuncObject = require('./funcobject');
import opcodes = require('./opcodes');
import optable = require('./optable');
import Py_Cell = require('./cell');
import Py_FrameObject = require('./frameobject');
import IPy_FrameObj = interfaces.IPy_FrameObj;
import enums = require('./enums');

var maxMethodResumes: number = 10000,
    // The number of method resumes until Doppio should yield again.
    methodResumesLeft: number = maxMethodResumes,
    // How responsive Ninia should aim to be, in milliseconds.
    responsiveness: number = 1000,
    // Used for the CMA.
    numSamples: number = 1;

class Thread{
    // Current state of Thread
    private status: enums.ThreadStatus = enums.ThreadStatus.NEW;
    private stack: IPy_FrameObj[] = [];
    public traceback: string = "";
    public codefile: string[] = [];
    public cb: () => void;

    constructor(cb : () => void){
        this.cb = cb;
    }
    // Executes bytecode method calls
    private run(): void {
        // console.log("caller is " + arguments.callee.caller.toString());
        var stack = this.stack,
            startTime: number = (new Date()).getTime(),
            endTime: number,
            duration: number,
            estMaxMethodResumes: number;

        methodResumesLeft = maxMethodResumes;
        // If methodResumes not exceeded, execute the Py_FrameObject
        // else, reset the counter, suspend thread and resume thread using setImmediate
        // Use cumulative moving average to calculate to estimate number of methodResumes in one second
        while (this.status === enums.ThreadStatus.RUNNING && stack.length > 0) {
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
                this.setStatus(enums.ThreadStatus.ASYNC_WAITING);
                setImmediate(() => { this.setStatus(enums.ThreadStatus.RUNNABLE); });
            }
        }

        if (stack.length === 0) {
            // This thread has finished!
            // console.log(" I AM THE ONE WHO TERMINATES");
            // this.setStatus(enums.ThreadStatus.TERMINATED);
            // this.cb();
        }
    }

    // Change Thread status
    public setStatus(status: enums.ThreadStatus): void {
        this.status = status;
        switch (this.status) {
            // If thread is runnable, yield to JS event loop and then change the thread to running
            case enums.ThreadStatus.RUNNABLE:
                // console.log("caller is " + arguments.callee.caller.toString());

                setImmediate(() => { this.setStatus(enums.ThreadStatus.RUNNING); });
                break;
            case enums.ThreadStatus.RUNNING:
                // I'm scheduled to run!
                this.run();
                break;
            case enums.ThreadStatus.TERMINATED:
                // console.log("I AM EXITING");
                this.exit();
                this.cb();
                // console.log("caller is " + arguments.callee.caller.name);

                break;
        }
    }

    public getStatus(): enums.ThreadStatus {
        return this.status;
    }

    public framePop(): void {
        this.stack.pop();
    }
    
    public framePush(frame: IPy_FrameObj): void {
        this.stack.push(frame);
    }   

    public addToTraceback(str : string): void {
        this.traceback = str + this.traceback;
    }

    public writeTraceback(): void {
        this.traceback = "Traceback (most recent call last):\n" + this.traceback;
        process.stdout.write(this.traceback);
    }

    // TODO: Handle exceptions when exception support is added
    public throwException(): void {

    }

    public asyncReturn(rv?: any): void {
        var stack = this.stack,
          length: number;
        // framePop
        stack.pop();
        length = stack.length;
        if (length > 0) {
            stack[length - 1].resume(rv);
            this.setStatus(enums.ThreadStatus.RUNNABLE);
        } else {
            // Program has ended.
            this.setStatus(enums.ThreadStatus.TERMINATED);
            // console.log("******************************ASY");
        }
    }

    // Terminates execution of a Thread by changing its status and then emptying its stack
    public exit(): void {
        // console.log("LENGTH: ", this.stack.length);
        this.status = enums.ThreadStatus.TERMINATED;
        while(this.stack.length !== 0) {
            this.framePop();
        }
        

    }
}
export = Thread;