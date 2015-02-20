import Py_CodeObject = require('./codeobject');
import Py_FuncObject = require('./funcobject');
import opcodes = require('./opcodes');
import optable = require('./optable');

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
    globals: { [name: string]: any };
    // Last attempted instruction
    lastInst: number;
    // Current line number
    lineNum: number;
    // Local namespace
    locals: { [name: string]: any };
    // Flag: 1 if running in restricted mode (TODO: What?)
    restricted: boolean;
    // This frame's stack
    stack: any[];
    // Tracing function for this frame
    // trace:
    // Stdout stream (hack!)
    outputDevice: any;
    // block stack, for loops and such.
    // Entries are [stackSize, startPos, endPos] tuples.
    // TODO: type this correctly
    blockStack: any[];

    constructor(back: Py_FrameObject,
                code: Py_CodeObject,
                globals: { [name: string]: any },
                lastInst: number,
                lineNum: number,
                locals: { [name: string]: any },
                restricted: boolean,
                outputDevice: any) {
        this.back = back;
        this.codeObj = code;
        this.globals = globals;
        this.lastInst = lastInst;
        this.lineNum = lineNum;
        this.locals = locals;
        this.restricted = restricted;
        this.stack = [];
        this.outputDevice = outputDevice;
        this.blockStack = [];
    }

    // Stack handling operations.
    push(v) {
        return this.stack.push(v);
    }

    pop() {
        return this.stack.pop();
    }

    peek() {
        return this.stack[this.stack.length-1];
    }

    // The frame's lastInst field keeps track of the last executed instruction.
    readOp(): number {
        this.lastInst += 1;
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
        var debug = false;  // TODO: toggle this with a debug flag
        for (var op = this.readOp(); op != undefined; op = this.readOp()) {
            var func = optable[op];
            if (func == undefined) {
                throw new Error("Unknown opcode: " + opcodes[op] + " ("+op+")");
            }
            if (debug) {
                console.log(opcodes[op]);
            }
            func(this);
            if (debug) {
                console.log(this.stack);
            }
            if (op == opcodes.RETURN_VALUE) {
                return;
            }
        }
    }

    // clone a new frame off this one, for calling a child function.
    childFrame(func: Py_FuncObject, locals: { [name: string]: any }): Py_FrameObject {
        return new Py_FrameObject(this, func.code,
            func.globals, -1, func.code.firstlineno, locals, false,
            this.outputDevice);
    }

}
export = Py_FrameObject;
