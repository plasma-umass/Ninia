import iterator = require('./iterator');
import collections = require('./collections');
import singletons = require('./singletons');
import Py_Int = require('./integer');
import Py_Complex = require('./complex');
import Py_Float = require('./float');
import pytypes = require('./pytypes');
var Py_List = collections.Py_List;
var Py_Dict = collections.Py_Dict;
var Py_Tuple = collections.Py_Tuple;

// range function
function range(args: any[], kwargs: any) {
    if (kwargs.length > 0) {
        throw new Error('TypeError: range() takes no keyword arguments')
    }
    var start = 0, step = 1, stop: number;
    switch (args.length) {
        case 1:
            stop = args[0].toNumber();
            break;

        case 2:
            start = args[0].toNumber();
            stop = args[1].toNumber();
            break;

        case 3:
            start = args[0].toNumber();
            stop = args[1].toNumber();
            step = args[2].toNumber();
            if(step === 0){
                throw new Error('ValueError: range() step argument must not be zero')
            }
            break;
        default:
            throw new Error('TypeError: range() expects 1-3 int arguments')
    }
    var it = iterator.xrange([Py_Int.fromInt(start), Py_Int.fromInt(stop), Py_Int.fromInt(step)], {});
    return list([it], {});
}

// list constructor
function list(args: any[], kwargs: any) {
    if (kwargs.length > 0) {
        throw new Error('TypeError: list() takes no keyword arguments')
    }
    if (args.length == 0) {
        return new Py_List([]);
    }
    if (args.length > 1) {
        throw new Error('TypeError: list() take 0-1 arguments');
    }
    var x = args[0];
    if (x instanceof Py_List) {
        return x;
    }
    return Py_List.fromIterable(x);
}

// dict constructor function
function dict(args: any[], kwargs: any) {
    // XXX: handles only the most basic case
    var d = new Py_Dict();
    for (var k in kwargs) {
        if (kwargs.hasOwnProperty(k)) {
            d.set(pytypes.Py_Str.fromJS(k), kwargs[k]);
        }
    }
    return d;
}

// tuple constructor
function tuple(args: any[], kwargs: any) {
    if (kwargs.length > 0) {
        throw new Error('TypeError: tuple() takes no keyword arguments')
    }
    if (args.length == 0) {
        return new Py_Tuple([]);
    }
    if (args.length > 1) {
        throw new Error('TypeError: tuple() take 0-1 arguments');
    }
    var x = args[0];
    if (x instanceof Py_Tuple) {
        return x;
    }
    return Py_Tuple.fromIterable(x);
}

function abs(x) {
    return x.abs();
}

function all(x: collections.Iterable): boolean {
    var it = x.iter();
    for (var val = it.next(); val != null; val = it.next()) {
        if (!bool(val)) {
            return false;
        }
    }
    return true;
}

function any(x: collections.Iterable): boolean {
    var it = x.iter();
    for (var val = it.next(); val != null; val = it.next()) {
        if (bool(val)) {
            return true;
        }
    }
    return false;
}

function bool(x) {
    if (x === undefined)
        return false;
    if (x['bool'] !== undefined)
        return x.bool();
    return x != 0;
}

function bin(x): pytypes.Py_Str {
    // Default implementation in python adds '0b' prefix
    return pytypes.Py_Str.fromJS("0b" + x.toNumber().toString(2));
}

function chr(x): pytypes.Py_Str {
    return pytypes.Py_Str.fromJS(String.fromCharCode(x.toNumber()));
}

function ord(x) {
    return Py_Int.fromInt(x.toString().charCodeAt(0));
}

function cmp(args: any[], kwargs: any): Py_Int {
    var x = args[0];
    var y = args[1];
    if (x instanceof pytypes.Py_Str) {
        return Py_Int.fromInt(x.toString().localeCompare(y.toString()));
    }
    if (x.eq(y)) {
        return Py_Int.fromInt(0);
    } else if (x.lt(y)) {
        return Py_Int.fromInt(-1);
    }
    return Py_Int.fromInt(1);
}

function complex(args: any[], kwargs: any) {
    if (args.length == 0) {
        return Py_Complex.fromNumber(0);
    } else if (args.length == 1) {
        return Py_Complex.fromNumber(args[0].toNumber());
    } else if (args.length == 2) {
        return new Py_Complex(args[0], args[1]);
    } else {
        throw new Error('TypeError: complex() takes 0-2 arguments');
    }
}

function divmod(args: any[], kwargs: any) {
    return new Py_Tuple(args[0].divmod(args[1]));
}

function float(args: any[], kwargs: any): Py_Float {
    if (args.length == 0) {
        return new Py_Float(0);
    } else if (args.length == 1) {
        if (args[0] instanceof pytypes.Py_Str) {
            return new Py_Float(args[0].toString()-0);
        }
        return new Py_Float(args[0].toNumber());
    } else {
        throw new Error('TypeError: float() takes 0-1 arguments');
    }
}

function hex(x: any): pytypes.Py_Str {
    var n = x.toNumber();
    if (n < 0) {
        return pytypes.Py_Str.fromJS('-0x' + (-n).toString(16));
    }
    var ret = '0x' + n.toString(16);
    if (x.isLong)
        ret += 'L';
    return pytypes.Py_Str.fromJS(ret);
}

function int(args: any[], kwargs: any): Py_Int {
    var x = args[0] || kwargs['x'] || 0;
    var base = args[1] || kwargs['base'] || 10;
    if (x.toNumber !== undefined) {
        x = x.toNumber();
    } else if (x instanceof pytypes.Py_Str) {
        if (base == 0) {
            throw new Error('NotImplementedError: int() with base=0 is NYI');
        }
        x = parseInt(x.toString(), base);
    }
    return Py_Int.fromInt(x | 0);  // force number -> int

}

// builtin iter()
function iter(args: any[], kwargs: any): iterator.Iterator {
    if (kwargs.length > 0) {
        throw new Error('TypeError: iter() takes no keyword arguments');
    }
    if (args.length == 1) {
        return args[0].iter();
    }
    if (args.length == 2) {
        throw new Error('NotImplementedError: iter(a,b) is NYI');
    }
    throw new Error('TypeError: iter() take 1-2 arguments');
}

function pyfunc_wrapper_onearg(func, funcname: string) {
    return function(args: any[], kwargs: any) {
        if (kwargs.length > 0) {
            throw new Error('TypeError: ' + funcname +
                            '() takes no keyword arguments');
        }
        if (args.length != 1) {
            throw new Error('TypeError: ' + funcname + '() takes one argument');
        }
        return func(args[0]);
    }
}

// full mapping of builtin names to values.
var builtins = {
    True: true,
    False: false,
    None: singletons.None,
    NotImplemented: singletons.NotImplemented,
    Ellipsis: singletons.Ellipsis,
    iter: iter,
    xrange: iterator.xrange,
    range: range,
    list: list,
    dict: dict,
    tuple: tuple,
    abs: pyfunc_wrapper_onearg(abs, 'abs'),
    all: pyfunc_wrapper_onearg(all, 'all'),
    any: pyfunc_wrapper_onearg(any, 'any'),
    bin: pyfunc_wrapper_onearg(bin, 'bin'),
    bool: pyfunc_wrapper_onearg(bool, 'bool'),
    chr: pyfunc_wrapper_onearg(chr, 'chr'),
    ord: pyfunc_wrapper_onearg(ord, 'ord'),
    cmp: cmp,
    complex: complex,
    divmod: divmod,
    float: float,
    hex: pyfunc_wrapper_onearg(hex, 'hex'),
    int: int,
};

export = builtins
