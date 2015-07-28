// Python Generator object
import {IPy_Object, IPy_Function, IPy_FrameObj, Iterator, Iterable
       } from './interfaces';
import {None, Py_Str} from './primitives';
import {Py_Dict} from './collections';
import {Thread} from './threading';
import Py_FrameObject = require('./frameobject');
import Py_FuncObject = require('./funcobject');

class Py_GeneratorObject extends Py_FuncObject implements Iterator, Iterable {
    thread: Thread;
    frame: Py_FrameObject;
    xxx: number = 2;

    exec(t: Thread, caller: IPy_FrameObj, args: IPy_Object[], locals: Py_Dict) {
        this.thread = t;
        this.frame = this.makeFrame(caller, args, locals);
    }
    public iter(): Iterator {
        return this;
    }
    public next(): IPy_Object {
        // TODO: run this.frame until a YIELD_VALUE is hit, then return that value
        // this.thread.framePush(this.frame);
        if (this.xxx > 0) {
          this.xxx--;
          return Py_Str.fromJS('TODO:gen-next');
        }
        // TODO: if we're exhausted, raise StopIteration
        // XXX: there's no way to raise exceptions from native code, yet!
        //   instead, we'll just replicate a BREAK_LOOP instruction.
        var prevFrame: Py_FrameObject = <Py_FrameObject> this.frame.back;
        var b = prevFrame.blockStack.pop();
        prevFrame.lastInst = b[2];
        prevFrame.stack.splice(b[0], prevFrame.stack.length - b[0]);
        prevFrame.returnToThread = true;
        return None;
    }
    public toString(): string {
        return `<generator object ${this.name} at ${this.hash()}>`;
    }
}
export = Py_GeneratorObject;
