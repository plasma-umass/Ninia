// Python Generator object
import {IPy_Object, IPy_Function, IPy_FrameObj, Iterator, Iterable
       } from './interfaces';
import {None, Py_Str} from './primitives';
import {Py_Dict} from './collections';
import {Thread} from './threading';
import Py_FrameObject = require('./frameobject');
import Py_FuncObject = require('./funcobject');
import {Py_SyncNativeFuncObject, Py_AsyncNativeFuncObject} from './nativefuncobject';

class Py_GeneratorObject extends Py_FuncObject implements Iterator, Iterable {
    thread: Thread;
    frame: Py_FrameObject;

    exec(t: Thread, caller: IPy_FrameObj, args: IPy_Object[], locals: Py_Dict) {
        this.thread = t;
        this.frame = this.makeFrame(caller, args, locals);
        // Mark as the generator frame
        this.frame.genFrame = true;
    }
    
    public iter(): Iterator {
        return this;
    }

    // TODO: Fix next() for generator objects (currently if $__next__ is present on an iterator, it is called instead)
    public next(): IPy_Object {
        this.thread.framePush(this.frame);
        return None;
    }

    public $__next__ = new Py_AsyncNativeFuncObject((t: Thread, f: IPy_FrameObj, args: IPy_Object[], kwargs: Py_Dict, cb: (rv: IPy_Object) => void) => {
        // Callback is saved and invoked when generator frame encounters YIELD_VALUE
        this.frame.cb = cb;
        this.thread.framePush(this.frame);
    });

    public $next = this.$__next__;

    public toString(): string {
        return `<generator object ${this.name} at ${this.hash()}>`;
    }
}
export = Py_GeneratorObject;
