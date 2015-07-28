import {IPy_Object, IPy_FrameObj} from './interfaces';
import {Py_Str, Py_Object, None} from './primitives';
import {Py_Dict, Py_List} from './collections';
import {Py_Type} from './enums';
import {Py_AsyncNativeFuncObject} from './nativefuncobject';
import fs = require('fs');
import {Thread} from './threading';

/**
 * Implements the builtin sys module.
 */
class Py_Sys extends Py_Object implements IPy_Object {
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
    $executable = None;
    // Optional function, called when the program exits.
    $exitfunc = None;
    $argv: Py_List;
    
    constructor(libPath: string, argv: string[]) {
        super();
        this.$argv = new Py_List(argv.map((str: string) => new Py_Str(str)));
        this.$path = new Py_List([new Py_Str(''), new Py_Str(libPath)]);
        // XXX
        (<any> this.$modules.get(new Py_Str('__future__')))['$division'] = new Py_Object();
        (<any> this.$modules.get(new Py_Str('os')))['$_exit'] = new Py_AsyncNativeFuncObject(function(t: Thread, f: IPy_FrameObj, args: IPy_Object[], kwargs: Py_Dict, cb: (rv: IPy_Object) => void) {
            t.exit();
        });
    }
    
    public getType() {
        return Py_Type.OTHER;
    }
}
export = Py_Sys;
