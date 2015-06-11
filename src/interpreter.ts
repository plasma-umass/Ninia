import Py_FrameObject = require('./frameobject');
import Py_CodeObject = require('./codeobject');
import Thread = require('./threading');
// The Interpreter uses a simple Fetch-Decode-Execute loop to execute Python
// code. Each program is first unmarshalled into a Py_CodeObject. The
// interpreter then wraps the code object inside a frame object, which tracks
// the execution state of the code (e.g. stack, instruction pointer, etc.). The
// interpreter can be configured to output to any device as long as it has a
// "write" method. The interpreter does not maintain its own stack.
class Interpreter {
    // More formally, this should be some kind of "IOWriter" interface that
    // defines a write method. For this last-minute addition, it'll just have to
    // be 'any'.
    outputDevice: any;

    constructor(out: any) {
        if (typeof out.write == 'undefined')
            throw new Error("Output device must have a 'write' method");
        this.outputDevice = out;
    }

    // Interpret wraps a code object in a frame and executes it.
    // This is the "base frame" and has no pointer to a previous frame.
    interpret(code: Py_CodeObject, debug: boolean) {
        var f = new Py_FrameObject(null, code, {}, -1,
                                   code.firstlineno, {}, false,
                                   this.outputDevice, [], debug)

        // Create new Thread, push the Py_FrameObject on it and then run it
        var t: Thread = new Thread();
        t.framePush(f);
        t.run();        
        return;
    }
}
export = Interpreter;
