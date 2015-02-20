import iterator = require('./iterator');
import singletons = require('./singletons');
import Py_Int = require('./integer');

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
function tuple(args: any[], kwargs: any) {
    if (kwargs.length > 0) {
        throw new Error('TypeError: tuple() takes no keyword arguments')
    }
    // XXX: should do conversion here
    return args[0];
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
    tuple: tuple,
};

export = builtins
