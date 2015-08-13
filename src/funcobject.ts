// Python Function object
// Code: Code object, from stack
// Globals: Frame's globals, from where MAKE_FUNCTION is called
// Defaults: The default arguments and their values, a tuple on stack
// Closure: Tuple of cell objects? (Locals for closure?)
// doc: __doc__, can be anything
// name: Name of the function
// dict: __dict__, can be NULL

import {Py_Str, Py_Object} from './primitives';
import {Py_Tuple, Py_Dict} from './collections';
import {IPy_Object, IPy_FrameObj, IPy_Function} from './interfaces';
import {Py_Type} from './enums';
import {Py_TrampolineFrameObject} from './nativefuncobject';
import Py_CodeObject = require('./codeobject');
import {Thread} from './threading';
import Py_FrameObject = require('./frameobject');

// Similar to frame objects, Function Objects wrap Python functions. However,
// these are more the data representation of functions, and are transformed into
// Frame Objects when the function is called.
class Py_FuncObject extends Py_Object implements IPy_Function {
    code: Py_CodeObject;
    globals: Py_Dict;
    defaults: Py_Dict;
    closure: Py_Tuple;
    name: Py_Str;
    $func_code: Py_CodeObject;

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
        this.$func_code = code;
    }
    getType(): Py_Type { return Py_Type.OTHER; }
    // XXX: Fix.
    hash(): number { return -1; }

    /**
     * Folds arguments to the function into a locals dictionary.
     */
    private args2locals(args: IPy_Object[], locals: Py_Dict) {
        var varnames = this.code.varnames;
        for (var name of varnames) {
            if (locals.get(name) === undefined) {
                if (args.length > 0) {
                    locals.set(name, args.shift());
                } else {
                    locals.set(name, this.defaults.get(name));
                }
            }
        }
    }

    makeFrame(caller: IPy_FrameObj, args: IPy_Object[], locals: Py_Dict): Py_FrameObject {
        this.args2locals(args, locals);
        return new Py_FrameObject(caller, this.code, (caller.back ? caller.globals : caller.locals), locals, (this.closure ? this.closure.toArray() : []));
    }

    exec(t: Thread, caller: IPy_FrameObj, args: IPy_Object[], locals: Py_Dict) {
        t.framePush(this.makeFrame(caller, args, locals));
    }

    exec_from_native(t: Thread, caller: IPy_FrameObj, args: IPy_Object[], locals: Py_Dict, cb: (rv?: IPy_Object, exc?: IPy_Object) => void) {
        var frame = this.makeFrame(caller, args, locals);
        t.framePush(new Py_TrampolineFrameObject(caller, locals, cb))
        t.framePush(frame);
    }
}
export = Py_FuncObject;
