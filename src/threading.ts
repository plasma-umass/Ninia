import Py_FrameObject = require('./frameobject');

maxMethodResumes: number = 10000,
// The number of method resumes until Doppio should yield again.
methodResumesLeft: number = maxMethodResumes,
// How responsive Ninia should aim to be, in milliseconds.
responsiveness: number = 1000,
// Used for the CMA.
numSamples: number = 1;

export class Thread{

	//  TODO: Add ThreadStatus enums in enums.ts
	private status: enums.ThreadStatus = enums.ThreadStatus.NEW;
	private stack: Py_FrameObject[] = [];

	// TODO: Add constructor arguements as needed
	constructor() {	

	}

	// TODO: Fill in the function details
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
	}

	// TODO: Change status, followed by setImmediate callback to run()
	public setStatus(status: enums.ThreadStatus): void {
		// Change status of thread to running/runnable or async_waiting
		// Yield to main javascript loop after doing so, with a callback to run()
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
	public asyncReturn(rv?: any, rv2?: any): void {

	}

	// TODO: Terminate thread
	public exit(): void {

	}
}