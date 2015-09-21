import {IPy_Object, IPy_FrameObj, IPy_Function} from './interfaces';
import {True, False, Py_Int, Py_Str, Py_Object, None} from './primitives';
import {Py_Dict, Py_List, Py_Tuple} from './collections';
import {Py_Type, ThreadStatus} from './enums';
import {Py_SyncNativeFuncObject, Py_AsyncNativeFuncObject} from './nativefuncobject';
import {Thread, ThreadPool} from './threading';
import builtins = require('./builtins');
import os = require('os');

/**
 * Implements the python Traceback module.
 * Specifcations: https://docs.python.org/2/library/traceback.html
 */
export class Py_Traceback extends Py_Object {
    public trace: string[] = [];
    public exc_type: string = "";
    public exc_value: string = "";

    public verify_args(args: IPy_Object[], min: number, max: number) {
        if (args.length > max || args.length < min) {
            throw new Error("INVALID ARGS");
        }
    }

    // Takes traceback object and returns a properly formatted string containing the traceback information
    public get_tb_str(tb: Py_Traceback, args: IPy_Object[], tb_id: number, limit_id: number): string {
        if (!tb) {
            tb = <Py_Traceback> args[tb_id];
        }
        var limit: number = args.length >= (limit_id + 1) ? parseInt(args[limit_id].toString()) : (tb.trace.length - 1)/4;
        var x: string = "";
        for (var i = tb.trace.length - 1; i >= 0; i-=4) {
            if (limit-- <= 0) {
                break;
            }
            x += `  File "${tb.trace[i]}", line ${tb.trace[i-1]}, in ${tb.trace[i-2]}\n    ${tb.trace[i-3]}\n`;
        }
        return x;
    }

    /* ARGS: (traceback[, limit[, file]])   
     */    
    $print_tb = new Py_SyncNativeFuncObject((t: Thread, f: IPy_FrameObj, args: IPy_Object[], kwargs: Py_Dict) => {
        this.verify_args(args, 1, 3);
        process.stdout.write(this.get_tb_str(null, args, 0, 1));
        return None;
    });

    /* ARGS: (type, value, traceback[, limit[, file]])
     * TODO: Add support for indicating approx. error position inside value if type is SyntaxError  
     */
    $print_exception = new Py_SyncNativeFuncObject((t: Thread, f: IPy_FrameObj, args: IPy_Object[], kwargs: Py_Dict) => {
        this.verify_args(args, 3, 5);
        var type: string = args[0].toString();
        var val: string = args[1].toString();
        process.stdout.write(`Traceback (most recent call last):\n${this.get_tb_str(null, args, 2, 3)}${type}: ${val}\n`);
        return None;
    });

    /* ARGS: ([limit[, file]]) 
     */    
    $print_exc = new Py_SyncNativeFuncObject((t: Thread, f: IPy_FrameObj, args: IPy_Object[], kwargs: Py_Dict) => {
        this.verify_args(args, 0, 2);
        process.stdout.write(`Traceback (most recent call last):\n${this.get_tb_str(t.tb, args, null, 0)}${t.tb.exc_type}: ${t.tb.exc_value}\n`);
        return None;
    });

    /* Same as print_exc but returns a string instead of printing
     * ARGS: ([limit]) 
     */
    $format_exc = new Py_SyncNativeFuncObject((t: Thread, f: IPy_FrameObj, args: IPy_Object[], kwargs: Py_Dict) => {
        this.verify_args(args, 0, 1);
        return new Py_Str(`Traceback (most recent call last):\n${this.get_tb_str(t.tb, args, null, 0)}${t.tb.exc_type}: ${t.tb.exc_value}\n`);
    });

    /* NYI
     * ARGS: ([limit[, file]]) 
     * Works only after an exception has reached an interactive prompt
     * https://docs.python.org/2/library/sys.html#sys.last_type
     */
    $print_last = new Py_SyncNativeFuncObject((t: Thread, f: IPy_FrameObj, args: IPy_Object[], kwargs: Py_Dict) => {
        this.verify_args(args, 0, 2);
        throw new Error("Available only in interactive prompts!");
        return None;
    });

    /* ARGS: ([f[, limit[, file]]])
     * This function prints a stack trace from its invocation point. The optional f argument can be used to specify an alternate stack frame to start.
     * TODO: Provide support for alternate stack frame start
     */    
    $print_stack = new Py_SyncNativeFuncObject((t: Thread, f: IPy_FrameObj, args: IPy_Object[], kwargs: Py_Dict) => {
        this.verify_args(args, 0, 3);
        this.get_stack_list(t, args, 1, 1);
        return None;
    });

    /* ARGS: (traceback[, limit])
     */
    $extract_tb = new Py_SyncNativeFuncObject((t: Thread, f: IPy_FrameObj, args: IPy_Object[], kwargs: Py_Dict) => {
        this.verify_args(args, 1, 2);
        return new Py_List(this.get_tb_arr(args, 0, 1, false, true));
    });

    /* ARGS: ([f[, limit[, file]]])
     * TODO: Provide support for alternate stack frame start
     */
    $extract_stack = new Py_SyncNativeFuncObject((t: Thread, f: IPy_FrameObj, args: IPy_Object[], kwargs: Py_Dict) => {
        this.verify_args(args, 0, 3);
        return this.get_stack_list(t, args, 1, 2);
    });

    /* ARGS: (list)
     */
    $format_list = new Py_SyncNativeFuncObject((t: Thread, f: IPy_FrameObj, args: IPy_Object[], kwargs: Py_Dict) => {
        this.verify_args(args, 1, 1);
        var f_list = (<Py_List>args[0]).toArray();

        var tb_list: IPy_Object[] = [];
        for (var i = 0; i < f_list.length; i++) {
            var arr = f_list[i].toArray();
            tb_list.push(new Py_Str(`  File "${arr[0]}", line ${arr[1]}, in ${arr[2]}\\n    ${arr[3]}\\n`));
        }
        return new Py_List(tb_list);
    });    

    /* ARGS: (type, value)
     */
    $format_exception_only = new Py_SyncNativeFuncObject((t: Thread, f: IPy_FrameObj, args: IPy_Object[], kwargs: Py_Dict) => {
        this.verify_args(args, 2, 2);
        return new Py_List([new Py_Str(`${args[0]}: ${args[1]}\\n`)]);
    });
    
    // Return an array of either Py_Tuples or Py_Strs
    public get_tb_arr(args: IPy_Object[], tb_id: number, limit_id: number, trace: boolean, tuple: boolean): IPy_Object[] {
        var x: IPy_Object[] = [];
        var tb: Py_Traceback = <Py_Traceback> args[tb_id];
        var limit: number = args.length >= (limit_id + 1) ? parseInt(args[limit_id].toString()) : (tb.trace.length - 1)/4;
        if (trace){
            x.push(new Py_Str(`Traceback (most recent call last):\\n`));
        }
        for (var i = tb.trace.length - 1; i >= 0; i-=4) {
            if (limit-- <= 0) {
                break;
            }
            if (tuple) {
                x.push(new Py_Tuple([new Py_Str(tb.trace[i]), new Py_Int(parseInt(tb.trace[i-1])), new Py_Str(tb.trace[i-2]), new Py_Str(tb.trace[i-3])]));
            }
            else {
                x.push(new Py_Str(`  File "${tb.trace[i]}", line ${tb.trace[i - 1]}, in ${tb.trace[i - 2]}\\n    ${tb.trace[i - 3]}\\n`));
            }
        }
        return x;
    }

    // Operate on stack traces that are generated by getStackTrace
    public get_stack_list(t: Thread, args: IPy_Object[], limit_id: number, type_op: number): Py_List {
        var stack_trace: [string, string, string, string][] = t.getStackTrace();
        var limit: number = args.length >= (limit_id + 1) ? parseInt(args[limit_id].toString()) : stack_trace.length;
        var tb_list: IPy_Object[] = [];
        var x: string = "";
        for (var i = stack_trace.length - 1; i >= 0; i--) {
            if (limit-- <= 0) {
                break;
            }
            if (type_op == 1) {
                x += `  File "${stack_trace[i][3]}", line ${stack_trace[i][2]}, in ${stack_trace[i][1]}\n    ${stack_trace[i][0]}\n`;
            }
            else if (type_op == 2) {
                tb_list.push(new Py_Tuple([new Py_Str(stack_trace[i][3]), new Py_Int(parseInt(stack_trace[i][2])), new Py_Str(stack_trace[i][1]), new Py_Str(stack_trace[i][0])]));
            }
            else if (type_op == 3) {
                tb_list.push(new Py_Str(`  File "${stack_trace[i][3]}", line ${stack_trace[i][2]}, in ${stack_trace[i][1]}\\n    ${stack_trace[i][0]}\\n`));

            }
        }
        if (type_op == 1) {
            process.stdout.write(x);
        }
        return new Py_List(tb_list);
    }

    /* TODO: Fix double quotes vs single quotes issue :/
     * ARGS: (type, value, tb[, limit])
     */
    $format_exception = new Py_SyncNativeFuncObject((t: Thread, f: IPy_FrameObj, args: IPy_Object[], kwargs: Py_Dict) => {
        this.verify_args(args, 3, 4);
        var x: IPy_Object[] = this.get_tb_arr(args, 2, 3, true, false);
        x.push(new Py_Str(`${args[0].toString()}: ${args[1].toString()}\\n`));
        return new Py_List(x);
    });

    /* ARGS: (tb[, limit])
     */
    $format_tb = new Py_SyncNativeFuncObject((t: Thread, f: IPy_FrameObj, args: IPy_Object[], kwargs: Py_Dict) => {
        this.verify_args(args, 1, 2);
        return new Py_List(this.get_tb_arr(args, 0, 1, false, false));
    });

    /* ARGS: ([f[, limit]])
     */
    $format_stack = new Py_SyncNativeFuncObject((t: Thread, f: IPy_FrameObj, args: IPy_Object[], kwargs: Py_Dict) => {
        this.verify_args(args, 0, 2);
        return this.get_stack_list(t, args, 1, 3);
    });    
    
    public getType() {
        return Py_Type.OTHER;
    }
}