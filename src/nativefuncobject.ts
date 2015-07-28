import {IPy_Object, IPy_FrameObj, IPy_Function} from './interfaces';
import {Py_Dict} from './collections';
import {Py_Type, ThreadStatus} from './enums';
import {None} from './primitives';
import {Thread} from './threading';
import assert = require('./assert');

/**
 * A Trampoline frame object.
 * "Bounces" the return value through a provided callback.
 */
export class Py_TrampolineFrameObject implements IPy_FrameObj {
    private _cb: (rv: IPy_Object, exc: IPy_Object) => void;
    private _rv: IPy_Object = null;
    private _exc: IPy_Object = null;
    globals: Py_Dict;
    locals: Py_Dict;
    back: IPy_FrameObj;
    
    constructor(caller: IPy_FrameObj, locals: Py_Dict, cb: (rv: IPy_Object, exc: IPy_Object) => void) {
        this._cb = cb;
        this.locals = locals;
        // Copy caller's globals.
        // TODO: Is there ever a case where you DON'T do this?
        this.globals = caller.globals;
        this.back = caller;
    }
    
    public getType(): Py_Type {
        // XXX
        return Py_Type.OTHER;
    }
    
    // XXX
    public hash() {
        return -1;
    }
    
    public exec(t: Thread): void {
        assert(this._rv !== null, "Can't run a trampoline stack frame without a return value.");
        // Pop myself off of the thread.
        t.framePop();
        // Pause the thread.
        t.setStatus(ThreadStatus.ASYNC_WAITING);
        // Provide the return value to the callback.
        this._cb(this._rv, this._exc);
    }
    
    public resume(rv: IPy_Object, exc: IPy_Object): void {
        // Store the return value. Wait for the thread to
        // exec the frame again before providing to callback.
        this._rv = rv;
        this._exc = exc;
    }

    // TODO: Exception handling for trampolie frames
    tryCatchException(t: Thread, exc: IPy_Object): boolean {
        return false;
    }
}

/**
 * Represents a synchronous "native" function (written in JavaScript).
 */
export class Py_SyncNativeFuncObject implements IPy_Function {
    private _f: (t: Thread, f: IPy_FrameObj, args: IPy_Object[], kwargs: Py_Dict) => IPy_Object;

    constructor(f: (t: Thread, f: IPy_FrameObj, args: IPy_Object[], kwargs: Py_Dict) => IPy_Object) {
      this._f = f;
      
    }
    
    public getType(): Py_Type {
        // XXX
        return Py_Type.OTHER;
    }
    
    // XXX
    public hash() {
        return -1;
    }
  
    public exec(t: Thread, f: IPy_FrameObj, args: IPy_Object[], kwargs: Py_Dict) {
        // Need to have a frame on there for asyncReturn to work.
        t.framePush(new Py_TrampolineFrameObject(f, kwargs, () => {}));
        var rv = this._f(t, f, args, kwargs);
        // XXX: Ensure the function returns an object!
        t.asyncReturn(rv !== undefined ? rv : None);
    }

    public exec_from_native(t: Thread, f: IPy_FrameObj, args: IPy_Object[], kwargs: Py_Dict, cb: (rv?: IPy_Object, exc?: IPy_Object) => void) {
        // Bypass the thread entirely.
        cb(this._f(t, f, args, kwargs));
    }
}

/**
 * Represents an asynchronous "native" function (written in JavaScript).
 */
export class Py_AsyncNativeFuncObject implements IPy_Function {
    private _f: (t: Thread, f: IPy_FrameObj, args: IPy_Object[], kwargs: Py_Dict, cb: (rv: IPy_Object, exc?: IPy_Object) => void) => void;

    constructor(f: (t: Thread, f: IPy_FrameObj, args: IPy_Object[], kwargs: Py_Dict, cb: (rv: IPy_Object, exc?: IPy_Object) => void) => void) {
        this._f = f;
    }
    
    public getType(): Py_Type {
        // XXX
        return Py_Type.OTHER;
    }
    
    // XXX
    public hash() {
        return -1;
    }

    public exec(t: Thread, f: IPy_FrameObj, args: IPy_Object[], kwargs: Py_Dict) {
        var myFrame = new Py_TrampolineFrameObject(f, kwargs, () => {});
        t.framePush(myFrame);
        var hasReturned: boolean = false;
        this._f(t, f, args, kwargs, (rv: IPy_Object) => {
            hasReturned = true;
            t.asyncReturn(rv);
        });
        // Ensure the function didn't complete synchronously or simply chain calls to
        // other functions.
        if (!hasReturned && t.getTopOfStack() === myFrame) {
            t.setStatus(ThreadStatus.ASYNC_WAITING);
        }
    }

    public exec_from_native(t: Thread, f: IPy_FrameObj, args: IPy_Object[], kwargs: Py_Dict, cb: (rv?: IPy_Object, exc?: IPy_Object) => void) {
        // Bypass thread.
        this._f(t, f, args, kwargs, cb);
    }
}
