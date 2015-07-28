import {True, False, Py_Int, Py_Object} from './primitives';
import {Iterator, Iterable, IPy_Object, IPy_FrameObj} from './interfaces';
import {Thread} from './threading';

export class ListIterator extends Py_Object implements Iterator {
    private pos: number = 0;
    private list: IPy_Object[];
    constructor(list: IPy_Object[]) {
        super();
        this.list = list;
    }
    public next(): IPy_Object {
        var ret: IPy_Object = null;
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

export class XRange extends Py_Object implements Iterator, Iterable {
    private start: number = 0;
    private index: number = 0;
    private stop: number;
    private step: number = 1;
    private _len: number;
    constructor(args: any[], kwargs: any) {
        super();
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
    public __contains__(x: IPy_Object): typeof True {
        var num = (<any> x).toNumber();  // XXX: need to deal with non-number case
        var ret = (num >= this.start) && (num < this.stop) && ((num - this.start) % this.step == 0);
        return ret ? True : False;
    }
    public next(): Py_Int {
        var ret: Py_Int = null;
        if (this.index < this._len) {
            ret = new Py_Int(this.start + this.index * this.step);
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
export function xrange(t: Thread, f: IPy_FrameObj, args: any[], kwargs: any): XRange {
    return new XRange(args, kwargs);
}
