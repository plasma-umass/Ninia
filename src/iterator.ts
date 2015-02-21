import Py_Int = require('./integer');
import collections = require('./collections');

// all iterators must support next()
export interface Iterator {
    next: ()=>any;
}

export class ListIterator implements Iterator {
    private pos: number = 0;
    private list: any[];
    constructor(list: any[]) {
        this.list = list;
    }
    public next(): any {
        var ret = null;
        if (this.pos < this.list.length) {
            ret = this.list[this.pos];
            this.pos += 1;
        }
        return ret;
    }
    public toString(): string {
        return "listiterator";
    }
}

class XRange implements Iterator, collections.Iterable {
    private value: number = 0;
    private stop: number;
    private step: number = 1;
    constructor(args: any[], kwargs: any) {
        if (kwargs.length > 0) {
            throw new Error('TypeError: xrange() does not take keyword arguments')
        }
        if (args.length == 1) {
            this.stop = args[0].toNumber();
        } else if (args.length == 2) {
            this.value = args[0].toNumber();
            this.stop = args[1].toNumber();
        } else if (args.length == 3) {
            this.value = args[0].toNumber();
            this.stop = args[1].toNumber();
            this.step = args[2].toNumber();
        } else {
            throw new Error('TypeError: xrange() requires 1-3 int arguments')
        }
    }
    public iter(): Iterator {
        return this;
    }
    public next(): number {
        var ret = null;
        if (this.value < this.stop) {
            ret = Py_Int.fromInt(this.value);
            this.value += this.step;
        }
        return ret;
    }
    public toString(): string {
        return "xrange";
    }
}

// builtin xrange()
export function xrange(args: any[], kwargs: any): XRange {
    return new XRange(args, kwargs);
}
