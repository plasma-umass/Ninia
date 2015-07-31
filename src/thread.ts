import {IPy_Object, IPy_FrameObj, IPy_Function} from './interfaces';
import {Py_Int, Py_Object, None} from './primitives';
import {Py_Dict, Py_List} from './collections';
import {Py_Type, ThreadStatus} from './enums';
import {Py_AsyncNativeFuncObject} from './nativefuncobject';
import fs = require('fs');
import {Thread, ThreadPool} from './threading';

/**
 * Implements the python Thread module.
 */
class Py_Thread extends Py_Object implements IPy_Object {
    // Start a new thread (All threads stop executing when main thread exits)
    $start_new_thread = new Py_AsyncNativeFuncObject(function(t: Thread, f: IPy_FrameObj, args: IPy_Object[], kwargs: Py_Dict, cb: (rv: IPy_Object) => void) {
        var tpool: ThreadPool = t.getThreadPool();
        var tx: Thread = tpool.newThread();
        // Call the function which is the first arg, and pass it the new thread object 
        (<IPy_Function> args[0]).exec(tx, f, [args[1]], kwargs);
        // Change new thread to be runnable
        tx.rawSetStatus(ThreadStatus.RUNNABLE);
        // Callback pushes the thread unique identifier on the calling frames stack
        cb(new Py_Int(tx.id));
    });
    
    public getType() {
        return Py_Type.OTHER;
    }
}
export = Py_Thread;
