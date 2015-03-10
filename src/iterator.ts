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

export class XRange implements Iterator, collections.Iterable {
    private start: number = 0;
    private index: number = 0;
    private stop: number;
    private step: number = 1;
    private _len: number;
    constructor(args: any[], kwargs: any) {
        if (kwargs.length > 0) {
            throw new Error('TypeError: xrange() does not take keyword arguments')
        }
        if (args.length == 1) {
            this.stop = args[0].toNumber();
        } else if (args.length == 2) {
            this.start = args[0].toNumber();
            this.stop = args[1].toNumber();
        } else if (args.length == 3) {
            this.start = args[0].toNumber();
            this.stop = args[1].toNumber();
            this.step = args[2].toNumber();

            if(this.step === 0){
                throw new Error('ValueError: xrange() arg 3 must not be zero')
            }
        } else {
            throw new Error('TypeError: xrange() requires 1-3 int arguments')
        }

        if (this.step > 0 && this.start < this.stop){
            this._len = 1 + Math.floor((this.stop - 1 - this.start) / this.step);
        }
        else if (this.step < 0 && this.start > this.stop){
            this._len = 1 + Math.floor((this.start - 1 - this.stop) / ( -1 * this.step));
        }
        else{
            this._len = 0;
        }
    }
    public iter(): Iterator {
        return this;
    }
    public next(): number {
        var ret = null;
        if (this.index < this._len) {
            ret = Py_Int.fromInt(this.start + this.index * this.step);
            this.index += 1;
        }
        return ret;
    }

    public len(): number {
           return this._len;
    }
    public toString(): string {
        return "xrange";
    }

    public asBool(): boolean {
        return this.len() !== 0;
    }
}

// builtin xrange()
export function xrange(args: any[], kwargs: any): XRange {
    return new XRange(args, kwargs);
}
