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
        return new Py_Str(this.toString());
    }
    public str(): Py_Str {
        return this.repr();
    }
}

export class Py_Str extends Py_Object {
    private _str: string;
    constructor(s: string) {
        super();
        this._str = s;
    }
    // TODO: override hash()
    public repr(): Py_Str {
        return new Py_Str(`'${this._str}'`);
    }
    public str(): Py_Str {
        return this;
    }
    public toString(): string {
        return this._str;
    }
}
