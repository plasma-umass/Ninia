///<reference path="../lib/decimal.d.ts" />
import singletons = require('./singletons');
var NIError = singletons.NotImplemented;
import Py_Int = require('./integer');
var Decimal = require('../node_modules/decimal.js/decimal');
import pytypes = require('./pytypes');

class Py_Long extends pytypes.Py_Object {
    isLong: boolean = true;
    value: Decimal;
    constructor(val: Decimal) {
        super();
        this.value = val;
    }

    // Long is a step above integer in the hierarchy. They represent
    // arbitrary-precision decimal numbers.
    static fromInt(n: number) {
        var d = Decimal(n);
        return new Py_Long(d);
    }

    static fromPy_Int(n: Py_Int): Py_Long {
        return Py_Long.fromString(n.toString());
    }

    // fromString allows us to leverage the power of the underlying Decimal
    // class to easily convert from Py_Int to Py_Long.
    static fromString(s: string) {
        var d = new Decimal(s);
        return new Py_Long(d);
    }

    // Longs only have to widen Ints. This makes the main math operations
    // straightforward, for the most part.
    private mathOp(other: any, op: (a: Py_Long, b: Py_Long) => any): any {
        if (other.isInt)
            return op(this, Py_Long.fromPy_Int(other));
        else if (other.isLong)
            return op(this, other);
        else
            return NIError;
    }

    // Reverse math ops will occur iff a `op` b => a doesn't implement op for
    // type b. For longs, this should occur for a: Py_Int, b: Py_Long
    // Therefore, these should do c: Py_Long = Py_Long(a), c `op` b
    private revMathOp(other: any, op: (a: Py_Long, b: Py_Long) => any): any {
        if (other.isInt)
            return op(Py_Long.fromPy_Int(other), this);
        else if (other.isLong)
            return op(other, this);
        else
            return NIError;
    }

    // The following should be self explanatary, to an extent.
    add(other: any): any {
        return this.mathOp(other, function(a, b) {
            return new Py_Long(a.value.plus(b.value));
        });
    }

    sub(other: any): any {
        return this.mathOp(other, function(a, b) {
            return new Py_Long(a.value.minus(b.value));
        });
    }

    mult(other: any): any {
        return this.mathOp(other, function(a, b) {
            return new Py_Long(a.value.times(b.value));
        });
    }

    // Note: The Decimal type DOES have a divideToInteger function. In Python,
    // the floor division operator always rounds towards negative infinity.
    // Therefore, the slightly longer div(...).floor() method chain should be
    // used.
    floordiv(other: any): any {
        return this.mathOp(other, function(a, b) {
            if (b.value.isZero())
                throw new Error("Division by 0");
            return new Py_Long(a.value.div(b.value).floor());
        });
    }

    // True division, always.
    div(other: any): any {
        return this.truediv(other);
    }

    truediv(other: any): any {
        return this.mathOp(other, function(a, b) {
            if (b.value.isZero())
                throw new Error("Division by 0");
            return new Py_Long(a.value.div(b.value));
        });
    }

    // As stated previously, Python's unusual mod rules come into play here.
    // (a % b) has b's sign, and a == (a // b) * b + (a % b)
    mod(other: any): any {
        return this.mathOp(other, function(a, b) {
            if (b.value.isZero())
                throw new Error("Modulo by 0");
            return a.sub(b.mult(a.floordiv(b)));
        });
    }

    divmod(other: any): Py_Long[] {
        return [this.floordiv(other), this.mod(other)];
    }

    // Thankfully, Decimal has a toPower function.
    pow(other: any): any {
        return this.mathOp(other, function(a, b) {
            return new Py_Long(a.value.toPower(b.value));
        });
    }

    // These are a bitty "hacky" but they get the job done.
    lshift(other: any): any {
        return this.mathOp(other, function(a, b) {
            return new Py_Long(a.value.times(Decimal.pow(2, b.value)));
        });
    }

    rshift(other: any): any {
        return this.mathOp(other, function(a, b) {
            return new Py_Long(a.value.divToInt(Decimal.pow(2, b.value)));
        });
    }

    // And, Xor and Or require messing with the guts of Decimal
    // Totally doable, but for now, not implemented
    // Future reference: Decimal's 'c' field is number[] (array of digits)
    // res[i] = a[i] | b[i]
    // But might need to treat negative numbers differently?
    and(other: any): any {
        // if (other instanceof Py_Int)
        //     return new Py_Long(this.value.and(other.value));
        // else
        return NIError;
    }

    xor(other: any): any {
        // if (other instanceof Py_Int)
        //     return new Py_Long(this.value.xor(other.value));
        // else
        return NIError;
    }

    or(other: any): any {
        // if (other instanceof Py_Int)
        //     return new Py_Long(this.value.or(other.value));
        // else
        return NIError;
    }

    // Reverse mathematical operations follow the same design as above.
    radd(other: any): any {
        return this.revMathOp(other, function(a, b) {
            return new Py_Long(a.value.plus(b.value));
        });
    }

    rsub(other: any): any {
        return this.revMathOp(other, function(a, b) {
            return new Py_Long(a.value.minus(b.value));
        });
    }

    rmult(other: any): any {
        return this.revMathOp(other, function(a, b) {
            return new Py_Long(a.value.times(b.value));
        });
    }

    rfloordiv(other: any): any {
        return this.revMathOp(other, function(a, b) {
            if (b.value.isZero())
                throw new Error("Division by 0");
            return new Py_Long(a.value.div(b.value).floor());
        });
    }

    rdiv(other: any): any {
        return this.rtruediv(other);
    }

    rtruediv(other: any): any {
        return this.revMathOp(other, function(a, b) {
            if (b.value.isZero())
                throw new Error("Division by 0");
            return new Py_Long(a.value.div(b.value));
        });
    }

    rmod(other: any): any {
        return this.revMathOp(other, function(a, b) {
            if (b.value.isZero())
                throw new Error("Division by 0");
            return a.sub(b.mult(a.floordiv(b)));
        });
    }

    rdivmod(other: any): any {
        return this.revMathOp(other, function(a, b) {
            return new Py_Long(a.value.divToInt(b.value).modulo(b.value));
        });
    }

    rpow(other: any): any {
        return this.revMathOp(other, function(a, b) {
            return new Py_Long(a.value.toPower(b.value));
        });
    }

    rlshift(other: any): any {
        return this.revMathOp(other, function(a, b) {
            return new Py_Long(a.value.times(Decimal.pow(2, b.value)));
        });
    }

    rrshift(other: any): any {
        return this.revMathOp(other, function(a, b) {
            return new Py_Long(a.value.divToInt(Decimal.pow(2, b.value)));
        });
    }

    // And, Xor and Or require messing with the guts of Decimal
    // Totally doable, but for now, not implemented
    // Future reference: Decimal's 'c' field is number[] (array of digits)
    // res[i] = a[i] | b[i]
    // But might need to treat negative numbers differently?
    rand(other: any): any {
        // if (other instanceof Py_Int)
        //     return new Py_Long(this.value.and(other.value));
        // else
        return NIError;
    }

    rxor(other: any): any {
        // if (other instanceof Py_Int)
        //     return new Py_Long(this.value.xor(other.value));
        // else
        return NIError;
    }

    ror(other: any): any {
        // if (other instanceof Py_Int)
        //     return new Py_Long(this.value.or(other.value));
        // else
        return NIError;
    }

    neg(): Py_Long {
        return this.mult(Py_Long.fromString("-1"));
    }

    pos(): Py_Long {
        return this
    }

    abs(): Py_Long {
        if (this.value.isNegative())
            return this.neg();
        else
            return this;
    }

    // ~x = (-x) - 1 for integers, so we emulate that here
    invert(): Py_Long {
        return this.neg().sub(Py_Long.fromString("1"));
    }

    // Rich comparison operations are used for intra-numeric comparisons.
    // That just means we need to handle Ints and can pass anything else along.
    private cmpOp(other: any, op: (a: Py_Long, b: Py_Long) => any): any {
        if (other.isInt)
            return op(this, Py_Long.fromPy_Int(other));
        else if (other.isLong)
            return op(this, other);
        else
            return NIError;
    }

    lt(other): boolean {
        return this.cmpOp(other, function(a, b) {
            return a.value.lessThan(b.value);
        });
    }

    le(other): boolean {
        return this.cmpOp(other, function(a, b) {
            return a.value.lessThanOrEqualTo(b.value);
        });
    }

    eq(other): boolean {
        return this.cmpOp(other, function(a, b) {
            return a.value.equals(b.value);
        });
    }

    ne(other): boolean {
        return this.cmpOp(other, function(a, b) {
            return !a.value.equals(b.value);
        });
    }

    gt(other): boolean {
        return this.cmpOp(other, function(a, b) {
            return a.value.greaterThan(b.value);
        });
    }

    ge(other): boolean {
        return this.cmpOp(other, function(a, b) {
            return a.value.greaterThanOrEqualTo(b.value);
        });
    }

    toString(): string {
        return this.value.toString() + 'L';
    }

    toNumber(): number {
        return this.value.toNumber();
    }

    str(): pytypes.Py_Str {
        return pytypes.Py_Str.fromJS(this.value.toString());
    }
}
export = Py_Long;
