import {IPy_Object} from './interfaces';
import {Py_Str} from './primitives';
import {Py_Type} from './enums';
// Py_CodeObject models the Python Code Object, which is used to represent
// functions, blocks, modules, etc. -- anything that can be executed.
// The various fields are derived from inspecting code objects (see the Inspect
// module in the std lib).
class Py_CodeObject implements IPy_Object {
    // Args are ordered by appearance in marshal format
    constructor(public argcount: number,
                public nlocals: number,
                public stacksize: number,
                public flags: number,
                public code: Buffer,
                public consts: IPy_Object[],
                public names: Py_Str[],
                public varnames: Py_Str[],
                public freevars: Py_Str[],
                public cellvars: Py_Str[],
                public filename: Py_Str,
                public name: Py_Str,
                public firstlineno: number,
                public lnotab: Py_Str) {}
    getType(): Py_Type { return Py_Type.OTHER; }
    hash(): number { return -1; }
    isGenerator(): boolean {
        return !!(this.flags & 0x20);
    }
}
export = Py_CodeObject;
