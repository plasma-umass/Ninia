import interfaces = require('./interfaces');
import pytypes = require('./pytypes');
import Py_Str = pytypes.Py_Str;
import enums = require('./enums');
// Py_CodeObject models the Python Code Object, which is used to represent
// functions, blocks, modules, etc. -- anything that can be executed.
// The various fields are derived from inspecting code objects (see the Inspect
// module in the std lib).
class Py_CodeObject implements interfaces.IPy_Object {
    // Args are ordered by appearance in marshal format
    constructor(public argcount: number,
                public nlocals: number,
                public stacksize: number,
                public flags: number,
                public code: Buffer,
                public consts: interfaces.IPy_Object[],
                public names: Py_Str[],
                public varnames: Py_Str[],
                public freevars: Py_Str[],
                public cellvars: Py_Str[],
                public filename: Py_Str,
                public name: Py_Str,
                public firstlineno: number,
                public lnotab: Py_Str) {}
    getType(): enums.Py_Type { return enums.Py_Type.OTHER; }
    hash(): number { return -1; }
}
export = Py_CodeObject;
