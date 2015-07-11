import Py_FrameObject = require('./frameobject');
import Py_CodeObject = require('./codeobject');
import collections = require('./collections');
import enums = require('./enums');
import Thread = require('./threading');
import primitives = require('./primitives');
import Py_Sys = require('./sys');
import fs = require('fs');

// The Interpreter uses a simple Fetch-Decode-Execute loop to execute Python
// code. Each program is first unmarshalled into a Py_CodeObject. The
// interpreter then wraps the code object inside a frame object, which tracks
// the execution state of the code (e.g. stack, instruction pointer, etc.). The
// interpreter can be configured to output to any device as long as it has a
// "write" method. The interpreter does not maintain its own stack.
class Interpreter {
    sys: Py_Sys;
    constructor() {
        // XXX: Hack around circular reference issue.
        primitives.circularRefHack();
        this.sys = new Py_Sys('Lib', []);
    }
    
    // Interpret wraps a code object in a frame and executes it.
    // This is the "base frame" and has no pointer to a previous frame.
    interpret(code: Py_CodeObject, debug: boolean, callback: () => void) {
        var scope = new collections.Py_Dict();
        var f = new Py_FrameObject(null, code, scope, scope, []);
        f.globals.getStringDict()[`$__file__`] = code.filename;
        // Create new Thread, push the Py_FrameObject on it and then run it
        var t: Thread = new Thread(this.sys, callback);
        t.framePush(f);
        // Read .py file corresponding to .pyc file and save it in t.codefile
        fs.readFile(f.codeObj.filename.toString(), function (err, data) {
            var codefile = data.toString('utf8').split('\n');
            t.codefile = codefile;                  
            // Change Thread status to RUNNABLE
            t.setStatus(enums.ThreadStatus.RUNNABLE);
        });
    }
}
export = Interpreter;
