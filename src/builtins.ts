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
};

export = builtins