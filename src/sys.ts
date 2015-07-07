import interfaces = require('./interfaces');
import primitives = require('./primitives');
import collections = require('./collections');
import enums = require('./enums');
import Py_Dict = collections.Py_Dict;
import Py_List = collections.Py_List;
import Py_Str = primitives.Py_Str;
import IPy_Object = interfaces.IPy_Object;
import fs = require('fs');
import Py_Object = primitives.Py_Object;
import nativefunc = require('./nativefuncobject');
import Thread = require('./threading');

/**
 * Implements the builtin sys module.
 */
class Py_Sys extends primitives.Py_Object implements IPy_Object {
    $__dict__ = new Py_Dict(<any> this);
    $path: Py_List;
    // JS is little endian
    $byteorder = new Py_Str('little');
    $modules = new Py_Dict({
       '$sys': this,
       // XXX: Hack.
       '$__future__': new Py_Object(),
       '$os': new Py_Object()
    });
    $executable = primitives.None;
    // Optional function, called when the program exits.
    $exitfunc = primitives.None;
    $argv: Py_List;
    
    constructor(libPath: string, argv: string[]) {
        super();
        this.$argv = new Py_List(argv.map((str: string) => new Py_Str(str)));
        this.$path = new Py_List([new Py_Str(''), new Py_Str(libPath)]);
        // XXX
        (<any> this.$modules.get(new Py_Str('__future__')))['$division'] = new Py_Object();
        (<any> this.$modules.get(new Py_Str('os')))['$_exit'] = new nativefunc.Py_AsyncNativeFuncObject(function(t: Thread, f: interfaces.IPy_FrameObj, args: interfaces.IPy_Object[], kwargs: collections.Py_Dict, cb: (rv: interfaces.IPy_Object) => void) {
            t.exit();
        });
    }
    
    public getType() {
        return enums.Py_Type.OTHER;
    }
}
export = Py_Sys;
