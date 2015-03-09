import Py_FrameObject = require('./frameobject');
import Py_Int = require('./integer');
import Py_FuncObject = require('./funcobject');
import opcodes = require('./opcodes');
import builtins = require('./builtins');
import collections = require('./collections');
var NotImplemented = builtins.NotImplemented;
var Py_List = collections.Py_List;

// Big mapping from opcode enum to function
var optable: { [op: number]: (f: Py_FrameObject)=>void } = {};

optable[opcodes.STOP_CODE] = function(f: Py_FrameObject) {
    throw new Error("Indicates end-of-code to the compiler, not used by the interpreter.");
}

optable[opcodes.POP_TOP] = function(f: Py_FrameObject) {
    f.pop();
}

optable[opcodes.ROT_TWO] = function(f: Py_FrameObject) {
    var a = f.pop();
    var b = f.pop();
    f.push(a);
    f.push(b);
}

optable[opcodes.ROT_THREE] = function(f: Py_FrameObject) {
    var a = f.pop();
    var b = f.pop();
    var c = f.pop();
    f.push(a);
    f.push(c);
    f.push(b);
}

optable[opcodes.ROT_FOUR] = function(f: Py_FrameObject) {
    var a = f.pop();
    var b = f.pop();
    var c = f.pop();
    var d = f.pop();
    f.push(a);
    f.push(d);
    f.push(c);
    f.push(b);
}

optable[opcodes.UNARY_POSITIVE] = function(f: Py_FrameObject) {
    var a = f.pop();

    if (a.pos)
        f.push(a.pos());
    else
        throw new Error("No unary_+ for " + a);
}

optable[opcodes.UNARY_NEGATIVE] = function(f: Py_FrameObject) {
    var a = f.pop();

    if (a.neg)
        f.push(a.neg());
    else
        throw new Error("No unary_- for " + a);
}

optable[opcodes.UNARY_NOT] = function(f: Py_FrameObject) {
    var a = f.pop();

    return !(toBool(a));
}

optable[opcodes.UNARY_CONVERT] = function(f: Py_FrameObject) {
    var a = f.pop();
    f.push(a.toString());
}

optable[opcodes.UNARY_INVERT] = function(f: Py_FrameObject) {
    var a = f.pop();

    if (a.invert)
        f.push(a.invert());
    else
        throw new Error("No inversion function for " + a);
}

// All of the binary functions follow the same chain of logic:
// 1. There is some function for each object that defines this operation
//    (e.g. addition is implemented by the "add" function)
// 2. Operations that are not supported for a particular type (e.g. binary
//    AND or shifts for non-integers) are left undefined.
// 3. If a particular operation is not defined for the given arguments,
//    the function will return the NotImplemented.
// 4. If this is the case, try the reverse operation (rop) function
// 5. If rop is similarly undefined or returns NotImplemented, the
//    operation is not permitted for the given types.

optable[opcodes.BINARY_POWER] = function(f: Py_FrameObject) {
    var b = f.pop();
    var a = f.pop();

    var res;
    var mess = "You cannot raise " + a + " to the power of " + b;

    if (typeof a.pow == 'undefined')
        throw new Error(mess);

    res = a.pow(b);
    if (res == NotImplemented) {
        if(typeof b.rpow == 'undefined')
            throw new Error(mess);
        res = b.rpow(a);
        if (res == NotImplemented)
            throw new Error(mess);
    }

    f.push(res);
}

optable[opcodes.BINARY_MULTIPLY] = function(f: Py_FrameObject) {
    var b = f.pop();
    var a = f.pop();

    var res;
    var mess = "You cannot multiply " + a + " and " + b;

    if (typeof a.mult == 'undefined')
        throw new Error(mess);

    res = a.mult(b);
    if (res == NotImplemented) {
        if(typeof b.rmult == 'undefined')
            throw new Error(mess);
        res = b.rmult(a);
        if (res == NotImplemented)
            throw new Error(mess);
    }

    f.push(res);
}

//used when from __future__ import division is not in effect
optable[opcodes.BINARY_DIVIDE] = function(f: Py_FrameObject) {
    var b = f.pop();
    var a = f.pop();

    var res;
    var mess = "You cannot divide " + a + " by " + b;

    if (typeof a.div == 'undefined')
        throw new Error(mess);

    res = a.div(b);
    if (res == NotImplemented) {
        if(typeof b.rdiv == 'undefined')
            throw new Error(mess);
        res = b.rdiv(a);
        if (res == NotImplemented)
            throw new Error(mess);
    }

    f.push(res);
}

optable[opcodes.BINARY_MODULO] = function(f: Py_FrameObject) {
    var b = f.pop();
    var a = f.pop();

    var res;
    var mess = "You cannot modulo " + a + " by " + b;

    if (typeof a.mod == 'undefined')
        throw new Error(mess);

    res = a.mod(b);
    if (res == NotImplemented) {
        if(typeof b.rmod == 'undefined')
            throw new Error(mess);
        res = b.rmod(a);
        if (res == NotImplemented)
            throw new Error(mess);
    }

    f.push(res);
}

optable[opcodes.BINARY_ADD] = function(f: Py_FrameObject) {
    var b = f.pop();
    var a = f.pop();

    if (typeof a.add == 'undefined')
        throw new Error(`You cannot add ${a} and ${b}`);

    var res = a.add(b);
    if (res == NotImplemented) {
        if(typeof b.radd == 'undefined')
            throw new Error(`You cannot add ${a} and ${b}`);
        res = b.radd(a);
        if (res == NotImplemented)
            throw new Error(`You cannot add ${a} and ${b}`);
    }

    f.push(res);
}

optable[opcodes.BINARY_SUBTRACT] = function(f: Py_FrameObject) {
    var b = f.pop();
    var a = f.pop();

    var res;
    var mess = "You cannot subtract " + a + " and " + b;

    if (typeof a.sub == 'undefined')
        throw new Error(mess);

    res = a.sub(b);
    if (res == NotImplemented) {
        if(typeof b.rsub == 'undefined')
            throw new Error(mess);
        res = b.rsub(a);
        if (res == NotImplemented)
            throw new Error(mess);
    }

    f.push(res);

}

optable[opcodes.BINARY_SUBSCR] = function(f: Py_FrameObject) {
    var b = f.pop();
    var a = f.pop();
    f.push(a[b]);
}

optable[opcodes.BINARY_FLOOR_DIVIDE] = function(f: Py_FrameObject) {
    var b = f.pop();
    var a = f.pop();

    var res;
    var mess = "You cannot divide " + a + " by " + b;

    if (typeof a.floordiv == 'undefined')
        throw new Error(mess);

    res = a.floordiv(b);
    if (res == NotImplemented) {
        if(typeof b.rfloordiv == 'undefined')
            throw new Error(mess);
        res = b.rfloordiv(a);
        if (res == NotImplemented)
            throw new Error(mess);
    }

    f.push(res);
}

// used when from __future__ import division is in effect
// However, BINARY_DIV is forced to be TRUEDIVISION in the implementation of
// the numeric types.
optable[opcodes.BINARY_TRUE_DIVIDE] = function(f: Py_FrameObject) {
    var b = f.pop();
    var a = f.pop();

    var res;
    var mess = "You cannot divide " + a + " and " + b;

    if (typeof a.truediv == 'undefined')
        throw new Error(mess);

    res = a.truediv(b);
    if (res == NotImplemented) {
        if(typeof b.rtruediv == 'undefined')
            throw new Error(mess);
        res = b.rtruediv(a);
        if (res == NotImplemented)
            throw new Error(mess);
    }

    f.push(res);
}

optable[opcodes.BINARY_LSHIFT] = function(f: Py_FrameObject) {
    var b = f.pop();
    var a = f.pop();

    var res;
    var mess = "You cannot left-shift " + a + " by " + b;

    if (typeof a.lshift == 'undefined')
        throw new Error(mess);

    res = a.lshift(b);
    if (res == NotImplemented) {
        if(typeof b.rlshift == 'undefined')
            throw new Error(mess);
        res = b.rlshift(a);
        if (res == NotImplemented)
            throw new Error(mess);
    }

    f.push(res);
}

optable[opcodes.BINARY_RSHIFT] = function(f: Py_FrameObject) {
    var b = f.pop();
    var a = f.pop();

    var res;
    var mess = "You cannot right-shift " + a + " by " + b;

    if (typeof a.rshift == 'undefined')
        throw new Error(mess);

    res = a.rshift(b);
    if (res == NotImplemented) {
        if(typeof b.rrshift == 'undefined')
            throw new Error(mess);
        res = b.rrshift(a);
        if (res == NotImplemented)
            throw new Error(mess);
    }

    f.push(res);
}

optable[opcodes.BINARY_AND] = function(f: Py_FrameObject) {
    var b = f.pop();
    var a = f.pop();

    var res;
    var mess = "You cannot bitwise AND " + a + " and " + b;

    if (typeof a.and == 'undefined')
        throw new Error(mess);

    res = a.and(b);
    if (res == NotImplemented) {
        if(typeof b.rand == 'undefined')
            throw new Error(mess);
        res = b.rand(a);
        if (res == NotImplemented)
            throw new Error(mess);
    }

    f.push(res);

}

optable[opcodes.BINARY_XOR] = function(f: Py_FrameObject) {
    var b = f.pop();
    var a = f.pop();

    var res;
    var mess = "You cannot bitwise XOR " + a + " and " + b;

    if (typeof a.xor == 'undefined')
        throw new Error(mess);

    res = a.xor(b);
    if (res == NotImplemented) {
        if(typeof b.rxor == 'undefined')
            throw new Error(mess);
        res = b.rxor(a);
        if (res == NotImplemented)
            throw new Error(mess);
    }

    f.push(res);

}

optable[opcodes.BINARY_OR] = function(f: Py_FrameObject) {
    var b = f.pop();
    var a = f.pop();

    var res;
    var mess = "You cannot bitwise OR " + a + " and " + b;

    if (typeof a.or == 'undefined')
        throw new Error(mess);

    res = a.or(b);
    if (res == NotImplemented) {
        if(typeof b.ror == 'undefined')
            throw new Error(mess);
        res = b.ror(a);
        if (res == NotImplemented)
            throw new Error(mess);
    }

    f.push(res);
}

optable[opcodes.INPLACE_ADD] = function(f: Py_FrameObject) {
    var b = f.pop();
    var a = f.pop();

    if (typeof a == 'string' && typeof b == 'string') {
        f.push(a + b);
        return;
    }

    var mess = "You cannot add " + a + " and " + b;

    if (typeof a.iadd != 'undefined') {
        a.iadd(b);
        f.push(a);
        return
    }
    if (typeof a.add == 'undefined') {
        throw new Error(mess);
    }

    var res = a.add(b);
    if (res == NotImplemented) {
        throw new Error(mess);
    }

    f.push(res);
}

optable[opcodes.PRINT_ITEM] = function(f: Py_FrameObject) {
    var a = f.pop();
    // see https://docs.python.org/2/reference/simple_stmts.html#print
    if (f.shouldWriteSpace) {
        f.outputDevice.write(' ');
    }
    var s: string;
    // Hack: check for True/False and print them correctly
    if (a === true || a === false) {
        s = a.toString();
        s = s.charAt(0).toUpperCase() + s.substr(1);
    } else {
        s = a.str().toString();
    }
    f.outputDevice.write(s);
    var lastChar = s.slice(-1);
    f.shouldWriteSpace = (lastChar != '\t' && lastChar != '\n');
}

optable[opcodes.PRINT_NEWLINE] = function(f: Py_FrameObject) {
    f.outputDevice.write("\n");
    f.shouldWriteSpace = false;
}

optable[opcodes.RETURN_VALUE] = function(f: Py_FrameObject) {
    var r = f.pop();
    if (f.back) {
        f.back.push(r);
    }
    return r;
}

optable[opcodes.STORE_NAME] = function(f: Py_FrameObject) {
    var i = f.readArg();
    var val = f.pop();
    var name = f.codeObj.names[i];
    f.locals[name] = val;
}

optable[opcodes.STORE_GLOBAL] = function(f: Py_FrameObject) {
    var i = f.readArg();
    var val = f.pop();
    var name = f.codeObj.names[i];
    f.globals[name] = val;
}

optable[opcodes.LOAD_CONST] = function(f: Py_FrameObject) {
    var i = f.readArg();
    f.push(f.codeObj.consts[i]);
}

optable[opcodes.LOAD_NAME] = function(f: Py_FrameObject) {
    var i = f.readArg();
    var name: string = f.codeObj.names[i];
    var val = f.locals[name] || f.globals[name] || builtins[name];
    if (val === undefined) {
        throw new Error('undefined name: ' + name);
    }
    f.push(val);
}

optable[opcodes.LOAD_GLOBAL] = function(f: Py_FrameObject) {
    var i = f.readArg();
    var name: string = f.codeObj.names[i];
    var val = f.globals[name];
    if (val === undefined) {
        throw new Error('undefined name: ' + name);
    }
    f.push(val);
}

optable[opcodes.COMPARE_OP] = function(f: Py_FrameObject) {
    var comp_ops = ['<', '<=', '==', '!=', '>', '>=', 'in', 'not in',
                    'is', 'is not', 'exception match'];
    var opidx = f.readArg();
    var op = comp_ops[opidx];
    var b = f.pop();
    var a = f.pop();

    // Convert booleans to Integers
    // Python has True and False encoded as Integers (booleans, subclassed
    // from Integer) but that will take too long to implement
    // Note that True = 1 and False = 0 is consistent with Python (True >
    // False == True)
    if (typeof a == 'boolean') {
        a = Py_Int.fromInt(+a);
    }

    if (typeof b == 'boolean') {
        b = Py_Int.fromInt(+b);
    }

    switch(op) {
        case '<':
            f.push(doLT(a,b));
            break;
        case '<=':
            f.push(doLE(a,b));
            break;
        case '==':
            f.push(doEQ(a,b));
            break;
        case '!=':
            f.push(doNE(a,b));
            break;
        case '>':
            f.push(doGT(a,b));
            break;
        case '>=':
            f.push(doGE(a,b));
            break;
            // Comparisons of sequences and types are not implemented
        // case 'in':
        //     return b.some( function(elem, idx, arr) {
        //         return elem == a;
        //     });
        //     break;
        // case 'not in':
        //     return b.every( function(elem, idx, arr) {
        //         return elem != a;
        //     });
        //     break;
        case 'is':
            f.push(a.hash() === b.hash());
            break;
        case 'is not':
            f.push(a.hash() !== b.hash());
            break;
        // case 'exception match':
        //     throw new Error("Python Exceptions are not supported");
        default:
            throw new Error("Unknown or unsupported comparison operator: "+op);
    }
}

function doLT(a,b): boolean {
    var res;
    var mess = "There is no less-than ordering between " + a + " and " + b;

    if (typeof a.lt == 'undefined')
        throw new Error(mess);

    res = a.lt(b);
    if (res == NotImplemented) {
        if(typeof b.gt == 'undefined')
            throw new Error(mess);
        res = b.gt(a);
        if (res == NotImplemented)
            throw new Error(mess);
    }

    return res;
}

function doLE(a,b): boolean {
    var res;
    var mess = "There is no '<=' (LTE) ordering between " + a + " and " + b;

    if (typeof a.le == 'undefined')
        throw new Error(mess);

    res = a.le(b);
    if (res == NotImplemented) {
        if(typeof b.ge == 'undefined')
            throw new Error(mess);
        res = b.ge(a);
        if (res == NotImplemented)
            throw new Error(mess);
    }

    return res;
}

function doEQ(a,b): boolean {
    var res;
    var mess = "There is no equality operation between " + a + " and " + b;

    if (typeof a.eq == 'undefined')
        throw new Error(mess);

    res = a.eq(b);
    if (res == NotImplemented) {
        if(typeof b.eq == 'undefined')
            throw new Error(mess);
        res = b.eq(a);
        if (res == NotImplemented)
            throw new Error(mess);
    }

    return res;
}

function doNE(a,b): boolean {
    var res;
    var mess = "There is no inequality operation between "+ a + " and " + b;

    if (typeof a.ne == 'undefined')
        throw new Error(mess);

    res = a.ne(b);
    if (res == NotImplemented) {
        if(typeof b.ne == 'undefined')
            throw new Error(mess);
        res = b.ne(a);
        if (res == NotImplemented)
            throw new Error(mess);
    }

    return res;
}

function doGT(a,b): boolean {
    var res;
    var mess = "There is no greater-than ordering between "+ a +" and " + b;

    if (typeof a.gt == 'undefined')
        throw new Error(mess);

    res = a.gt(b);
    if (res == NotImplemented) {
        if(typeof b.lt == 'undefined')
            throw new Error(mess);
        res = b.lt(a);
        if (res == NotImplemented)
            throw new Error(mess);
    }

    return res;
}

function doGE(a,b): boolean {
    var res;
    var mess = "There is no >= (GTE) ordering between "+ a + " and " + b;

    if (typeof a.ge == 'undefined')
        throw new Error(mess);

    res = a.ge(b);
    if (res == NotImplemented) {
        if(typeof b.le == 'undefined')
            throw new Error(mess);
        res = b.le(a);
        if (res == NotImplemented)
            throw new Error(mess);
    }

    return res;
}

// toBool returns false if the argument would be considered False in Python
// Similarly, returns true if it would be considered true.
function toBool(a: any): boolean {
    if (typeof a == 'boolean') {
        return a
    } else if (a.isInt || a.isLong || a.isFloat) {
        return a.toNumber() == 0;
    } else if (a.isComplex) {
        return (a.real == 0 && a.imag == 0);
    }

    switch(a) {
        case builtins.None:
        case 0:
        case '':
        case []:
        case {}:
            return false;
            break;
        default:
            return true;
    }
}

optable[opcodes.JUMP_FORWARD] = function(f: Py_FrameObject) {
    var delta = f.readArg();
    f.lastInst += delta
}

optable[opcodes.JUMP_IF_FALSE_OR_POP] = function(f: Py_FrameObject) {
    var target = f.readArg();
    if (toBool(f.peek())) {
        f.pop();
    } else {
        f.lastInst = target;
    }
}

optable[opcodes.JUMP_IF_TRUE_OR_POP] = function(f: Py_FrameObject) {
    var target = f.readArg();
    if (toBool(f.peek())) {
        f.lastInst = target;
    } else {
        f.pop();
    }
}

optable[opcodes.JUMP_ABSOLUTE] = function(f: Py_FrameObject) {
    var target = f.readArg();
    f.lastInst = target - 1;  // XXX: readOp increments before reading
}

optable[opcodes.POP_JUMP_IF_FALSE] = function(f: Py_FrameObject) {
    var target = f.readArg();

    if (!toBool(f.pop()))
        f.lastInst = target-1;
}

optable[opcodes.POP_JUMP_IF_TRUE] = function(f: Py_FrameObject) {
    var target = f.readArg();
    if (toBool(f.pop()))
        f.lastInst = target;
}

optable[opcodes.LOAD_FAST] = function(f: Py_FrameObject) {
    var i = f.readArg();
    var name = f.codeObj.varnames[i];
    f.push(f.locals[name]);
}

optable[opcodes.STORE_FAST] = function(f: Py_FrameObject) {
    var i = f.readArg();
    var val = f.pop();
    f.locals[f.codeObj.varnames[i]] = val;
}

optable[opcodes.CALL_FUNCTION] = function(f: Py_FrameObject) {
    var x = f.readArg()
    var num_args = x & 0xff;
    var num_kwargs = (x >> 8) & 0xff;
    var args = new Array(num_args);
    var kwargs: { [name: string]: any } = {};

    for (var i = 0; i < num_kwargs; i++) {
        var val = f.pop();
        var key = f.pop();
        kwargs[key] = val;
    }

    // positional args come in backwards (stack) order
    for (var i = num_args-1; i >= 0; i--) {
        args[i] = f.pop();
    }

    var func = f.pop();

    // Hacky check for native functions
    if (typeof func === 'function') {
        // XXX: not async! Any async native will kill the interpreter.
        f.push(func(args, kwargs));
    } else {
        // convert kwargs into local variables for the function
        var varnames = func.code.varnames;
        for (var i = 0; i < varnames.length; i++) {
            var name = varnames[i];
            if (kwargs[name] == undefined) {
                if (args.length > 0) {
                    kwargs[name] = args.shift();
                } else {
                    kwargs[name] = func.defaults[name];
                }
            }
        }
        // Add function itself to its globals
        if (f.locals[func.name] != undefined)
            f.globals[func.name] = f.locals[func.name];
        var newf = f.childFrame(func, kwargs);
        newf.exec();
    }
}

optable[opcodes.MAKE_FUNCTION] = function(f: Py_FrameObject) {
    var numDefault = f.readArg();
    var defaults: { [name: string]: any } = {};

    var code = f.pop();

    for (var i = code.varnames.length-1; i >= 0; i--) {
        defaults[code.varnames[i]] = f.pop();
    }

    var func = new Py_FuncObject(code, f.globals, defaults, code.name);
    f.push(func);
}

//TODO: From here down to Opcodes: Check if this is the correct
//implementation. (They should be Slice/Array objects, probably!)
optable[opcodes.DUP_TOP] = function(f: Py_FrameObject) {
    f.push(f.peek());
}

optable[opcodes.NOP] = function(f: Py_FrameObject) {}

optable[opcodes.SLICE_0] = function(f: Py_FrameObject) {
    var a = f.pop();
    var b = a.slice(0);
    f.push(b);
}

optable[opcodes.SLICE_1] = function(f: Py_FrameObject) {
    var a = f.pop();
    var b = f.pop();
    f.push(b.slice(a));
}

optable[opcodes.SLICE_2] = function(f: Py_FrameObject) {
    var a = f.pop();
    var b = f.pop();
    f.push(b.slice(0,a));
}

optable[opcodes.SLICE_3] = function(f: Py_FrameObject) {
    var a = f.pop();
    var b = f.pop();
    var c = f.pop();
    f.push(c.slice(b,a));
}

//TODO: store_slice is not working yet
optable[opcodes.STORE_SLICE_0] = function(f: Py_FrameObject) {
    var a = f.pop();
    var b = f.pop();
    var aux = a.slice(0);
    aux = b;
}

optable[opcodes.STORE_SLICE_1] = function(f: Py_FrameObject) {
    var a = f.pop();
    var b = f.pop();
    var c = f.pop();
    var aux = b.slice(a);
    aux = c;
}

optable[opcodes.STORE_SLICE_2] = function(f: Py_FrameObject) {
    var a = f.pop();
    var b = f.pop();
    var c = f.pop();
    var aux = b.slice(0,a);
    aux = c;
}

optable[opcodes.STORE_SLICE_3] = function(f: Py_FrameObject) {
    var a = f.pop();
    var b = f.pop();
    var c = f.pop();
    var d = f.pop();
    var aux = c.slice(b,a);
    aux = d;
}

// TODO: more testing
optable[opcodes.STORE_SUBSCR] = function(f: Py_FrameObject) {
    var a = f.pop();
    var b = f.pop();
    var c = f.pop();
    b[a] = c;
}

// TODO: more testing
optable[opcodes.DELETE_SUBSCR] = function(f: Py_FrameObject) {
    var a = f.pop();
    var b = f.pop();
    f.push(b.splice(a,1));
}

// XXX: for now, is exactly the same as BUILD_LIST
optable[opcodes.BUILD_TUPLE] = function(f: Py_FrameObject) {
    var count = f.readArg();
    var l = new Array(count);
    for (var i = count-1; i >= 0; i--){
        l[i] = f.pop();
    }
    f.push(new Py_List(l));
}

//TODO: seems to work but need more testing
optable[opcodes.BUILD_LIST] = function(f: Py_FrameObject) {
    var count = f.readArg();
    var l = new Array(count);
    for (var i = count-1; i >= 0; i--){
        l[i] = f.pop();
    }
    f.push(new Py_List(l));
}

optable[opcodes.BUILD_MAP] = function(f: Py_FrameObject) {
    var count = f.readArg();
    var d = builtins.dict([], {});
    f.push(d);
}

optable[opcodes.STORE_MAP] = function(f: Py_FrameObject) {
    var key = f.pop();
    var val = f.pop();
    var d = f.peek();
    d.set(key, val);
}
optable[opcodes.SETUP_LOOP] = function(f: Py_FrameObject) {
    var delta = f.readArg();
    // push a block to the block stack
    var stackSize = f.stack.length;
    var loopPos = f.lastInst;
    f.blockStack.push([stackSize, loopPos, loopPos+delta]);
}

optable[opcodes.POP_BLOCK] = function(f: Py_FrameObject) {
    // removes a block from the block stack
    f.blockStack.pop();
}

optable[opcodes.GET_ITER] = function(f: Py_FrameObject) {
    // replace TOS with iter(TOS)
    var tos = f.pop();
    f.push(builtins.iter([tos],{}));
}

optable[opcodes.FOR_ITER] = function(f: Py_FrameObject) {
    // calls next() on the iter object at TOS
    var delta = f.readArg();
    var iter = f.peek();
    var res = iter.next();
    if (res != null) {
        f.push(res);
    } else {
        f.pop();
        f.lastInst += delta;
    }
}

optable[opcodes.IMPORT_NAME] = function(f: Py_FrameObject) {
    var name_idx = f.readArg();
    // see https://docs.python.org/2/library/functions.html#__import__
    var fromlist = f.pop();
    var level = f.pop().toNumber();
    var name = f.codeObj.names[name_idx];
    var mod;
    // TODO: implement this. For now, we no-op.
    // mod = builtins.__import__(name, f.globals, f.locals, fromlist, level)
    f.push(mod);
}

optable[opcodes.IMPORT_FROM] = function(f: Py_FrameObject) {
    var name_idx = f.readArg();
    var mod = f.pop();
    var attr;
    // TODO: implement this. For now, we no-op.
    // attr = mod.codeObj.names[name_idx]
    f.push(attr);
}
export = optable;
