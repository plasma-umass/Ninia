import interfaces = require('./interfaces');
import IPy_Object = interfaces.IPy_Object;
import Py_CodeObject = require('./codeobject');
import Py_FuncObject = require('./funcobject');
import opcodes = require('./opcodes');
import optable = require('./optable');
import Py_Cell = require('./cell');
import Thread = require('./threading');

// Frame Objects are basically stack frames for functions, except they carry
// extra context (e.g. globals, local scope, etc.). This class is not simplified
// in order to keep the fairly neat documentation.
// Frame objects maintain their own stack and scope. This allows for easier
// handling of function calls and other scoping actions.
class Py_FrameObject {
    // Previous stack frame (this frame's caller, may be None)
    back: Py_FrameObject;
    // Code object executed in this frame
    codeObj: Py_CodeObject;
    // traceback for debugging -- TODO: Implement
    // traceback: any;
    // Exception type, if raised in this frame
    // exc_type: any;
    // Exception value, if raised in this frame
    // exc_value
    // List of global values (global namespace!)
    globals: { [name: string]: IPy_Object };
    // Last attempted instruction
    lastInst: number;
    // Current line number
    lineNum: number;
    // Local namespace
    locals: { [name: string]: IPy_Object };
    // Flag: 1 if running in restricted mode (TODO: What?)
    restricted: boolean;
    // This frame's stack
    stack: IPy_Object[];
    // Tracing function for this frame
    // trace:
    // Stdout stream (hack!)
    outputDevice: any;
    // see https://docs.python.org/2/reference/simple_stmts.html#print
    shouldWriteSpace: boolean;
    // block stack, for loops and such.
    // Entries are [stackSize, startPos, endPos] tuples.
    // TODO: type this correctly
    blockStack: [number, number, number][];
    // Lexical environment
    // cellvars followed by freevars
    env: Py_Cell[];
    // flag to turn on debug output
    debug: boolean;
    // thread object
    threadObject: Thread;

    constructor(back: Py_FrameObject,
                code: Py_CodeObject,
                globals: { [name: string]: IPy_Object },
                lastInst: number,
                lineNum: number,
                locals: { [name: string]: IPy_Object },
                restricted: boolean,
                outputDevice: any,
                closure: IPy_Object[],
                debug: boolean) {
        this.back = back;
        this.codeObj = code;
        this.globals = globals;
        this.lastInst = lastInst;
        this.lineNum = lineNum;
        this.locals = locals;
        this.restricted = restricted;
        this.stack = [];
        this.outputDevice = outputDevice;
        this.shouldWriteSpace = false;
        this.blockStack = [];
        this.env = [];
        this.debug = debug;
        var i: number;
        for (i = 0; i < code.cellvars.length; i++) {
            this.env.push(new Py_Cell(null));
        }

        for (i = 0; i < code.freevars.length; i++) {
            this.env.push(<Py_Cell>closure[i]);
        }

    }

    // Stack handling operations.
    push(v: IPy_Object) {
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
    exec(): void {
        for (var op = this.readOp(); op != undefined; op = this.readOp()) {
            var func = optable[op];
            if (func == undefined) {
                throw new Error("Unknown opcode: " + opcodes[op] + " ("+op+")");
            }
            if (this.debug) {
                console.log(opcodes[op]);
            }
            func(this);
            if (this.debug) {
                console.log(this.stack);
            }
            if (op == opcodes.RETURN_VALUE) {
                return;

            }
        }
    }

    // Return the Thread Object assoiciated with this frame
    getThreadObject(): Thread {
        return this.threadObject;
    }

    // Replacement of exec(), when using Thread
    // Reads one instruction opcode and runs the bytecode associated with it
    new_exec(t: Thread): void {
        // Store Thread object, used by CALL_FUNC when creating childframes
        this.threadObject = t;
        var op = this.readOp();
        if (op!= undefined){
            // console.log("OP: ", opcodes[op]);
            var func = optable[op];
            if (func == undefined) {
                throw new Error("Unknown opcode: " + opcodes[op] + " ("+op+")");
            }
            if (this.debug) {
                console.log(opcodes[op]);
            }
            func(this);
            // Pop Py_FrameObject off the Thread Object, whenever return is encountered
            if (op == opcodes.RETURN_VALUE) {
                t.framePop();
                return;
            }
        }
    }

    // clone a new frame off this one, for calling a child function.
    childFrame(func: Py_FuncObject, locals: { [name: string]: IPy_Object }): Py_FrameObject {
      var scope = this.back ? this.globals : this.locals;
      var env = func.closure ? func.closure.toArray() : [];
      return new Py_FrameObject(this, func.code, scope, -1,
        func.code.firstlineno, locals, false, this.outputDevice, env, this.debug);
    }

    getDeref(i: number) {
        var cell: Py_Cell = this.env[i];
        if (cell.ob_ref === null) {
            var name: string;
            var numCellvars = this.codeObj.cellvars.length;
            if (i < numCellvars) {
                name = this.codeObj.cellvars[i].toString();

            } else {
                name = this.codeObj.freevars[i - numCellvars].toString();
            }
            cell.ob_ref = this.locals[name];
        }
        return cell;
    }
}
export = Py_FrameObject;
