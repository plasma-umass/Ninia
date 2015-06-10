import interfaces = require('./interfaces');
import IPy_Object = interfaces.IPy_Object;
import Py_CodeObject = require('./codeobject');
import Py_FuncObject = require('./funcobject');
import opcodes = require('./opcodes');
import optable = require('./optable');
import Py_Cell = require('./cell');
import Py_FrameObject = require('./frameobject');
import enums = require('./enums');

var maxMethodResumes: number = 10000,
// The number of method resumes until Doppio should yield again.
methodResumesLeft: number = maxMethodResumes,
// How responsive Ninia should aim to be, in milliseconds.
responsiveness: number = 1000,
// Used for the CMA.
numSamples: number = 1;

class Thread{
	// Current state of Thread, always start in NEW state
	private status: enums.ThreadStatus = enums.ThreadStatus.RUNNING;
	private stack: Py_FrameObject[] = [];

	// TODO: Add constructor arguements as needed
	constructor() {	

	}

	// TODO: Handle bytecode method calls (e.g. Py_fun inside of Py_FrameObject), so that run() executes them individually
	public run(): void {
		// console.log("Entering Thread run()");

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
			// console.log("**********in main loop");
			var bytecodeMethod: Py_FrameObject = stack[stack.length - 1];
			// console.log("METHOD: ",  opcodes[bytecodeMethod.peekOp()], "methodResumesLeft", methodResumesLeft);
			// Execute python bytecode methods
			bytecodeMethod.new_exec(this);
			// console.log("methodResumesLeft", methodResumesLeft);
			// If no method resumes are left, yield to javascript event loop
			if (--methodResumesLeft === 0) {
				// console.log("INSIDE FUNC: ", stack.length);

				endTime = (new Date()).getTime();
				duration = endTime - startTime;
				console.log("Duration: ", duration);
				// Estimated number of methods we can resume before needing to yield.
				estMaxMethodResumes = Math.floor((maxMethodResumes / duration) * responsiveness);
				// Update CMA.
				maxMethodResumes = Math.floor((estMaxMethodResumes + numSamples * maxMethodResumes) / (numSamples + 1));
				console.log("Resumes: ", maxMethodResumes);
				numSamples++;
				// Yield.
				this.setStatus(enums.ThreadStatus.ASYNC_WAITING);
				setImmediate(() => { this.setStatus(enums.ThreadStatus.RUNNABLE); });
				console.log("Thread returned");
			}
		}

		if (stack.length === 0) {
			// This thread has finished!
			// console.log("Thread has been terminated\n");
			this.setStatus(enums.ThreadStatus.TERMINATED);
		}
	}

	// Change Thread status
	public setStatus(status: enums.ThreadStatus): void {
		
		this.status = status;
		switch (this.status) {
			// If thread is runnable, yield to JS event loop and then change the thread to running
			case enums.ThreadStatus.RUNNABLE:
				setImmediate(() => { this.setStatus(enums.ThreadStatus.RUNNING); });
				// console.log("returned from runnable");				
				break;
			case enums.ThreadStatus.RUNNING:
				// I'm scheduled to run!
				// console.log("Resuming running");
				this.run();
				break;
			case enums.ThreadStatus.TERMINATED:
				this.exit();
				break;
		}
	}

	public getStatus(): enums.ThreadStatus {
		return this.status;
	}

	public framePop(): void {
		this.stack.pop();
	}
	
	public framePush(frame: Py_FrameObject): void {
		this.stack.push(frame);
	}	

	// TODO: Handle exceptions when exception support is added
	public throwException(): void {

	}

	// TODO: Push the return value from a finished function's stack frame onto the calling function's stack frame.
	public asyncReturn(rv?: any): void {

	}

	// TODO: Terminate thread
	public exit(): void {

	}
}
export = Thread;