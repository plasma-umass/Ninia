/// <reference path="../bower_components/DefinitelyTyped/node/node.d.ts" />
import primitives = require('./primitives');
import Py_FrameObject = require('./frameobject');
import Py_Int = primitives.Py_Int;
// XXX: Prevent a circular reference. Use this only for type info.
import _Py_FuncObject = require('./funcobject');
var Py_FuncObject: typeof _Py_FuncObject = null;
import opcodes = require('./opcodes');
import builtins = require('./builtins');
import collections = require('./collections');
import interfaces = require('./interfaces');
import IPy_Object = interfaces.IPy_Object;
import Py_List = collections.Py_List;
import Py_Tuple = collections.Py_Tuple;
import Py_Set = collections.Py_Set;
import Py_Dict = collections.Py_Dict;
import Py_CodeObject = require('./codeobject');
import enums = require('./enums');
import True = primitives.True;
import False = primitives.False;
import Py_Slice = primitives.Py_Slice;
import Iterator = interfaces.Iterator;
import Iterable = interfaces.Iterable;
import None = primitives.None;
import Py_Cell = require('./cell');
import Thread = require('./threading');
import IPy_Function = interfaces.IPy_Function;
var NotImplemented = builtins.$NotImplemented;

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
var optable: { [op: number]: (f: Py_FrameObject, t: Thread)=>void } = {};

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
        a.$${funcName}.exec(t, f, [a], new Py_Dict());
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
        a['$__i${funcName}__'].exec(t, f, [a, b], new Py_Dict());
        return;
    }
    f.pop();
    ` : ''}

    if (a['__${funcName}__']) {
        f.push(a.__${funcName}__(b));
        return;
    } else if (a['$__${funcName}__']) {
        f.returnToThread = true;
        a['$__${funcName}__'].exec_from_native(t, f, [a, b], new Py_Dict(), function(res) {
            if (res == NotImplemented) {
                ${reversible ? `
                if (b['__r${funcName}__']) {
                    f.push(b.__r${funcName}__(a));
                    t.setStatus(enums.ThreadStatus.RUNNABLE);
                } else if (b['$__r${funcName}__']) {
                    b['$__r${funcName}__'].exec_from_native(t, f, [a, b], new Py_Dict(), function(res) {
                        if (res == NotImplemented) {
                            throw new Error('TypeError: cannot __$r${funcName}__.');
                        }
                        f.push(res);
                        t.setStatus(enums.ThreadStatus.RUNNABLE);
                    });
                } else {
                   throw new Error('TypeError: cannot __r${funcName}__.');
                }
                ` : `throw new Error('TypeError: cannot __r${funcName}__.');`}
            } else {
                f.push(res);
                t.setStatus(enums.ThreadStatus.RUNNABLE);
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
        a.$__str__.exec_from_native(t, f, [a], new Py_Dict(), (str: primitives.Py_Str) => {
            var s: string = str.toString();
            process.stdout.write(s);
            var lastChar = s.slice(-1);
            f.shouldWriteSpace = (lastChar != '\t' && lastChar != '\n');
            t.setStatus(enums.ThreadStatus.RUNNABLE);
        });    
    }
}

optable[opcodes.PRINT_NEWLINE] = function(f: Py_FrameObject) {
    process.stdout.write("\n");
    f.shouldWriteSpace = false;
}

optable[opcodes.RETURN_VALUE] = function(f: Py_FrameObject, t: Thread) {
    t.asyncReturn(f.pop());
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
            f.push(val.__getitem__(new Py_Int(i)));
        } 
    } else if (val.$__getitem__) {
        // Pop from stack, and reverse the order of elements, and push back into stack
        // e.g. 1 2 3 -> 3 2 1
        function processNext() {
            if (i >= 0) {
                val.$__getitem__.exec_from_native(t, f, [val, new Py_Int(i--)], new Py_Dict(), (res: IPy_Object) => {
                    f.push(res);
                    processNext();
                });
            } else {
                t.setStatus(enums.ThreadStatus.RUNNABLE);
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

optable[opcodes.LOAD_NAME] = function(f: Py_FrameObject) {
    var i = f.readArg();
    var name = f.codeObj.names[i];
    var val = f.locals.get(name) || f.globals.get(name) || (<any> builtins)[`$${name.toString()}`];
    if (val === undefined) {
        throw new Error('undefined name: ' + name);
    }
    f.push(val);
}

optable[opcodes.LOAD_GLOBAL] = function(f: Py_FrameObject) {
    var i = f.readArg();
    var name = f.codeObj.names[i];
    var val = f.globals.get(name) || (<any> builtins)[`$${name.toString()}`];
    if (val === undefined) {
        throw new Error('undefined name: ' + name);
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

    switch(op) {
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
        case ComparisonOp.IS:
            // TODO: Python does pointer comparison.
            // Does this mean IS fails for integers...???
            // https://github.com/python/cpython/blob/2.7/Python/ceval.c#L4786
            f.push(a.hash() === b.hash() ? True : False);
            break;
        case ComparisonOp.IS_NOT:
            f.push(a.hash() !== b.hash() ? True : False);
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
    } else if ((<any> a)[`$${funcA}`]) {
        f.returnToThread = true;
        (<IPy_Function> (<any> a)[`$${funcA}`]).exec_from_native(t, f, [a, b], new Py_Dict(), (res: IPy_Object) => {
            if (res == NotImplemented) {
                if ((<any> b)[funcB]) {
                    f.push((<(a: IPy_Object) => IPy_Object> (<any> b)[funcB])(a));
                    t.setStatus(enums.ThreadStatus.RUNNABLE);
                } else if ((<any> b)[`$${funcB}`]) {
                    (<IPy_Function> (<any> b)[`$${funcB}`]).exec_from_native(t, f, [b, a], new Py_Dict(), (res: IPy_Object) => {
                        f.push(res);
                        t.setStatus(enums.ThreadStatus.RUNNABLE);
                    });
                } else {
                    throw new Error(`Object lacks ${funcB} property.`);   
                }            
            } 
        });
    } else {
        throw new Error(`Object lacks ${funcA} property.`);
    }   
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
    f.returnToThread = true;
    (<interfaces.IPy_Function> func).exec(t, f, args, kwargs);
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
        Py_FuncObject = require('./funcobject')
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
    var func = new Py_FuncObject(code, f.globals, defaults, code.name);
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
        f.push(a.__getitem__(new Py_Slice(new Py_Int(0), a.__len__(), None)));
    } else if (a.$__getitem__ && a.$__len__) {
        f.returnToThread = true;
        a.$__len__.exec_from_native(t, f, [a], new Py_Dict(), (rv: IPy_Object) => {
            a.$__getitem__.exec_from_native(t, f, [a, new Py_Slice(new Py_Int(0), rv, None)], new Py_Dict(), (rv: IPy_Object) => {
                f.push(rv);
                t.setStatus(enums.ThreadStatus.RUNNABLE);
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
        f.push(a.__getitem__(new Py_Slice(b, a.__len__(), None)));
    } else if (a.$__getitem__ && a.$__len__) {
        f.returnToThread = true;
        a.$__len__.exec_from_native(t, f, [a], new Py_Dict(), (rv: IPy_Object) => {
            a.$__getitem__.exec_from_native(t, f, [a, new Py_Slice(b, rv, None)], new Py_Dict(), (rv: IPy_Object) => {
                f.push(rv);
                t.setStatus(enums.ThreadStatus.RUNNABLE);
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
        f.push(a.__getitem__(new Py_Slice(new Py_Int(0), b, None)));
    } else if (a.$__getitem__) {
        f.returnToThread = true;
        a.$__getitem__.exec(t, f, [a, new Py_Slice(new Py_Int(0), b, None)], new Py_Dict());
    } else {
        throw new Error(`TypeError: ${b} does not support __getitem__`);
    }
}

optable[opcodes.SLICE_3] = function(f: Py_FrameObject, t: Thread) {
    var a = f.pop();
    var b = f.pop();
    var c = f.pop();
    if (c.__getitem__) {
        f.push(c.__getitem__(new Py_Slice(b, a, None)));
    } else if (c.$__getitem__) {
        f.returnToThread = true;
        c.$__getitem__.exec(t, f, [c, new Py_Slice(b, a, None)], new Py_Dict());
    } else {
        throw new Error(`TypeError: ${b} does not support __getitem__`);
    }
}

optable[opcodes.STORE_SLICE_0] = function(f: Py_FrameObject, t: Thread) {
    var seq = f.pop();
    var value = f.pop();
    if (seq.__setitem__) {
        seq.__setitem__(new Py_Slice(None, None, None), value);
    } else if (seq.$__setitem__) {
        f.returnToThread = true;
        seq.$__setitem__.exec(t, f, [seq, new Py_Slice(None, None, None), value], new Py_Dict());
    } else {
        throw new Error(`TypeError: ${seq} does not support __setitem__`);
    }
}

optable[opcodes.STORE_SLICE_1] = function(f: Py_FrameObject, t: Thread) {
    var start = f.pop();
    var seq = f.pop();
    var value = f.pop();
    if (seq.__setitem__) {
        seq.__setitem__(new Py_Slice(start, None, None), value);
    } else if (seq.$__setitem__) {
        f.returnToThread = true;
        seq.$__setitem__.exec(t, f, [seq, new Py_Slice(start, None, None), value], new Py_Dict());
    } else {
        throw new Error(`TypeError: ${seq} does not support __setitem__`);
    }
}

optable[opcodes.STORE_SLICE_2] = function(f: Py_FrameObject, t: Thread) {
    var end = f.pop();
    var seq = f.pop();
    var value = f.pop();
    if (seq.__setitem__) {
        seq.__setitem__(new Py_Slice(None, end, None), value);
    } else if (seq.$__setitem__) {
        f.returnToThread = true;
        seq.$__setitem__.exec(t, f, [seq, new Py_Slice(None, end, None), value], new Py_Dict());
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
        seq.__setitem__(new Py_Slice(start, end, None), value);
    } else if (seq.$__setitem__) {
        f.returnToThread = true;
        seq.$__setitem__.exec(t, f, [seq, new Py_Slice(start, end, None), value], new Py_Dict());
    } else {
        throw new Error(`TypeError: ${seq} does not support __setitem__`);
    }
}

optable[opcodes.DELETE_SLICE_0] = function(f: Py_FrameObject, t: Thread) {
    var seq = f.pop();
    if (seq.__delitem__) {
        seq.__delitem__(new Py_Slice(None, None, None));
    } else if (seq.$__delitem__) {
        f.returnToThread = true;
        seq.$__delitem__.exec(t, f, [seq, new Py_Slice(None, None, None)], new Py_Dict());
    } else {
        throw new Error(`TypeError: ${seq} does not support __delitem__`);
    }
}

optable[opcodes.DELETE_SLICE_1] = function(f: Py_FrameObject, t: Thread) {
    var start = f.pop();
    var seq = f.pop();
    if (seq.__delitem__) {
        seq.__delitem__(new Py_Slice(start, None, None));
    } else if (seq.$__delitem__) {
        f.returnToThread = true;
        seq.$__delitem__.exec(t, f, [seq, new Py_Slice(start, None, None)], new Py_Dict());
    } else {
        throw new Error(`TypeError: ${seq} does not support __delitem__`);
    }
}

optable[opcodes.DELETE_SLICE_2] = function(f: Py_FrameObject, t: Thread) {
    var end = f.pop();
    var seq = f.pop();
    if (seq.__delitem__) {
        seq.__delitem__(new Py_Slice(None, end, None));
    } else if (seq.$__delitem__) {
        f.returnToThread = true;
        seq.$__delitem__.exec(t, f, [seq, new Py_Slice(None, end, None)], new Py_Dict());
    } else {
        throw new Error(`TypeError: ${seq} does not support __delitem__`);
    }
}

optable[opcodes.DELETE_SLICE_3] = function(f: Py_FrameObject, t: Thread) {
    var end = f.pop();
    var start = f.pop();
    var seq = f.pop();
    if (seq.__delitem__) {
        seq.__delitem__(new Py_Slice(start, end, None));
    } else if (seq.$__delitem__) {
        f.returnToThread = true;
        seq.$__delitem__.exec(t, f, [seq, new Py_Slice(start, end, None)], new Py_Dict());
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
        obj.__setitem__(key, value);
    } else if (obj.$__setitem__) {
        f.returnToThread = true;
        obj.$__setitem__.exec(t, f, [obj, key, value], new Py_Dict());
    } else {
        throw new Error("Unsupported type.");
    }
}

// TODO: more testing
optable[opcodes.DELETE_SUBSCR] = function(f: Py_FrameObject, t: Thread) {
    var key = f.pop();
    var obj = f.pop();
    if (obj.__delitem__) {
        obj.__delitem__(key);
    } else if (obj.$__delitem__) {
        f.returnToThread = true;
        obj.$__delitem__.exec(t, f, [obj, key], new Py_Dict());
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

function setup_block(f: Py_FrameObject) {
    var delta = f.readArg();
    // push a block to the block stack
    var stackSize = f.stack.length;
    var loopPos = f.lastInst;
    f.blockStack.push([stackSize, loopPos, loopPos+delta]);
}
optable[opcodes.SETUP_LOOP] = setup_block;
optable[opcodes.SETUP_EXCEPT] = setup_block;
optable[opcodes.SETUP_FINALLY] = setup_block;

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

optable[opcodes.LIST_APPEND] = function(f: Py_FrameObject) {
    var i = f.readArg();
    var x = f.pop();
    var lst = <Py_List> f.stack[f.stack.length - i];
    lst.append([x], {});
}

optable[opcodes.END_FINALLY] = function(f: Py_FrameObject) {
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

optable[opcodes.FOR_ITER] = function(f: Py_FrameObject) {
    // calls next() on the iter object at TOS
    var delta = f.readArg();
    var iter = <Iterator> f.peek();
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
    var level = (<Py_Int> f.pop()).toNumber();
    var name = f.codeObj.names[name_idx];
    //var mod;
    // TODO: implement this. For now, we no-op.
    // mod = builtins.__import__(name, f.globals, f.locals, fromlist, level)
    f.push(null);
}

optable[opcodes.IMPORT_FROM] = function(f: Py_FrameObject) {
    var name_idx = f.readArg();
    var mod = f.pop();
    //var attr;
    // TODO: implement this. For now, we no-op.
    // attr = mod.codeObj.names[name_idx]
    f.push(null);
}

// Replaces TOS with getattr(TOS, co_names[namei]).
optable[opcodes.LOAD_ATTR] = function(f: Py_FrameObject) {
    // TODO: Cache strings! 
    var name = f.codeObj.names[f.readArg()].toString(),
        obj = f.pop(),
        val = (<any> obj)[`$${name}`];
    if (val === undefined) {
        throw new Error(`Invalid attribute: ${name}`);
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

export = optable;
