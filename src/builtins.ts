import iterator = require('./iterator');
import singletons = require('./singletons');
import Py_Int = require('./integer');
import Py_Complex = require('./complex');
import Py_Float = require('./float');

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
        case 3:
            step = args[2].toNumber();  // fall through!
        case 2:
            start = args[0].toNumber();
            stop = args[1].toNumber();
            break;
        default:
            throw new Error('TypeError: range() expects 1-3 int arguments')
    }
    var res = [];
    for (var i = start; i < stop; i += step) {
        res.push(Py_Int.fromInt(i));
    }
    return res;
}

// list constructor
function list(args: any[], kwargs: any) {
    if (kwargs.length > 0) {
        throw new Error('TypeError: list() takes no keyword arguments')
    }
    // XXX: should do conversion here
    return args[0];
}

class PyDict {
  constructor(public map: any) {}
  public get(key: any): any {
    // XXX: should use hash(key)
    return this.map[key];
  }
  public set(key: any, val: any): void {
    // XXX: should use hash(key)
    this.map[key] = val;
  }
  public toString(): string {
    var s = '{';
    for (var k in this.map) {
      if (this.map.hasOwnProperty(k)) {
        s += k.toString() + ': ' + this.map[k].toString() + ', ';
      }
    }
    if (s.length > 1) {
      s = s.slice(0, -2);  // trim off last ', '
    }
    return s + '}';
  }
}

// dict constructor function
function dict(args: any[], kwargs: any) {
    // XXX: handles only the most basic case
    return new PyDict(kwargs);
}

// tuple constructor
function tuple(x) {
    // XXX: should do conversion here
    return x;
}

function abs(x) {
    return x.abs();
}

function all(x) {
    var it = iterator.iter(x);
    for (var val = it.next(); val != null; val = it.next()) {
        if (!bool(val)) {
            return false;
        }
    }
    return true;
}

function any(x) {
    var it = iterator.iter(x);
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
    return x;
}

function bin(x) {
    return x.toNumber().toString(2);
}

function chr(x) {
    return String.fromCharCode(x.toNumber());
}

function ord(x) {
    return Py_Int.fromInt(x.charCodeAt(0));
}

function cmp(args: any[], kwargs: any) {
    var x = args[0];
    var y = args[1];
    if (typeof x == 'string') {
        return x.localeCompare(y);
    }
    if (x.eq(y)) {
        return 0;
    } else if (x.lt(y)) {
        return -1;
    }
    return 1;
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
    var x = args[0];
    var y = args[1];
    return x.divmod(y);
}

function float(args: any[], kwargs: any) {
    if (args.length == 0) {
        return new Py_Float(0);
    } else if (args.length == 1) {
        if (typeof args[0] == 'string') {
            return new Py_Float(args[0]-0);
        }
        return new Py_Float(args[0].toNumber());
    } else {
        throw new Error('TypeError: float() takes 0-1 arguments');
    }
}

function hex(x: any): string {
    var n = x.toNumber();
    if (n < 0) {
        return '-0x' + (-n).toString(16);
    }
    return '0x' + n.toString(16);
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
    iter: iterator.iter,
    xrange: iterator.xrange,
    range: range,
    list: list,
    dict: dict,
    tuple: pyfunc_wrapper_onearg(tuple, 'tuple'),
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
};

export = builtins
