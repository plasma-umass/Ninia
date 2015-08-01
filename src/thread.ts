import {IPy_Object, IPy_FrameObj, IPy_Function} from './interfaces';
import {True, False, Py_Int, Py_Str, Py_Object, None} from './primitives';
import {Py_Dict, Py_List} from './collections';
import {Py_Type, ThreadStatus} from './enums';
import {Py_AsyncNativeFuncObject} from './nativefuncobject';
import {Thread, ThreadPool} from './threading';

/**
 * Implements the python Thread module.
 */
export class Py_Thread extends Py_Object {
    // Start a new thread (All threads stop executing when main thread exits)
    $start_new_thread = new Py_AsyncNativeFuncObject((t: Thread, f: IPy_FrameObj, args: IPy_Object[], kwargs: Py_Dict, cb: (rv: IPy_Object) => void) => {
        var tpool: ThreadPool = t.getThreadPool();
        var tx: Thread = tpool.newThread();
        // Call the function which is the first arg, and pass it the new thread object 
        (<IPy_Function> args[0]).exec(tx, f, [args[1]], kwargs);
        // Change new thread to be runnable
        tx.rawSetStatus(ThreadStatus.RUNNABLE);
        // Callback pushes the thread unique identifier on the calling frames stack
        cb(new Py_Int(tx.id));
    });

    // Return thread.id
    $get_ident = new Py_AsyncNativeFuncObject((t: Thread, f: IPy_FrameObj, args: IPy_Object[], kwargs: Py_Dict, cb: (rv: IPy_Object) => void) => {
        cb(new Py_Int(t.id));
    });
    
    // Return new Py_Lock object
    $allocate_lock = new Py_AsyncNativeFuncObject((t: Thread, f: IPy_FrameObj, args: IPy_Object[], kwargs: Py_Dict, cb: (rv: IPy_Object) => void) => {
        // console.log("Allocated");
        cb(new Py_Lock());
    });

    $interrupt_main = new Py_AsyncNativeFuncObject((t: Thread, f: IPy_FrameObj, args: IPy_Object[], kwargs: Py_Dict, cb: (rv: IPy_Object) => void) => {
        //TODO: Raise KeyboardInterrupt (interrupts main thread if thrown from any other thread)
    });

    $exit = new Py_AsyncNativeFuncObject((t: Thread, f: IPy_FrameObj, args: IPy_Object[], kwargs: Py_Dict, cb: (rv: IPy_Object) => void) => {
        t.exit();
    });

    public getType() {
        return Py_Type.OTHER;
    }
}

export class Py_Lock extends Py_Object {
    // Thread currently holding the lock
    public holder: Thread = null;
    // List of threads and their callbacks that are waiting to acquire this lock
    public waiting_threads: [Thread, (rv: IPy_Object) => void][] = [];

    // Remove thread from waiting list and let it acquire this lock
    // TODO: Some criteria to choose which thread to wake up ? (currently FIFO)
    release_lock_waiter() {
        if (this.waiting_threads.length > 0) {
            var waiter: [Thread, (rv: IPy_Object) => void] = this.waiting_threads[0];
            this.waiting_threads.splice(0, 1);
            var t: Thread = waiter[0], cb: (rv: IPy_Object) => void = waiter[1];
            // Thread has acquired lock
            cb(True);
        }
    }

    // Tries to acquire the thread
    // If wait_flag is zero, then it tries to immediately acquire the lock and upon failure returns false
    // If wait_flag is non-zero or not present, will block thread waiting to acquire lock. Upon acquiring lock, returns true.
    $acquire = new Py_AsyncNativeFuncObject((t: Thread, f: IPy_FrameObj, args: IPy_Object[], kwargs: Py_Dict, cb: (rv: IPy_Object) => void) => {
        var wait_flag: IPy_Object = args.length > 0 ? args[0] : new Py_Str('1');
        // Return false if wait_flag === 0 and lock cannot be acquired immediately
        if(wait_flag.toString() === '0' && this.holder !== null){
            cb(False);
            return;
        }
        if(this.holder === null) {
            this.holder = t;
            cb(True);
        }
        else {
            // add thread to wait list
            this.waiting_threads.push([t, cb]);
        }
    });

    // Lock is released by thread and a thread is selected if it is waiting to acquire this lock
    // TODO: Throw Thread.error if trying to release un-acquired lock
    $release = new Py_AsyncNativeFuncObject((t: Thread, f: IPy_FrameObj, args: IPy_Object[], kwargs: Py_Dict, cb: (rv: IPy_Object) => void) => {
        this.holder = null;
        this.release_lock_waiter();
        cb(None);
    });

    // return True if lock is acquired, false otherwise
    $locked = new Py_AsyncNativeFuncObject((t: Thread, f: IPy_FrameObj, args: IPy_Object[], kwargs: Py_Dict, cb: (rv: IPy_Object) => void) => {
        cb(this.holder !== null ? True : False);
    });

    public getType() {
        return Py_Type.OTHER;
    }
}