// Python Generator object
import interfaces = require('./interfaces');
import IPy_Object = interfaces.IPy_Object;
import primitives = require('./primitives');
import Py_Str = primitives.Py_Str;
import collections = require('./collections');
import IPy_Function = interfaces.IPy_Function;
import Thread = require('./threading');
import Py_Dict = collections.Py_Dict;
import Py_FrameObject = require('./frameobject');
import Py_FuncObject = require('./funcobject');

class Py_GeneratorObject extends Py_FuncObject implements interfaces.Iterator, interfaces.Iterable {
    thread: Thread;
    frame: Py_FrameObject;
    xxx: number = 2;

    exec(t: Thread, caller: interfaces.IPy_FrameObj, args: IPy_Object[], locals: Py_Dict) {
        this.thread = t;
        this.frame = this.makeFrame(caller, args, locals);
    }
    public iter(): interfaces.Iterator {
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
        return primitives.None;
    }
    public toString(): string {
        return `<generator object ${this.name} at ${this.hash()}>`;
    }
}
export = Py_GeneratorObject;
