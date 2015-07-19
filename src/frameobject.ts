import interfaces = require('./interfaces');
import IPy_Object = interfaces.IPy_Object;
import Py_CodeObject = require('./codeobject');
import Py_FuncObject = require('./funcobject');
import opcodes = require('./opcodes');
import optable = require('./optable');
import Py_Cell = require('./cell');
import Thread = require('./threading');
import enums = require('./enums');
import collections = require('./collections');
import Py_Dict = collections.Py_Dict;
import IPy_FrameObj = interfaces.IPy_FrameObj;
import assert = require('assert');
import builtins = require('./builtins');

// Frame Objects are basically stack frames for functions, except they carry
// extra context (e.g. globals, local scope, etc.). This class is not simplified
// in order to keep the fairly neat documentation.
// Frame objects maintain their own stack and scope. This allows for easier
// handling of function calls and other scoping actions.
class Py_FrameObject implements IPy_FrameObj {
    // Previous stack frame (this frame's caller, may be None)
    back: IPy_FrameObj;
    // Code object executed in this frame
    codeObj: Py_CodeObject;
    // traceback for debugging -- TODO: Implement
    // traceback: any;
    // Exception type, if raised in this frame
    // exc_type: any;
    // Exception value, if raised in this frame
    // exc_value
    // List of global values (global namespace!)
    globals: Py_Dict;
    // Last attempted instruction
    lastInst: number = -1;
    // Current line number
    // XXX: Lazily update.
    lineNum: number = -1;
    // Local namespace
    locals: Py_Dict;
    // Flag: 1 if running in restricted mode (TODO: What?)
    restricted: boolean = false;
    // This frame's stack
    stack: IPy_Object[];
    // see https://docs.python.org/2/reference/simple_stmts.html#print
    shouldWriteSpace: boolean;
    // block stack, for loops and such.
    // Entries are [stackSize, startPos, endPos, opcode] tuples.
    // TODO: type this correctly
    blockStack: [number, number, number, number][];
    // Lexical environment
    // cellvars followed by freevars
    env: Py_Cell[];
    // Signifies that the bytecode loop should return to the thread loop.
    returnToThread: boolean;

    constructor(back: IPy_FrameObj,
                code: Py_CodeObject,
                globals: Py_Dict,
                locals: Py_Dict,
                closure: IPy_Object[]) {
        this.back = back;
        this.codeObj = code;
        this.globals = globals;
        this.locals = locals;
        this.stack = [];
        this.shouldWriteSpace = false;
        this.blockStack = [];
        this.env = [];
        var i: number;
        for (i = 0; i < code.cellvars.length; i++) {
            this.env.push(new Py_Cell(null));
        }

        for (i = 0; i < code.freevars.length; i++) {
            this.env.push(<Py_Cell>closure[i]);
        }
        this.lineNum = 0;

    }
    
    getType(): enums.Py_Type {
        // XXX
        return enums.Py_Type.OTHER;
    }
    
    // XXX
    hash() {
        return -1;
    }

    // Stack handling operations.
    push(v: IPy_Object) {
      assert(v !== undefined, "Must be a Py_Object.");
      return this.stack.push(v);
    }

    pop(): IPy_Object {
      return this.stack.pop();
    }

    peek(): IPy_Object {
      return this.stack[this.stack.length-1];
    }

    // The frame's lastInst field keeps track of the last executed instruction.
    readOp(): number {
      this.lastInst += 1;
      return this.codeObj.code[this.lastInst];
    }

    peekOp(): number {
        // this.lastInst += 1;
        return this.codeObj.code[this.lastInst];
    }

    // Arguments are stored as 2 bytes, little-endian.
    readArg(): number {
      this.lastInst += 1;
      var low = this.codeObj.code[this.lastInst];
      this.lastInst += 1;
      var high = this.codeObj.code[this.lastInst];
      return (high << 8) + low;
    }

    // exec is the Fetch-Execute-Decode loop for the interpreter.
    exec(t: Thread): void {
        this.returnToThread = false;
        for (var op = this.readOp(); op != undefined; op = this.readOp()) {
            var func = optable[op];
            if (func == undefined) {
                throw new Error(`Unknown opcode: ${opcodes[op]} (${op})`);
            }
            // console.log(opcodes[op]);
            if (false) {  // debug
                console.log(this.stack);
                console.log(`${t.stackDepth()}: ${opcodes[op]}`);
            }
            func(this, t);
            if (this.returnToThread) {
                // End the bytecode loop; return to thread loop.
                break;
            }
        }
    }

    emptyStack() {
        while (this.stack.length > 0) {
            this.pop();
        }
    }
    raise_exception_here(t: Thread, message: string, type: string): void {
        var val: IPy_Object = (<any> builtins)[type];
        t.exc = val;
        this.push(val);
        t.addToTraceback(message);
        this.tryCatchException(t);
    }

    tryCatchException(t: Thread): boolean {
        // Whenever an exception occurs, tries to find a handler and if it can't outputs the traceback 
        // search in current frame
        if (!find_exception_handler(this)) {
            // Search for exception handler in previous frames
            if (!find_in_prev(this,t))
            {
                // no exception handler found, write traceback and exit the thread
                t.throwException();
                return false;
            }
        }
        // save line number on which exception occurred
        t.raise_lno = (this.codeObj.firstlineno) + addr2line(this);
        return true;
    }
    
    resume(rv: IPy_Object): void {
        assert(rv !== undefined && rv !== null, "Must be a Py_Object.");
        this.push(rv);
    }

    getDeref(i: number) {
        var cell: Py_Cell = this.env[i];
        if (cell.ob_ref === null) {
            var name: IPy_Object;
            var numCellvars = this.codeObj.cellvars.length;
            if (i < numCellvars) {
                name = this.codeObj.cellvars[i];

            } else {
                name = this.codeObj.freevars[i - numCellvars];
            }
            cell.ob_ref = this.locals.get(name);
        }
        return cell;
    }
}

function setup_block(f: Py_FrameObject, op: number) {
    var delta = f.readArg();
    // push a block to the block stack
    var stackSize = f.stack.length;
    var loopPos = f.lastInst;
    f.blockStack.push([stackSize, loopPos, loopPos+delta, op]);
}
// Searches for an exception handler inside the current Py_FrameObject
// Uses that blockstack to move forwards or backwards in code (by changing lastInst)
// Returns true if found, else returns false
function find_exception_handler(f: Py_FrameObject) : boolean {
    while (f.blockStack.length > 0) {
        var b = f.blockStack[f.blockStack.length - 1];
        f.blockStack.pop();
        if (b[3] === opcodes.SETUP_EXCEPT) {
            setup_block(f, opcodes.EXCEPT_HANDLER);
            var endPos: number = b[2];
            f.lastInst = endPos;
            return true;
        }
        if (b[3] === opcodes.SETUP_FINALLY) {
            var endPos: number = b[2];
            f.lastInst = endPos;
            return true;
        }
    }
    return false;
}
// Unpack the lnotab to extract instruction/line numbers
// str contians bytes inside of a string
function unpack(str: string): [number,number][] {
    var ln_byte_tuple: [number,number][] = [];
    for (var i = 0, n = str.length; i < n; i+=2) {
        var num1: number = str.charCodeAt(i);
        var num2: number = str.charCodeAt(i+1);
        ln_byte_tuple.push([num1, num2]);
    }
    return ln_byte_tuple;
}

// Using lnotab, find the linenumber of the current instruction in the .py file
function addr2line(f: Py_FrameObject): number {
    var lineno = 0;
    var addr = 0;
    var chars = f.codeObj.lnotab.toString();
    var lnotab = unpack(chars);
    for (var i = 0; i < lnotab.length; i++) {
        addr += lnotab[i][0];
        if (addr > f.lastInst) {
            break;
        }
        lineno += lnotab[i][1];
    }
    return lineno;
}
// Add traceback
function frame_add_traceback(f: Py_FrameObject, t: Thread) {
    var current_line: number = (f.codeObj.firstlineno) + addr2line(f);
    // Set whenever an exception handler is found
    // If exception handler can't handle that exception, the line where exception occurred is added to traceback
    if (t.raise_lno > 0) {
        current_line = t.raise_lno ;
        t.raise_lno = 0;
    }
    var tback: string = `  File "${f.codeObj.filename.toString()}", line ${current_line}, in ${f.codeObj.name.toString()}\n`;
    if (t.codefile.length > 0) {
        tback += `    ${t.codefile[current_line-1].trim()}\n`;
    }
    t.addToTraceback(tback);
}

// Search for exception handler in previous frames
function find_in_prev(f: Py_FrameObject, t: Thread): boolean {
    frame_add_traceback(f, t);
    f.emptyStack();
    // Search for exception handler in previous frames
    while (f.back != null) {
        var chars = f.codeObj.lnotab.toString();
        // stop frame execution
        f.returnToThread = true;
        f = (<Py_FrameObject>f.back);
        // Add to traceback
        frame_add_traceback(f, t);
        // If an exception handler is found in either this frame or previous frames
        if (find_exception_handler(f)) {
            // f.emptyStack();
            return true;
        }
        // f.emptyStack();
    }
    // return false if no handler found
    return false;
}

export = Py_FrameObject;