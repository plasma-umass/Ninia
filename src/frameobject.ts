import {IPy_Object, IPy_FrameObj} from './interfaces';
import {Py_Type} from './enums';
import {Py_Dict} from './collections';
import Py_CodeObject = require('./codeobject');
import Py_FuncObject = require('./funcobject');
import opcodes = require('./opcodes');
import optable = require('./optable');
import Py_Cell = require('./cell');
import Thread = require('./threading');
import assert = require('assert');

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
    
    getType(): Py_Type {
        // XXX
        return Py_Type.OTHER;
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
export = Py_FrameObject;
