import singletons = require('./singletons');

var ref = 1;

export class Py_Object {
    private _ref: number;
    constructor() {
        this._ref = ref++;
    }
    public hash(): number {
        return this._ref;
    }
    public repr(): Py_Str {
        return Py_Str.fromJS(this.toString());
    }
    public str(): Py_Str {
        return this.repr();
    }
}

// Enforces immutable strings, at the cost of having to keep
// all strings around forever.
var string_pool: { [s: string]: Py_Str } = {};

export class Py_Str extends Py_Object {
    private _str: string;
    // No other class should call this constructor.
    constructor(s: string) {
        super();
        this._str = s;
    }
    public static fromJS(s: string): Py_Str {
        var inst: Py_Str = string_pool[s];
        if (inst !== undefined) {
            return inst;
        }
        inst = new Py_Str(s);
        string_pool[s] = inst;
        return inst;
    }
    public repr(): Py_Str {
        return Py_Str.fromJS(`'${this._str}'`);
    }
    public str(): Py_Str {
        return this;
    }
    public toString(): string {
        return this._str;
    }
    public add(other: Py_Object): any {
        if (other instanceof Py_Str) {
            return Py_Str.fromJS(this._str + other.toString());
        }
        return singletons.NotImplemented;
    }
}
