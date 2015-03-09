/// <reference path="../bower_components/DefinitelyTyped/node/node.d.ts" />

// An Unmarshaller takes a .pyc file (as a string of bytes, e.g. "\xXX") and
// converts it into a Python code object. The marshal format is not officially
// documented, and there may be unnecessary cruft in the unmarshal loop below.
import Py_CodeObject = require('./codeobject');
import Py_Int = require('./integer');
import Py_Long = require('./long');
import Py_Float = require('./float');
import Py_Complex = require('./complex');
import builtins = require('./builtins');
import fs = require('fs');
import gLong = require("../lib/gLong");
import collections = require('./collections');
import pytypes = require('./pytypes');
var Decimal = require('../node_modules/decimal.js/decimal');
var Py_Tuple = collections.Py_Tuple;
var Py_List = collections.Py_List;

// An Unmarshaller takes a .pyc file (as a string of binarys, e.g. "\xXX")
// and converts into a Python code object.
class Unmarshaller {
    // How far we are into the buffer
    index: number;
    // The input from reading the file
    input: Buffer;
    // A "magic number" at the beginning of the pyc file.
    // Somehow related to the Python version.
    magicNumber: number;
    public static PYTHON_2_7_8_MAGIC: number = 0xf303;
    // Date of compilation
    date: Date;
    // The list of "interalized" strings
    internedStrs: string[];
    // The output of unmarshalling the .pyc file
    output: Py_CodeObject;

    constructor(inputBuffer: Buffer) {
        // Initialize values
        this.internedStrs = [];
        // For testing purposes, this is synchronous
        this.input = inputBuffer;
        this.magicNumber = this.input.readUInt16LE(0);

        if (this.magicNumber != Unmarshaller.PYTHON_2_7_8_MAGIC) {
            throw new Error("Unsupported Python version.");
        }
        // Note: The 2 bytes after the magic number are just an CRLF and can be
        // ignored.

        // Python marshals the date in seconds -- see time.localtime in the
        // Python stdlib.
        // Javascript takes the date in milliseconds. Thus, 1000*time.
        this.date = new Date(1000 * this.input.readUInt32LE(4));
        // We read the first 8 bytes to get the magic number and the date
        this.index = 8;
    }

    // Processes the input string, returning the corresponding code object.
    value(): Py_CodeObject {
        if (this.output == null) {
            this.output = this.unmarshal();
        }
        return this.output;
    }

    // Reads a single character (1 byte, as string) from the input
    readChar(): string {
        var c = this.input.toString('ascii', this.index, this.index+1);
        this.index += 1;
        return c;
    }

    // Reads a single byte from the input
    // (Equivalent to readChar().charCodeAt(0))
    readByte(): number {
        var b = this.input.readUInt8(this.index);
        this.index += 1;
        return b;
    }

    // Read an unsigned short (used for grokking longs)
    readUInt16(): number {
        var s = this.input.readUInt16LE(this.index);
        this.index += 2;
        return s;
    }

    // Reads a 4-byte integer from the input. Used for string indices, etc.
    readInt32(): number {
        var i = this.input.readInt32LE(this.index);
        this.index += 4;
        return i;
    }

    // Reads a 64 bit integer
    readInt64(): gLong {
        var low = this.readInt32();
        var high = this.readInt32();
        return gLong.fromBits(low, high);
    }

    // Reads a 64-bit floating-pount number
    // WARNING: Javascript only supports double-precision floats.
    // Any numbers greater than 2**52 will be approximate at best
    // Refer to IEEE 754 for more detail.
    readFloat64(): number {
        var f = this.input.readDoubleLE(this.index);
        this.index += 8;
        return f;
    }

    // Read a string from the input. Strings are encoded with a 32-bit integer
    // length (in bytes), followed by the actual bytes of the string.
    readString(length: number, encoding = "ascii"): pytypes.Py_Str {
        var s = this.input.toString(encoding, this.index, this.index+length);
        this.index += length;
        return pytypes.Py_Str.fromJS(s);
    }

    // Unicode strings have to be treated differently by the Buffer class.
    readUnicodeString(length: number): pytypes.Py_Str {
        return this.readString(length, "utf8");
    }

    // Buffer's ASCII encoding automatically chops off the highest bit, so e.g.
    // 0x84 (the MAKE_FUNCTION opcode) is truncated to 0x04. This is obviously
    // disastrous. Instead, we read binary strings directly as Buffers.
    // This function is really just a helper for unmarshalCodeString
    readBinaryString(length: number): Buffer {
        var buf = new Buffer(length);
        this.input.copy(buf, 0, this.index, this.index+length);
        this.index += length;
        return buf
    }

    // Code strings are treated separately, since they're marshalled as normal
    // strings but need to be unmarshalled as binary strings.
    unmarshalCodeString(): Buffer {
        var op = this.readChar();
        if (op != "s") {
            throw new Error("The code string should be marshalled as a string");
        }
        var length = this.readInt32();
        return this.readBinaryString(length);
    }

    // Unmarshals the input string recursively. May handle unneeded cases, e.g.
    // T (true) and F (false) due to undocumented marshalling format.
    unmarshal(convertTypes: boolean = false) {
        var unit = this.readChar();
        var res: any;
        switch (unit) {
            // Constants
            case "N": // None
                res = builtins.None;
                break;
            case "F": // False
                res = false;
                break;
            case "S": // StopIteration Exception (TODO: double check this)
                throw new Error("StopIteration is pending investigation");
            case "T": // True
                res = true;
                break;
            case ".": // Ellipsis object (TODO: double check this)
                throw new Error("Ellipsis is not yet implemented");
                break;
            // Numbers
            case "g": // double-precision floating-point number
                res = new Py_Float(this.readFloat64());
                break;
            case "i": // 32-bit integer (signed)
                res = Py_Int.fromInt(this.readInt32());
                break;
            case "I": // 64-bit integer (signed)
                res = new Py_Int(this.readInt64());
                break;
            case "l": // arbitrary precision integer
                // Stored as a 32-bit integer of length, then $length 16-bit
                // digits.
                var length = this.readInt32();
                var num = new Decimal(0);
                if (length != 0) {
                    var shift = new Decimal(15);
                    for(var i = 0; i < Math.abs(length); i++) {
                        var digit = new Decimal(this.readUInt16());
                        num = num.plus(digit.times(
                                    Decimal.pow(2, shift.times(i))));
                    }
                }
                if (length < 0) {
                    num = num.times(-1);
                }
                res = new Py_Long(num);
                break;
            case "y": // complex number
                res = Py_Complex.fromNumber(this.readFloat64(),
                        this.readFloat64());
                break;
            // Strings
            case "R": // Reference to interned string
                var index = this.readInt32();
                res = this.internedStrs[index];
                break;
            case "s": // plain string. length (int 32) + bytes
                var length = this.readInt32();
                res = this.readString(length);
                break;
            case "t": // interned string, stored in an array
                var length = this.readInt32();
                res = this.readString(length);
                this.internedStrs.push(res);
                break;
            case "u": // utf-8 string
                var length = this.readInt32();
                res = this.readUnicodeString(length);
                break;
            // Collections
            case "(": // tuple
            case "[": // list
                var length = this.readInt32();
                res = [];
                for (var x = 0; x < length; x++) {
                    res.push(this.unmarshal(true));
                }
                break;
            // Code Objects:
            case "c":
                var argc = this.readInt32();
                var nlocals = this.readInt32();
                var stacksize = this.readInt32();
                var flags = this.readInt32();
                var codestr: Buffer = this.unmarshalCodeString();
                var consts: any[] = this.unmarshal();
                var names: string[] = this.unmarshal();
                var varnames: string[] = this.unmarshal();
                var freevars: string[] = this.unmarshal();
                var cellvars: string[] = this.unmarshal();
                var filename: string = this.unmarshal();
                var name: string = this.unmarshal();
                var firstlineno = this.readInt32();
                var lnotab: string = this.unmarshal();
                res = new Py_CodeObject(
                    argc, nlocals, stacksize, flags, codestr, consts,
                    names, varnames, freevars, cellvars, filename,
                    name, firstlineno, lnotab);
                break;

            default:
                console.log("Unsupported marshal format: " + unit + " @" +
                        this.index);
                throw new Error("Unsupported marshal format: " + unit)
        }
        // XXX: internal structures use JS arrays, but code constants need
        // conversion to python list/tuple types.
        if (convertTypes) {
            if (unit === '(') {
                return new Py_Tuple(res);
            }
            if (unit === '[') {
                return new Py_List(res);
            }
        }
        return res;
    }
}
export = Unmarshaller;
