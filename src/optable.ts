/// <reference path="../bower_components/DefinitelyTyped/node/node.d.ts" />
import {True, False, None, Py_Int, Py_Slice, Py_Str} from './primitives';
import {Iterator, Iterable, IPy_Object, IPy_Function} from './interfaces';
import {Py_List, Py_Tuple, Py_Set, Py_Dict} from './collections';
import {ThreadStatus} from './enums';
import os = require('os');
import Py_FrameObject = require('./frameobject');
// XXX: Prevent a circular reference. Use this only for type info.
import _Py_FuncObject = require('./funcobject');
import _Py_GeneratorObject = require('./genobject');
var Py_FuncObject: typeof _Py_FuncObject = null;
var Py_GeneratorObject: typeof _Py_GeneratorObject = null;
// XXX: hack around name resoltion in eval'd code
var hardcoded_Py_Dict = Py_Dict;
var hardcoded_ThreadStatus = ThreadStatus;
import opcodes = require('./opcodes');
import builtins = require('./builtins');
import Py_CodeObject = require('./codeobject');
import Py_Cell = require('./cell');
import {Thread} from './threading';
import nativefuncobject = require('./nativefuncobject')
const NotImplemented = builtins.$NotImplemented;

// XXX: Copy+paste of builtins.bool.
function bool(x: IPy_Object): typeof True {
  if (typeof(x) === 'object' && x.asBool) {
    return x.asBool() ? True : False;
  }
  return True;
}

/**
 * Big mapping from opcode enum to function.
 *
 * General implementation notes:
 * - Built-in types cannot have their default implementations of opcode functions overwritten.
 *   e.g. dict().__setitem__ = newFunc is ILLEGAL and causes a runtime exception.
 *   Thus, the synchronous case is *first* in all opcodes.
 *
 * - When we support classes, we should prevent user classes from inheriting default implementations.
 */
const optable: { [op: number]: (f: Py_FrameObject, t: Thread)=>void } = {};

/**
 * Generates simple unary opcodes.
 */
function generateUnaryOpcode(funcName: string): (f: Py_FrameObject, t: Thread) => void {
    return eval(`
function UNARY${funcName}(f, t) {
    var a = f.pop();
    if (a.${funcName}) {
        f.push(a.${funcName}());
    } else if (a.$${funcName}) {
        f.returnToThread = true;
        a.$${funcName}.exec(t, f, [], new hardcoded_Py_Dict());
    } else {
        throw new Error("Object lacks a ${funcName} function.");
    }
}
UNARY${funcName}`); // <-- Last statement w/o semicolon is return value of eval.
}

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

optable[opcodes.UNARY_POSITIVE] = generateUnaryOpcode('__pos__');
optable[opcodes.UNARY_NEGATIVE] = generateUnaryOpcode('__neg__');

optable[opcodes.UNARY_NOT] = function(f: Py_FrameObject) {
    var a = f.pop();
    f.push(bool(a) === True ? False : True);
}

optable[opcodes.UNARY_CONVERT] = generateUnaryOpcode('__repr__');
optable[opcodes.UNARY_INVERT] = generateUnaryOpcode('__invert__');

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
function generateBinaryOp(funcName: string, inplace: boolean, reversible: boolean): (f: Py_FrameObject, t: Thread) => void {
    return eval(`
function BINARY_${funcName}(f, t) {
    var b = f.pop(), a = f.${inplace ? 'peek' : 'pop'}(), res;
    ${inplace ? `
    if (a['__i${funcName}__']) {
        a.__i${funcName}__(b);
        return;
    } else if (a['$__i${funcName}__'] !== undefined) {
        f.returnToThread = true;
        a['$__i${funcName}__'].exec(t, f, [b], new hardcoded_Py_Dict());
        return;
    }
    f.pop();
    ` : ''}

    if (a['__${funcName}__']) {
        f.push(a.__${funcName}__(t,b));
        return;
    } else if (a['$__${funcName}__']) {
        f.returnToThread = true;
        a['$__${funcName}__'].exec_from_native(t, f, [b], new hardcoded_Py_Dict(), function(res) {
            if (res == NotImplemented) {
                ${reversible ? `
                if (b['__r${funcName}__']) {
                    f.push(b.__r${funcName}__(a));
                    t.setStatus(hardcoded_ThreadStatus.RUNNABLE);
                } else if (b['$__r${funcName}__']) {
                    b['$__r${funcName}__'].exec_from_native(t, f, [a], new hardcoded_Py_Dict(), function(res) {
                        if (res == NotImplemented) {
                            throw new Error('TypeError: cannot __$r${funcName}__.');
                        }
                        f.push(res);
                        t.setStatus(hardcoded_ThreadStatus.RUNNABLE);
                    });
                } else {
                   throw new Error('TypeError: cannot __r${funcName}__.');
                }
                ` : `throw new Error('TypeError: cannot __r${funcName}__.');`}
            } else {
                f.push(res);
                t.setStatus(hardcoded_ThreadStatus.RUNNABLE);
            }
        });
    } else {
        throw new Error("TypeError: cannot __${funcName}__");
    }
}
BINARY_${funcName}`);
}

optable[opcodes.BINARY_POWER] = generateBinaryOp('pow', false, true);
optable[opcodes.INPLACE_POWER] = generateBinaryOp('pow', true, true);
optable[opcodes.BINARY_MULTIPLY] = generateBinaryOp('mul', false, true);
optable[opcodes.INPLACE_MULTIPLY] = generateBinaryOp('mul', true, true);
optable[opcodes.BINARY_DIVIDE] = generateBinaryOp('div', false, true);
optable[opcodes.INPLACE_DIVIDE] = generateBinaryOp('div', true, true);
optable[opcodes.BINARY_MODULO] = generateBinaryOp('mod', false, true);
optable[opcodes.INPLACE_MODULO] = generateBinaryOp('mod', true, true);
optable[opcodes.BINARY_ADD] = generateBinaryOp('add', false, true);
optable[opcodes.INPLACE_ADD] = generateBinaryOp('add', true, true);
optable[opcodes.BINARY_SUBTRACT] = generateBinaryOp('sub', false, true);
optable[opcodes.INPLACE_SUBTRACT] = generateBinaryOp('sub', true, true);
optable[opcodes.BINARY_FLOOR_DIVIDE] = generateBinaryOp('floordiv', false, true);
optable[opcodes.INPLACE_FLOOR_DIVIDE] = generateBinaryOp('floordiv', true, true);
optable[opcodes.BINARY_TRUE_DIVIDE] = generateBinaryOp('truediv', false, true);
optable[opcodes.INPLACE_TRUE_DIVIDE] = generateBinaryOp('truediv', true, true);
optable[opcodes.BINARY_LSHIFT] = generateBinaryOp('lshift', false, true);
optable[opcodes.INPLACE_LSHIFT] = generateBinaryOp('lshift', true, true);
optable[opcodes.BINARY_RSHIFT] = generateBinaryOp('rshift', false, true);
optable[opcodes.INPLACE_RSHIFT] = generateBinaryOp('rshift', true, true);
optable[opcodes.BINARY_AND] = generateBinaryOp('and', false, true);
optable[opcodes.INPLACE_AND] = generateBinaryOp('and', true, true);
optable[opcodes.BINARY_XOR] = generateBinaryOp('xor', false, true);
optable[opcodes.INPLACE_XOR] = generateBinaryOp('xor', true, true);
optable[opcodes.BINARY_OR] = generateBinaryOp('or', false, true);
optable[opcodes.INPLACE_OR] = generateBinaryOp('or', true, true);

optable[opcodes.BINARY_SUBSCR] = generateBinaryOp('getitem', false, false);

optable[opcodes.PRINT_ITEM] = function(f: Py_FrameObject, t: Thread) {
    var a = f.pop();
    // see https://docs.python.org/2/reference/simple_stmts.html#print
    if (f.shouldWriteSpace) {
        process.stdout.write(' ');
    }
    if (a.__str__) {
        var s = a.__str__().toString(),
          lastChar = s.slice(-1);
        process.stdout.write(s);
        f.shouldWriteSpace = (lastChar != '\t' && lastChar != '\n');
    } else if (a.$__str__) {
        f.returnToThread = true;
        a.$__str__.exec_from_native(t, f, [], new Py_Dict(), (str: Py_Str) => {
            var s: string = str.toString();
            process.stdout.write(s);
            var lastChar = s.slice(-1);
            f.shouldWriteSpace = (lastChar != '\t' && lastChar != '\n');
            t.setStatus(ThreadStatus.RUNNABLE);
        });
    }
}

optable[opcodes.PRINT_NEWLINE] = function(f: Py_FrameObject) {
    process.stdout.write("\n");
    f.shouldWriteSpace = false;
}

optable[opcodes.RETURN_VALUE] = function(f: Py_FrameObject, t: Thread) {
    // If a generator frame is exhausted, we raise StopIteration exception
    // StopIteration exceptions generated by generators inside a for loop are ALWAYS caught
    // So we set up an EXCEPT_HANDLER, AFTER a generator has been exhausted, and then raise StopIteration which is immediately caught
    if (f.genFrame) {
        f.genFrame = false;

        // If generator was called inside a loop,  
        // TODO: Find a better way of handling StopIteration exception
        if (t.loop_exc_block.length > 0) {
            (<Py_FrameObject>f.back).blockStack.push(t.loop_exc_block.pop());
        }
        f.raise_exception_here(t, "", "StopIteration");
    }
    else {
        t.asyncReturn(f.pop());
    }
    f.returnToThread = true;
}

optable[opcodes.STORE_NAME] = function(f: Py_FrameObject) {
    var i = f.readArg();
    var val = f.pop();
    var name = f.codeObj.names[i];
    f.locals.set(name, val);
}

optable[opcodes.DELETE_NAME] = function(f: Py_FrameObject) {
    var i = f.readArg();
    var name = f.codeObj.names[i];
    f.locals.del(name);
}

optable[opcodes.STORE_ATTR] = function(f: Py_FrameObject) {
    var i = f.readArg();
    var obj = f.pop();
    var attr = f.pop();
    var name = f.codeObj.names[i];
    // TODO: use __setattr__ here
    (<any> obj)[`$${name.toString()}`] = attr;
}

optable[opcodes.DELETE_ATTR] = function(f: Py_FrameObject) {
    var i = f.readArg();
    var obj = f.pop();
    var name = f.codeObj.names[i];
    // TODO: use __delattr__ here
    delete (<any> obj)[`$${name.toString()}`];
}

optable[opcodes.UNPACK_SEQUENCE] = function(f: Py_FrameObject, t: Thread) {
    var val = f.pop(), i: number = f.readArg() - 1;
    if (i < 0) {
        // Not sure if possible, but guard against the possibility.
        // Would cause issues in async case.
        return;
    }

    if (val.__getitem__) {
        for (; i >= 0; i--) {
            f.push(val.__getitem__(t, new Py_Int(i)));
        } 
    } else if (val.$__getitem__) {
        // Pop from stack, and reverse the order of elements, and push back into stack
        // e.g. 1 2 3 -> 3 2 1
        function processNext() {
            if (i >= 0) {
                val.$__getitem__.exec_from_native(t, f, [new Py_Int(i--)], new Py_Dict(), (res: IPy_Object) => {
                    f.push(res);
                    processNext();
                });
            } else {
                t.setStatus(ThreadStatus.RUNNABLE);
            }
        }
        f.returnToThread = true;
        processNext();
    } else {
        throw new Error("Expected a list or tuple type.");
    }
}

optable[opcodes.STORE_GLOBAL] = function(f: Py_FrameObject) {
    var i = f.readArg();
    var val = f.pop();
    var name = f.codeObj.names[i];
    f.globals.set(name, val);
}

optable[opcodes.DELETE_GLOBAL] = function(f: Py_FrameObject) {
    var i = f.readArg();
    var name = f.codeObj.names[i];
    f.globals.del(name);
}

optable[opcodes.LOAD_CONST] = function(f: Py_FrameObject) {
    var i = f.readArg();
    f.push(f.codeObj.consts[i]);
}

optable[opcodes.LOAD_NAME] = function(f: Py_FrameObject, t: Thread) {
    var i = f.readArg();
    var name = f.codeObj.names[i];
    var val = f.locals.get(name) || f.globals.get(name) || (<any> builtins)[`$${name.toString()}`];
    // throw NameError
    if (val === undefined) {
        var message = `global name '${name}' is not defined`;
        f.raise_exception_here(t, message, "NameError");
        return;
    }
    f.push(val);
}

optable[opcodes.LOAD_GLOBAL] = function(f: Py_FrameObject, t: Thread) {
    var i = f.readArg();
    var name = f.codeObj.names[i];
    var val = f.globals.get(name) || (<any> builtins)[`$${name.toString()}`];
    // throw NameError
    if (val === undefined) {
        var message = `global name '${name}' is not defined`;
        f.raise_exception_here(t, message, "NameError");
        return;
    }
    f.push(val);
}

optable[opcodes.LOAD_DEREF] = function(f: Py_FrameObject) {
    var i = f.readArg();
    f.push(f.getDeref(i).ob_ref);
}

optable[opcodes.STORE_DEREF] = function(f: Py_FrameObject) {
    var i = f.readArg();
    var obj = f.pop();
    f.env[i].ob_ref = obj;
}

optable[opcodes.LOAD_CLOSURE] = function(f: Py_FrameObject) {
    var i = f.readArg();
    f.push(f.getDeref(i));
}

enum ComparisonOp {
    LT = 0,
    LTE = 1,
    EQ = 2,
    NEQ = 3,
    GT = 4,
    GTE = 5,
    IN = 6,
    NOT_IN = 7,
    IS = 8,
    IS_NOT = 9,
    EXC_MATCH = 10
}

optable[opcodes.COMPARE_OP] = function(f: Py_FrameObject, t: Thread) {
    var op = <ComparisonOp> f.readArg();
    var b = f.pop();
    var a = f.pop();
    switch (op) {
        case ComparisonOp.LT:
            doCmpOp(t, f, a, b, '__lt__', '__gt__');
            break;
        case ComparisonOp.LTE:
            doCmpOp(t, f, a, b, '__le__', '__ge__');
            break;
        case ComparisonOp.EQ:
            doCmpOp(t, f, a, b, '__eq__', '__eq__');
            break;
        case ComparisonOp.NEQ:
            doCmpOp(t, f, a, b, '__ne__', '__ne__');
            break;
        case ComparisonOp.GT:
            doCmpOp(t, f, a, b, '__gt__', '__lt__');
            break;
        case ComparisonOp.GTE:
            doCmpOp(t, f, a, b, '__gte__', '__lte__');
            break;
        case ComparisonOp.IN:
            doCmpOp(t, f, b, a, '__contains__', null);
            break;
        case ComparisonOp.NOT_IN:
            doCmpOp(t, f, b, a, '__contains__', null);
            f.push(bool(f.pop()) === True ? False : True);
            break;
        case ComparisonOp.IS:
            // TODO: Python does pointer comparison.
            // Does this mean IS fails for integers...???
            // https://github.com/python/cpython/blob/2.7/Python/ceval.c#L4786
            f.push(a.hash() === b.hash() ? True : False);
            break;
        case ComparisonOp.IS_NOT:
            f.push(a.hash() !== b.hash() ? True : False);
            break;
        case ComparisonOp.EXC_MATCH:
            a = t.exc;
            var x = builtins.isinstance(t, f, [a, b], null);
            f.push(x);
            if (x == False) {
                t.throwException(a);
            }
            break;
        // case 'exception match':
        //     throw new Error("Python Exceptions are not supported");
        default:
            throw new Error("Unknown or unsupported comparison operator: "+op);
    }
}

function doCmpOp(t: Thread, f: Py_FrameObject, a: IPy_Object, b: IPy_Object, funcA: string, funcB: string) {
    if ((<any> a)[funcA]) {
        f.push((<(b: IPy_Object) => IPy_Object> (<any> a)[funcA])(b));
        return
    }
    if ((<any> a)[`$${funcA}`]) {
        var py_fn: IPy_Function = (<any> a)[`$${funcA}`]
        f.returnToThread = true;
        py_fn.exec_from_native(t, f, [a, b], new Py_Dict(), (res: IPy_Object) => {
            if (res != NotImplemented || funcB === null)
                return;
            if ((<any> b)[funcB]) {
                f.push((<(a: IPy_Object) => IPy_Object> (<any> b)[funcB])(a));
                t.setStatus(ThreadStatus.RUNNABLE);
            } else if ((<any> b)[`$${funcB}`]) {
                var py_fn: IPy_Function = (<any> b)[`$${funcB}`];
                py_fn.exec_from_native(t, f, [b, a], new Py_Dict(), (res: IPy_Object) => {
                    f.push(res);
                    t.setStatus(ThreadStatus.RUNNABLE);
                });
            } else {
                throw new Error(`Object lacks ${funcB} property.`);
            }
        });
        return
    }
    throw new Error(`Object lacks ${funcA} property.`);
}

optable[opcodes.JUMP_FORWARD] = function(f: Py_FrameObject) {
    var delta = f.readArg();
    f.lastInst += delta
}

optable[opcodes.JUMP_IF_FALSE_OR_POP] = function(f: Py_FrameObject) {
    var target = f.readArg();
    if (bool(f.peek()) === True) {
        f.pop();
    } else {
        f.lastInst = target-1;
    }
}

optable[opcodes.JUMP_IF_TRUE_OR_POP] = function(f: Py_FrameObject) {
    var target = f.readArg();
    if (bool(f.peek()) === True) {
        f.lastInst = target - 1;
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

    if (bool(f.pop()) === False) {
        f.lastInst = target - 1;
    }
}

optable[opcodes.POP_JUMP_IF_TRUE] = function(f: Py_FrameObject) {
    var target = f.readArg();
    if (bool(f.pop()) === True) {
        f.lastInst = target - 1;
    }
}

optable[opcodes.LOAD_FAST] = function(f: Py_FrameObject) {
    var i = f.readArg();
    var name = f.codeObj.varnames[i];
    f.push(f.locals.get(name));
}

optable[opcodes.STORE_FAST] = function(f: Py_FrameObject) {
    var i = f.readArg();
    var val = f.pop();
    f.locals.set(f.codeObj.varnames[i], val);
}

optable[opcodes.DELETE_FAST] = function(f: Py_FrameObject) {
    var i = f.readArg();
    f.locals.del(f.codeObj.varnames[i]);
}

function add_exc(f: Py_FrameObject, t: Thread, exc: any, message: string): void {
    // was empty sting before
    t.tb.exc_value = message;
    exc.$message = new Py_Str(message + os.EOL);
    t.addToTraceback(exc.$message);
    f.push(exc);
    t.throwException(exc);
}

// push exceptions on stack
function do_raise(f: Py_FrameObject, t: Thread, cause: IPy_Object, exc: any): void {
    var val: any = null;
    var message: string = "";
    // raise with 0 arg is from Exception class
    if (exc === null && cause === null) {
        val = builtins['$Exception'];
        t.tb.exc_type = `<type 'exceptions.Exception'>`;
        message += "TypeError: exceptions must be old-style classes or derived from BaseException, not NoneType";
        add_exc(f, t, val, message);
        return;
    }
    // First argument exc, second argument cause (passed into exception and used as a message when printing tb)
    message += exc.constructor.name;
    // t.tb.exc_type = "<type 'exceptions." + exc.constructor.name + "'>";
    t.tb.exc_type = exc.constructor.name;
    if (exc && cause) {
        message += ": " + <Py_Str> cause;
        // check if user defined class
        val = (<any> builtins)[`$${exc.constructor.name}`]; 
        if (!val)
            message = "__main__." + message;
    }
    if (exc) {
        add_exc(f, t, exc, message);
    }
}
optable[opcodes.RAISE_VARARGS] = function(f: Py_FrameObject, t:Thread) {
    t.clearTraceback();
    var i = f.readArg();
    var cause: IPy_Object = null, exc: any = null;
    switch (i) {
        case 2:
            cause = f.pop();
        case 1:
            exc = f.pop();
        case 0:
            do_raise(f, t, cause, exc);
            break;
        default:
            throw new Error("bad RAISE_VARARGS oparg")
            break;
    }
}

// Helper function for all the CALL_FUNCTION* opcodes
function call_func(f: Py_FrameObject, t: Thread, has_kw: boolean, has_varargs: boolean) {
    var x = f.readArg();
    var num_args = x & 0xff;
    var num_kwargs = (x >> 8) & 0xff;
    var args: IPy_Object[] = new Array(num_args);
    var kwargs: Py_Dict = has_kw ? (<Py_Dict> f.pop()).clone() : new Py_Dict();

    if (has_varargs) {
        var varargs = (<Py_Tuple> f.pop()).toArray();
    }

    for (var i = 0; i < num_kwargs; i++) {
        var val = f.pop();
        var key = f.pop();
        kwargs.set(key, val);
    }

    // positional args come in backwards (stack) order
    for (var i = num_args-1; i >= 0; i--) {
        args[i] = f.pop();
    }

    if (has_varargs) {
        args = args.concat(varargs);
    }

    var func = f.pop();

    // Hack for class objects, which are callable.
    if (!(<any> func)['exec'] && (<any> func)['$__call__']) {
        func = (<any> func).$__call__;
    }

    initPyFuncObj();
    if (func instanceof Py_GeneratorObject) {
        // This sets up the frame, but doesn't run the code.
        (<IPy_Function> func).exec(t, f, args, kwargs);
        return f.push(func);
    }

    f.returnToThread = true;
    (<IPy_Function> func).exec(t, f, args, kwargs);
}

optable[opcodes.CALL_FUNCTION] = function(f: Py_FrameObject, t: Thread) {
    call_func(f, t, false, false);
}

optable[opcodes.CALL_FUNCTION_VAR] = function(f: Py_FrameObject, t: Thread) {
    call_func(f, t, false, true);
}

optable[opcodes.CALL_FUNCTION_KW] = function(f: Py_FrameObject, t: Thread) {
    call_func(f, t, true, false);
}

optable[opcodes.CALL_FUNCTION_VAR_KW] = function(f: Py_FrameObject, t: Thread) {
    call_func(f, t, true, true);
}

// XXX: Hack around circular reference.
function initPyFuncObj() {
    if (Py_FuncObject === null) {
        Py_FuncObject = require('./funcobject');
        Py_GeneratorObject = require('./genobject');
    }
}

optable[opcodes.MAKE_FUNCTION] = function(f: Py_FrameObject) {
    var numDefault = f.readArg(),
      defaults = new Py_Dict();

    var code = <Py_CodeObject> f.pop();
    for (var i = code.argcount-1; i >= code.argcount - numDefault; i--) {
        defaults.set(code.varnames[i], f.pop());
    }

    initPyFuncObj();
    var func: IPy_Function;
    if (code.isGenerator()) {
        func = new Py_GeneratorObject(code, f.globals, defaults, code.name);
    } else {
        func = new Py_FuncObject(code, f.globals, defaults, code.name);
    }
    f.push(func);
}

optable[opcodes.MAKE_CLOSURE] = function(f: Py_FrameObject) {
    var numDefault = f.readArg();
    var defaults = new Py_Dict();

    var code = <Py_CodeObject> f.pop();
    var freevars = <Py_Tuple> f.pop();
    for (var i = code.argcount-1; i >= code.argcount - numDefault; i--) {
        defaults.set(code.varnames[i], f.pop());
    }

    initPyFuncObj();
    var func = new Py_FuncObject(code, f.globals, defaults, code.name);
    func.closure = freevars;
    f.push(func);
}

optable[opcodes.DUP_TOP] = function(f: Py_FrameObject) {
    f.push(f.peek());
}

optable[opcodes.NOP] = function(f: Py_FrameObject) {}

optable[opcodes.SLICE_0] = function(f: Py_FrameObject, t: Thread) {
    var a = f.pop();
    if (a.__getitem__) {
        // Assumption: types with __getitem__ also have __len__.
        f.push(a.__getitem__(t, new Py_Slice(new Py_Int(0), a.__len__(), None)));
    } else if (a.$__getitem__ && a.$__len__) {
        f.returnToThread = true;
        a.$__len__.exec_from_native(t, f, [], new Py_Dict(), (rv: IPy_Object) => {
            a.$__getitem__.exec_from_native(t, f, [new Py_Slice(new Py_Int(0), rv, None)], new Py_Dict(), (rv: IPy_Object) => {
                f.push(rv);
                t.setStatus(ThreadStatus.RUNNABLE);
            });
        });
    } else {
        throw new Error("Unsupported type.");
    }
}

optable[opcodes.SLICE_1] = function(f: Py_FrameObject, t: Thread) {
    var b = f.pop();
    var a = f.pop();
    if (a.__getitem__) {
        f.push(a.__getitem__(t, new Py_Slice(b, a.__len__(), None)));
    } else if (a.$__getitem__ && a.$__len__) {
        f.returnToThread = true;
        a.$__len__.exec_from_native(t, f, [], new Py_Dict(), (rv: IPy_Object) => {
            a.$__getitem__.exec_from_native(t, f, [new Py_Slice(b, rv, None)], new Py_Dict(), (rv: IPy_Object) => {
                f.push(rv);
                t.setStatus(ThreadStatus.RUNNABLE);
            });
        });
    } else {
        throw new Error("Unsupported type.");
    }
}

optable[opcodes.SLICE_2] = function(f: Py_FrameObject, t: Thread) {
    var b = f.pop();
    var a = f.pop();
    if (a.__getitem__) {
        f.push(a.__getitem__(t, new Py_Slice(new Py_Int(0), b, None)));
    } else if (a.$__getitem__) {
        f.returnToThread = true;
        a.$__getitem__.exec(t, f, [new Py_Slice(new Py_Int(0), b, None)], new Py_Dict());
    } else {
        throw new Error(`TypeError: ${b} does not support __getitem__`);
    }
}

optable[opcodes.SLICE_3] = function(f: Py_FrameObject, t: Thread) {
    var a = f.pop();
    var b = f.pop();
    var c = f.pop();
    if (c.__getitem__) {
        f.push(c.__getitem__(t, new Py_Slice(b, a, None)));
    } else if (c.$__getitem__) {
        f.returnToThread = true;
        c.$__getitem__.exec(t, f, [new Py_Slice(b, a, None)], new Py_Dict());
    } else {
        throw new Error(`TypeError: ${b} does not support __getitem__`);
    }
}

optable[opcodes.STORE_SLICE_0] = function(f: Py_FrameObject, t: Thread) {
    var seq = f.pop();
    var value = f.pop();
    if (seq.__setitem__) {
        seq.__setitem__(t, new Py_Slice(None, None, None), value);
    } else if (seq.$__setitem__) {
        f.returnToThread = true;
        seq.$__setitem__.exec(t, f, [new Py_Slice(None, None, None), value], new Py_Dict());
    } else {
        throw new Error(`TypeError: ${seq} does not support __setitem__`);
    }
}

optable[opcodes.STORE_SLICE_1] = function(f: Py_FrameObject, t: Thread) {
    var start = f.pop();
    var seq = f.pop();
    var value = f.pop();
    if (seq.__setitem__) {
        seq.__setitem__(t, new Py_Slice(start, None, None), value);
    } else if (seq.$__setitem__) {
        f.returnToThread = true;
        seq.$__setitem__.exec(t, f, [new Py_Slice(start, None, None), value], new Py_Dict());
    } else {
        throw new Error(`TypeError: ${seq} does not support __setitem__`);
    }
}

optable[opcodes.STORE_SLICE_2] = function(f: Py_FrameObject, t: Thread) {
    var end = f.pop();
    var seq = f.pop();
    var value = f.pop();
    if (seq.__setitem__) {
        seq.__setitem__(t, new Py_Slice(None, end, None), value);
    } else if (seq.$__setitem__) {
        f.returnToThread = true;
        seq.$__setitem__.exec(t, f, [new Py_Slice(None, end, None), value], new Py_Dict());
    } else {
        throw new Error(`TypeError: ${seq} does not support __setitem__`);
    }
}

optable[opcodes.STORE_SLICE_3] = function(f: Py_FrameObject, t: Thread) {
    var end = f.pop();
    var start = f.pop();
    var seq = f.pop();
    var value = f.pop();
    if (seq.__setitem__) {
        seq.__setitem__(t, new Py_Slice(start, end, None), value);
    } else if (seq.$__setitem__) {
        f.returnToThread = true;
        seq.$__setitem__.exec(t, f, [new Py_Slice(start, end, None), value], new Py_Dict());
    } else {
        throw new Error(`TypeError: ${seq} does not support __setitem__`);
    }
}

optable[opcodes.DELETE_SLICE_0] = function(f: Py_FrameObject, t: Thread) {
    var seq = f.pop();
    if (seq.__delitem__) {
        seq.__delitem__(t, new Py_Slice(None, None, None));
    } else if (seq.$__delitem__) {
        f.returnToThread = true;
        seq.$__delitem__.exec(t, f, [new Py_Slice(None, None, None)], new Py_Dict());
    } else {
        throw new Error(`TypeError: ${seq} does not support __delitem__`);
    }
}

optable[opcodes.DELETE_SLICE_1] = function(f: Py_FrameObject, t: Thread) {
    var start = f.pop();
    var seq = f.pop();
    if (seq.__delitem__) {
        seq.__delitem__(t, new Py_Slice(start, None, None));
    } else if (seq.$__delitem__) {
        f.returnToThread = true;
        seq.$__delitem__.exec(t, f, [new Py_Slice(start, None, None)], new Py_Dict());
    } else {
        throw new Error(`TypeError: ${seq} does not support __delitem__`);
    }
}

optable[opcodes.DELETE_SLICE_2] = function(f: Py_FrameObject, t: Thread) {
    var end = f.pop();
    var seq = f.pop();
    if (seq.__delitem__) {
        seq.__delitem__(t, new Py_Slice(None, end, None));
    } else if (seq.$__delitem__) {
        f.returnToThread = true;
        seq.$__delitem__.exec(t, f, [new Py_Slice(None, end, None)], new Py_Dict());
    } else {
        throw new Error(`TypeError: ${seq} does not support __delitem__`);
    }
}

optable[opcodes.DELETE_SLICE_3] = function(f: Py_FrameObject, t: Thread) {
    var end = f.pop();
    var start = f.pop();
    var seq = f.pop();
    if (seq.__delitem__) {
        seq.__delitem__(t, new Py_Slice(start, end, None));
    } else if (seq.$__delitem__) {
        f.returnToThread = true;
        seq.$__delitem__.exec(t, f, [new Py_Slice(start, end, None)], new Py_Dict());
    } else {
        throw new Error(`TypeError: ${seq} does not support __delitem__`);
    }
}


// TODO: more testing
optable[opcodes.STORE_SUBSCR] = function(f: Py_FrameObject, t: Thread) {
    var key = f.pop();
    var obj = f.pop();
    var value = f.pop();
    if (obj.__setitem__) {
        obj.__setitem__(t, key, value);
    } else if (obj.$__setitem__) {
        f.returnToThread = true;
        obj.$__setitem__.exec(t, f, [key, value], new Py_Dict());
    } else {
        throw new Error("Unsupported type.");
    }
}

// TODO: more testing
optable[opcodes.DELETE_SUBSCR] = function(f: Py_FrameObject, t: Thread) {
    var key = f.pop();
    var obj = f.pop();
    if (obj.__delitem__) {
        obj.__delitem__(t, key);
    } else if (obj.$__delitem__) {
        f.returnToThread = true;
        obj.$__delitem__.exec(t, f, [key], new Py_Dict());
    } else {
        throw new Error("Unsupported type.");
    }
}

optable[opcodes.BUILD_TUPLE] = function(f: Py_FrameObject) {
    var count = f.readArg();
    var l = new Array(count);
    for (var i = count-1; i >= 0; i--){
        l[i] = f.pop();
    }
    f.push(new Py_Tuple(l));
}

optable[opcodes.BUILD_LIST] = function(f: Py_FrameObject) {
    var count = f.readArg();
    var l = new Array(count);
    for (var i = count-1; i >= 0; i--){
        l[i] = f.pop();
    }
    f.push(new Py_List(l));
}

optable[opcodes.BUILD_SET] = function(f: Py_FrameObject) {
    var count = f.readArg();
    var l = new Array(count);
    for (var i = count-1; i >= 0; i--){
        l[i] = f.pop();
    }
    // XXX: not the smartest way to build a set...
    f.push(Py_Set.fromIterable(new Py_List(l)));
}

optable[opcodes.BUILD_MAP] = function(f: Py_FrameObject, t: Thread) {
    var count = f.readArg();
    var d = builtins.dict(t, f, [], new Py_Dict());
    f.push(d);
}

optable[opcodes.STORE_MAP] = function(f: Py_FrameObject) {
    var key = f.pop();
    var val = f.pop();
    var d = <Py_Dict> f.peek();
    d.set(key, val);
}

function setup_block(f: Py_FrameObject, t: Thread, op: number) {
    var delta = f.readArg();
    // push a block to the block stack
    var stackSize = f.stack.length;
    var loopPos = f.lastInst;
    f.blockStack.push([stackSize, loopPos, loopPos+delta, op]);

    // For handling StopIteration exceptions inside of for loops, generated by exhausted generators
    if (op === opcodes.SETUP_LOOP) {
        t.loop_exc_block.push([stackSize, loopPos, loopPos + delta, opcodes.SETUP_EXCEPT]);
    }
}

optable[opcodes.SETUP_LOOP] = (f: Py_FrameObject, t:Thread) => setup_block(f, t, opcodes.SETUP_LOOP);
optable[opcodes.SETUP_EXCEPT] = (f: Py_FrameObject, t:Thread) => setup_block(f, t, opcodes.SETUP_EXCEPT);
optable[opcodes.SETUP_FINALLY] = (f: Py_FrameObject, t:Thread) => setup_block(f, t, opcodes.SETUP_FINALLY);

optable[opcodes.BREAK_LOOP] = function(f: Py_FrameObject) {
    var b = f.blockStack.pop();
    // Entries are [stackSize, startPos, endPos] tuples.
    var stackSize: number = b[0];
    var endPos: number = b[2];
    // unwind the stack to clear loop variables
    f.stack.splice(stackSize, f.stack.length - stackSize);
    // jump to the end of the loop
    f.lastInst = endPos;
}

optable[opcodes.CONTINUE_LOOP] = function(f: Py_FrameObject) {
    var target = f.readArg();
    var b = f.blockStack[f.blockStack.length-1];
    if (b[1] === target) {
        // we continue back to the loop start
        f.lastInst = target-1;
    } else {
        // unwind and jump to block end (as with BREAK_LOOP, but doesn't pop)
        f.stack.splice(b[0], f.stack.length - b[0]);
        f.lastInst = b[2];
    }
}

optable[opcodes.SET_ADD] = function(f: Py_FrameObject, t: Thread) {
    var i = f.readArg();
    var x = f.pop();
    var set = <Py_Set> f.stack[f.stack.length - i];
    set.add(x);
}

optable[opcodes.LIST_APPEND] = function(f: Py_FrameObject) {
    var i = f.readArg();
    var x = f.pop();
    var lst = <Py_List> f.stack[f.stack.length - i];
    lst.append(x);
}

optable[opcodes.MAP_ADD] = function(f: Py_FrameObject, t: Thread) {
    var i = f.readArg();
    var key = f.pop();
    var val = f.pop();
    var dict = <Py_Dict> f.stack[f.stack.length - i];
    dict.set(key, val);
}

optable[opcodes.END_FINALLY] = function(f: Py_FrameObject, t: Thread) {
    // TODO: The interpreter recalls whether the exception has to be re-raised,
    // or whether the function returns, and continues with the outer-next block.
    // As of now, we always assume that no exception needs to be re-raised.
    f.blockStack.pop();
}

optable[opcodes.POP_BLOCK] = function(f: Py_FrameObject) {
    // removes a block from the block stack
    f.blockStack.pop();
}

optable[opcodes.GET_ITER] = function(f: Py_FrameObject, t: Thread) {
    // replace TOS with iter(TOS)
    var tos = f.pop();
    f.push(builtins.iter(t, f, [tos], new Py_Dict()));
}

optable[opcodes.FOR_ITER] = function(f: Py_FrameObject, t: Thread) {
    var delta = f.readArg();
    var iter = <Iterator> f.peek();
    // Calls $__next__() if it exists, otherwise, next() on the iterator
    if (iter.$__next__) {
        iter.$__next__.exec_from_native(t, f, [], new Py_Dict(), (rv: IPy_Object) => {
            t.setStatus(ThreadStatus.RUNNABLE);
        });
        f.returnToThread = true;
    }
    else {
        var res = iter.next();
        if (res != null) {
            f.push(res);
        } else {
            f.pop();
            f.lastInst += delta;
        }
    }
}

optable[opcodes.YIELD_VALUE] = function(f: Py_FrameObject, t: Thread) {
    var res = f.peek();
    // Push on calling frame's stack
    t.asyncReturn(res);
    f.cb(res);
    f.returnToThread = true;
}

optable[opcodes.IMPORT_NAME] = function(f: Py_FrameObject, t: Thread) {
    var name_idx = f.readArg();
    // see https://docs.python.org/2/library/functions.html#__import__
    var fromlist = f.pop();
    var level = f.pop();
    var name = f.codeObj.names[name_idx];
    f.returnToThread = true;
    builtins.$__import__.exec(t, f, [name, f.globals, f.locals, fromlist, level], new Py_Dict());
}

optable[opcodes.IMPORT_FROM] = function(f: Py_FrameObject) {
    var name_idx = f.readArg();
    // Don't pop it off.
    var mod = f.peek();
    var name = f.codeObj.names[name_idx];
    f.push((<any> mod)[`$${name}`]);
}

optable[opcodes.IMPORT_STAR] = function(f: Py_FrameObject) {
    // pop the just-imported module
    var mod = f.pop();
    // Add names not starting with _ to locals
    var key: any, py_key: Py_Str;
    for (var key in mod) {
        if (key.length > 1 && key[0] == '$' && key[1] != '_') {
            // strip off the leading $
            py_key = new Py_Str(key.slice(1));
            f.locals.set(py_key, (<any> mod)[key]);
        }
    }
}

// Replaces TOS with getattr(TOS, co_names[namei]).
optable[opcodes.LOAD_ATTR] = function(f: Py_FrameObject, t: Thread) { 
    var name = f.codeObj.names[f.readArg()].toString(),
        obj = f.pop(),
        val = (<any> obj)[`$${name}`];
    if (val === undefined) {
        var message = `'function' object has no attribute '${name}'\n`;
        f.raise_exception_here(t, message, "AttributeError");
    } else {
        f.push(val);
    }
}

optable[opcodes.BUILD_SLICE] = function(f: Py_FrameObject) {
    var argv = f.readArg(), step: IPy_Object, start: IPy_Object, stop: IPy_Object;
    if (argv === 3) {
        step = f.pop();
    } else {
        step = None;
    }
    stop = f.pop();
    start = f.pop();
    f.push(new Py_Slice(start, stop, step));
}

optable[opcodes.LOAD_LOCALS] = function(f: Py_FrameObject) {
    f.push(f.locals);
}

optable[opcodes.BUILD_CLASS] = function(f: Py_FrameObject, t: Thread) {
    /* Creates a new class object. TOS is the methods dictionary, TOS1 the tuple of the names of the base classes, and TOS2 the class name. */
    var methods = <Py_Dict> f.pop(),
      baseClasses = <Py_Tuple> f.pop(),
      className = <Py_Str> f.pop();
    f.push(builtins.type(t, f, [className, baseClasses, methods], null));
}

optable[opcodes.SETUP_WITH] = function(f: Py_FrameObject, t: Thread) {
    var ctx_man = f.pop();
    // push the __exit__ method, used by WITH_CLEANUP
    f.push((<any> ctx_man)['$__exit__']);
    // call the __enter__ method, leaving the result on the stack
    var enter_func = (<any> ctx_man)['$__enter__'];
    f.returnToThread = true;
    (<IPy_Function> enter_func).exec(t, f, [], new Py_Dict());
    // start a finally block
    setup_block(f, t, opcodes.SETUP_FINALLY);
}

optable[opcodes.WITH_CLEANUP] = function(f: Py_FrameObject, t: Thread) {
    // find the __exit__ method and pull it out of the stack
    var n = f.stack.length, kwargs = new Py_Dict();
    if (f.peek() === None) {
        var exit_func = f.stack.splice(n - 2, 1)[0];
    } else {
        throw new Error('Exceptions in context managers are NYI');
    }
    // call __exit__ with the appropriate args
    var args = [None, None, None];
    f.returnToThread = true;
    (<IPy_Function> exit_func).exec(t, f, args, kwargs);
    // TODO: if there was an exception (NYI case for now)
    //  and result === True, 'zap' the exc_info to prevent re-raise.
    var result = f.pop();
}

export = optable;
