// Python Function object
// Code: Code object, from stack
// Globals: Frame's globals, from where MAKE_FUNCTION is called
// Defaults: The default arguments and their values, a tuple on stack
// Closure: Tuple of cell objects? (Locals for closure?)
// doc: __doc__, can be anything
// name: Name of the function
// dict: __dict__, can be NULL

import Py_CodeObject = require('./codeobject');
import interfaces = require('./interfaces');
import IPy_Object = interfaces.IPy_Object;
import enums = require('./enums');
import primitives = require('./primitives');
import Py_Str = primitives.Py_Str;
import collections = require('./collections');
import Py_Tuple = collections.Py_Tuple;
import IPy_Function = interfaces.IPy_Function;
import Thread = require('./threading');
import Py_Dict = collections.Py_Dict;
import Py_FrameObject = require('./frameobject');
import nativefuncobject = require('./nativefuncobject');

// Similar to frame objects, Function Objects wrap Python functions. However,
// these are more the data representation of functions, and are transformed into
// Frame Objects when the function is called.
class Py_FuncObject extends primitives.Py_Object implements IPy_Function {
    code: Py_CodeObject;
    globals: Py_Dict;
    defaults: Py_Dict;
    closure: Py_Tuple;
    name: Py_Str;

    constructor(code: Py_CodeObject,
                globals: Py_Dict,
                defaults: Py_Dict,
                name: Py_Str,
                closure: Py_Tuple = null) {
        super();
        this.code = code;
        this.globals = globals;
        this.defaults = defaults;
        this.name = name;
        this.closure = closure;
    }
    getType(): enums.Py_Type { return enums.Py_Type.OTHER; }
    // XXX: Fix.
    hash(): number { return -1; }
    
    /**
     * Folds arguments to the function into a locals dictionary.
     */
    private args2locals(args: IPy_Object[], locals: Py_Dict) {
        var varnames = this.code.varnames;
        for (var i = 0; i < varnames.length; i++) {
            var name = varnames[i];
            if (locals.get(name) === undefined) {
                if (args.length > 0) {
                    locals.set(name, args.shift());
                } else {
                    locals.set(name, this.defaults.get(name));
                }
            }
        }
    }

    makeFrame(caller: interfaces.IPy_FrameObj, args: IPy_Object[], locals: Py_Dict): Py_FrameObject {
        this.args2locals(args, locals);
        return new Py_FrameObject(caller, this.code, (caller.back ? caller.globals : caller.locals), locals, (this.closure ? this.closure.toArray() : []));
    }
    
    exec(t: Thread, caller: interfaces.IPy_FrameObj, args: IPy_Object[], locals: Py_Dict) {
        t.framePush(this.makeFrame(caller, args, locals));
    }

    exec_from_native(t: Thread, caller: interfaces.IPy_FrameObj, args: IPy_Object[], locals: Py_Dict, cb: (rv?: IPy_Object) => void) {
        var frame = this.makeFrame(caller, args, locals);
        t.framePush(new nativefuncobject.Py_TrampolineFrameObject(caller, locals, cb))
        t.framePush(frame);
    }
}
export = Py_FuncObject;
