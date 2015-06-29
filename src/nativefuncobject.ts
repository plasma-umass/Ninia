import interfaces = require('./interfaces');
import Thread = require('./threading');
import IPy_Object = interfaces.IPy_Object;
import collections = require('./collections');
import Py_Dict = collections.Py_Dict;
import enums = require('./enums');
import assert = require('./assert');
import primitives = require('./primitives');

/**
 * A Trampoline frame object.
 * "Bounces" the return value through a provided callback.
 */
export class Py_TrampolineFrameObject implements interfaces.IPy_FrameObj {
    private _cb: (rv: IPy_Object) => void;
    private _rv: IPy_Object = null;
    globals: Py_Dict;
    locals: Py_Dict;
    back: interfaces.IPy_FrameObj;
    
    constructor(caller: interfaces.IPy_FrameObj, locals: Py_Dict, cb: (rv: IPy_Object) => void) {
        this._cb = cb;
        this.locals = locals;
        // Copy caller's globals.
        // TODO: Is there ever a case where you DON'T do this?
        this.globals = caller.globals;
        this.back = caller;
    }
    
    public getType(): enums.Py_Type {
        // XXX
        return enums.Py_Type.OTHER;
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
        t.setStatus(enums.ThreadStatus.ASYNC_WAITING);
        // Provide the return value to the callback.
        this._cb(this._rv);
    }
    
    public resume(rv: IPy_Object): void {
        // Store the return value. Wait for the thread to
        // exec the frame again before providing to callback.
        this._rv = rv;
    }
}

/**
 * Represents a synchronous "native" function (written in JavaScript).
 */
export class Py_SyncNativeFuncObject implements interfaces.IPy_Function {
    private _f: (t: Thread, f: interfaces.IPy_FrameObj, args: IPy_Object[], kwargs: Py_Dict) => IPy_Object;

    constructor(f: (t: Thread, f: interfaces.IPy_FrameObj, args: IPy_Object[], kwargs: Py_Dict) => IPy_Object) {
      this._f = f;
      
    }
    
    public getType(): enums.Py_Type {
        // XXX
        return enums.Py_Type.OTHER;
    }
    
    // XXX
    public hash() {
        return -1;
    }
  
    public exec(t: Thread, f: interfaces.IPy_FrameObj, args: IPy_Object[], kwargs: Py_Dict) {
        // Need to have a frame on there for asyncReturn to work.
        t.framePush(new Py_TrampolineFrameObject(f, kwargs, () => {}));
        var rv = this._f(t, f, args, kwargs);
        // XXX: Ensure the function returns an object!
        t.asyncReturn(rv !== undefined ? rv : primitives.None);
    }

    public exec_from_native(t: Thread, f: interfaces.IPy_FrameObj, args: IPy_Object[], kwargs: Py_Dict, cb: (rv?: IPy_Object) => void) {
        // Bypass the thread entirely.
        cb(this._f(t, f, args, kwargs));
    }
}

/**
 * Represents an asynchronous "native" function (written in JavaScript).
 */
export class Py_AsyncNativeFuncObject implements interfaces.IPy_Function {
    private _f: (t: Thread, f: interfaces.IPy_FrameObj, args: IPy_Object[], kwargs: Py_Dict, cb: (rv: IPy_Object) => void) => void;

    constructor(f: (t: Thread, f: interfaces.IPy_FrameObj, args: IPy_Object[], kwargs: Py_Dict, cb: (rv: IPy_Object) => void) => void) {
        this._f = f;
    }
    
    public getType(): enums.Py_Type {
        // XXX
        return enums.Py_Type.OTHER;
    }
    
    // XXX
    public hash() {
        return -1;
    }

    public exec(t: Thread, f: interfaces.IPy_FrameObj, args: IPy_Object[], kwargs: Py_Dict) {
        t.framePush(new Py_TrampolineFrameObject(f, kwargs, () => {}));
        this._f(t, f, args, kwargs, (rv: IPy_Object) => {
            t.asyncReturn(rv);
        });
    }

    public exec_from_native(t: Thread, f: interfaces.IPy_FrameObj, args: IPy_Object[], kwargs: Py_Dict, cb: (rv?: IPy_Object) => void) {
        // Bypass thread.
        this._f(t, f, args, kwargs, cb);
    }
}