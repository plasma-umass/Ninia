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
import pytypes = require('./pytypes');
import Py_Str = pytypes.Py_Str;

// Similar to frame objects, Function Objects wrap Python functions. However,
// these are more the data representation of functions, and are transformed into
// Frame Objects when the function is called.
class Py_FuncObject implements IPy_Object {
    code: Py_CodeObject;
    globals: { [name: string]: IPy_Object };
    defaults: { [name: string]: IPy_Object };
    //closure: ???
    name: Py_Str;

    constructor(code: Py_CodeObject,
                globals: { [name: string]: IPy_Object },
                defaults: { [name: string]: IPy_Object },
                name: Py_Str) {
        this.code = code;
        this.globals = globals;
        this.defaults = defaults;
        this.name = name
    }
    getType(): enums.Py_Type { return enums.Py_Type.OTHER; }
    // XXX: Fix.
    hash(): number { return -1; }
}
export = Py_FuncObject;
