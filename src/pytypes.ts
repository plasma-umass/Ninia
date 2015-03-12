import interfaces = require('./interfaces');
import IPy_Object = interfaces.IPy_Object;
import enums = require('./enums');
import singletons = require('./singletons');

var ref = 1;

export class Py_Object implements IPy_Object {
    private _ref: number;
    constructor() {
        this._ref = ref++;
    }
    public getType(): enums.Py_Type { return enums.Py_Type.OTHER; }
    public hash(): number {
        return this._ref;
    }
    public __repr__(): Py_Str {
        return Py_Str.fromJS(this.toString());
    }
    public __str__(): Py_Str {
        return this.__repr__();
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
    public __repr__(): Py_Str {
        return Py_Str.fromJS(`'${this._str}'`);
    }
    public __str__(): Py_Str {
        return this;
    }

    public len(): number {
        return this._str.length;
    }

    public toString(): string {
        return this._str;
    }
    public __add__(other: IPy_Object): IPy_Object {
      if (other instanceof Py_Str) {
        return Py_Str.fromJS(this._str + other.toString());
      }
      return singletons.NotImplemented;
    }

    public asBool(): boolean {
        return this.len() !== 0;
    }
}
