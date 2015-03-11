/// <reference path="../lib/decimal.d.ts" />
import singletons = require('./singletons');
import pytypes = require('./pytypes');
import gLong = require("../lib/gLong");
var NIError = singletons.NotImplemented;
var Decimal = require('../node_modules/decimal.js/decimal');

// Py_Float emulates the Python Floating-point numeric class. Py_Float is
// basically a wrapper around JavaScript's numbers.
// Note that edge cases with e.g. NaN, +/-Infinity are not really covered.
export class Py_Float extends pytypes.Py_Object {
    isFloat: boolean = true;
    value: number;
    constructor(val: number) {
        super();
        this.value = val;
    }

    // Float is below Complex but above Int and Long in the widening hierarchy
    static fromPy_Int(n: Py_Int): Py_Float {
        return new Py_Float(n.toNumber());
    }

    static fromPy_Long(n: Py_Long): Py_Float {
        return new Py_Float(n.toNumber());
    }

    // Like the other classes, Floats must widen Ints and Longs to perform the
    // operation. This standardizes the math operation functions.
    private mathOp(other: any, op: (a: Py_Float, b: Py_Float) => any): any {
        if (other.isInt)
            return op(this, Py_Float.fromPy_Int(other));
        else if (other.isLong)
            return op(this, Py_Float.fromPy_Long(other));
        else if (other.isFloat)
            return op(this, other);
        else
            return NIError;
    }

    // Reverse math ops will occur iff a `op` b => a doesn't implement op for
    // type b. For longs, this should occur for a: Py_Int, b: Py_Float
    // Therefore, these should do c: Py_Float = Py_Float(a), c `op` b
    private revMathOp(other: any, op: (a: Py_Float, b: Py_Float) => any): any {
        if (other.isInt)
            return op(Py_Float.fromPy_Int(other), this);
        if (other.isLong)
            return op(Py_Float.fromPy_Long(other), this);
        else if (other.isFloat)
            return op(other, this);
        else
            return NIError;
    }

    // The following functions are dangerously self-explanatory
    add(other: any): any {
        return this.mathOp(other, function(a, b) {
            return new Py_Float(a.value + b.value);
        });
    }

    sub(other: any): any {
        return this.mathOp(other, function(a, b) {
            return new Py_Float(a.value - b.value);
        });
    }

    mult(other: any): any {
        return this.mathOp(other, function(a, b) {
            return new Py_Float(a.value * b.value);
        });
    }

    floordiv(other: any): any {
        return this.mathOp(other, function(a, b) {
            if (b.value == 0)
                throw new Error("Division by 0");
            return new Py_Float(Math.floor(a.value / b.value));
        });
    }

    div(other: any): any {
        return this.truediv(other);
    }

    truediv(other: any): any {
        return this.mathOp(other, function(a, b) {
            if (b.value == 0)
                throw new Error("Division by 0");
            return new Py_Float(a.value / b.value);
        });
    }

    // Modulo in Python has the following property: a % b) will always have the
    // sign of b, and a == (a//b)*b + (a%b).
    mod(other: any): any {
        return this.mathOp(other, function(a, b) {
            if (b.value == 0)
                throw new Error("Modulo by 0");
            // return new Py_Float(a.value % b.value);
            return a.sub(b.mult(a.floordiv(b)));
        });
    }

    divmod(other: any): any {
        return [this.floordiv(other), this.mod(other)];
    }

    pow(other: any): any {
        return this.mathOp(other, function(a, b) {
            return new Py_Float(Math.pow(a.value, b.value));
        });
    }

    // The following are undefined for Floats in Python, which is sensible
    // lshift(other: any): any {
    //     return NIError
    // }

    // rshift(other: any): any {
    //     return NIError
    // }

    // and(other: any): any {
    //    return NIError
    // }

    // xor(other: any): any {
    //    return NIError
    // }

    // or(other: any): any {
    //    return NIError
    // }

    // Reverse mathematical operations are the same as the above ops except with
    // reversed arguments.
    radd(other: any): any {
        return this.revMathOp(other, function(a, b) {
            return new Py_Float(a.value + (b.value));
        });
    }

    rsub(other: any): any {
        return this.revMathOp(other, function(a, b) {
            return new Py_Float(a.value - (b.value));
        });
    }

    rmult(other: any): any {
        return this.revMathOp(other, function(a, b) {
            return new Py_Float(a.value * (b.value));
        });
    }

    rfloordiv(other: any): any {
        return this.revMathOp(other, function(a, b) {
            if (b.value == 0)
                throw new Error("Division by 0");
            return new Py_Float(Math.floor(a.value / b.value));
        });
    }

    rdiv(other: any): any {
        return this.rtruediv(other);
    }

    rtruediv(other: any): any {
        return this.revMathOp(other, function(a, b) {
            if (b.value == 0)
                throw new Error("Division by 0");
            return new Py_Float(a.value / (b.value));
        });
    }

    rmod(other: any): any {
        return this.revMathOp(other, function(a, b) {
            if (b.value == 0)
                throw new Error("Modulo by 0");
            return new Py_Float(a.value % (b.value));
        });
    }

    rdivmod(other: any): any {
        return this.revMathOp(other, function(a, b) {
            return new Py_Float(Math.floor(a.value / b.value) % b.value);
        });
    }

    rpow(other: any): any {
        return this.revMathOp(other, function(a, b) {
            return new Py_Float(Math.pow(a.value,b.value));
        });
    }

    // rlshift(other: any): any {
    //     return NIError
    // }

    // rrshift(other: any): any {
    //     return NIError
    // }

    // rand(other: any): any {
    //    return NIError
    // }

    // rxor(other: any): any {
    //    return NIError
    // }

    // ror(other: any): any {
    //    return NIError
    // }

    neg(): Py_Float {
        return this.mult(new Py_Float(-1));
    }

    pos(): Py_Float {
        return this
    }

    abs(): Py_Float {
        if (this.value < 0)
            return this.neg();
        else
            return this;
    }

    // This isn't implemented for floats in Python, apparently?
    // invert(): any {
    //     return NIError
    // }

    // Rich comparison ops
    // Similar to math ops, Floats have to be able to compare the narrower
    // types.
    private cmpOp(other: any, op: (a: Py_Float, b: Py_Float) => any): any {
        if (other.isInt)
            return op(this, Py_Float.fromPy_Int(other));
        else if (other.isLong)
            return op(this, Py_Float.fromPy_Long(other));
        else if (other.isFloat)
            return op(this, other);
        else
            return NIError;
    }

    lt(other): boolean {
        return this.cmpOp(other, function(a, b) { return a.value < b.value; });
    }

    le(other): boolean {
        return this.cmpOp(other, function(a, b) { return a.value <= b.value; });
    }

    eq(other): boolean {
        return this.cmpOp(other, function(a, b) { return a.value == b.value; });
    }

    ne(other): boolean {
        return this.cmpOp(other, function(a, b) { return a.value != b.value; });
    }

    gt(other): boolean {
        return this.cmpOp(other, function(a, b) { return a.value > b.value; });
    }

    ge(other): boolean {
        return this.cmpOp(other, function(a, b) { return a.value >= b.value; });
    }

    toNumber(): number {
        return this.value;
    }

    toString(): string {
        var s = this.value.toString();
        if (s.indexOf('.') < 0) {
            s += '.0';
        }
        return s;
    }

    asBool(): boolean {
         return this.toNumber() !== 0;
    }
}

// Py_Int represents the Python Integer class. Integers are marshalled as 32 and
// 64 bit integers, but they are handled as 64 bit ints. This class follows the
// latter design by quietly handling the small ints.
export class Py_Int extends pytypes.Py_Object {
    private isInt: boolean = true;
    private value: gLong;
    constructor(val: gLong) {
        super();
        this.value = val;
    }

    // Integers are the narrowest of the numeric types. fromInt is a convenient
    // function for quickly making Py_Ints from JavaScript numbers.
    static fromInt(n: number): Py_Int {
        return new Py_Int(gLong.fromInt(n));
    }

    // Since they're so narrow, Ints really only care about operating on other
    // Ints. Anything else returns NotImplemented, indicating to the interpreter
    // that the reverse operation should be tried.
    private mathOp(other: any, op: (a: Py_Int, b: Py_Int) => Py_Int): any {
        if (other.isInt)
            return op(this, other);
        else
            return NIError;
    }

    // Reverse math ops will occur iff a `op` b => a doesn't implement op for
    // type b. For Ints, this rarely happens.
    private revMathOp(other: any, op: (a: Py_Int, b: Py_Int) => any): any {
        if (other.isInt)
            return op(other, this);
        else
            return NIError;
    }

    // The following are very self explanatory.
    add(other: any): any {
        return this.mathOp(other, function(a, b) {
            return new Py_Int(a.value.add(b.value));
        });
    }

    sub(other: any): any {
        return this.mathOp(other, function(a, b) {
            return new Py_Int(a.value.subtract(b.value));
        });
    }

    mult(other: any): any {
        return this.mathOp(other, function(a, b) {
            return new Py_Int(a.value.multiply(b.value));
        });
    }

    floordiv(other: any): any {
        return this.mathOp(other, function(a, b) {
            if (b.value.isZero())
                throw new Error("Division by 0");
            return new Py_Int(a.value.div(b.value));
        });
    }

    // Future division is always in effect
    div(other: any): any {
        return this.truediv(other);
    }

    // Since truediv has to return a Float, we automatically cast this Py_Int ot
    // a Float and call truediv again.
    truediv(other: any): any {
        // Do this / (float)other
        return Py_Float.fromPy_Int(this).truediv(other);
        // return this.mathOp(other, function(a, b) {
        //     return Py_Float.fromPy_Int(new Py_Int(a.div(b.value)));
        // });
    }

    // Python modulo follows certain rules not seen in other languages.
    // 1. (a % b) has the same sign as b
    // 2. a == (a // b) * b + (a % b)
    // These are useful for defining modulo for different types though
    mod(other: any): any {
        return this.mathOp(other, function(a, b) {
            if (b.value.isZero())
                throw new Error("Modulo by 0 is not allowed");
            return a.sub(b.mult(a.floordiv(b)));
        });
    }

    divmod(other: any): any {
        return [this.floordiv(other), this.mod(other)];
    }

    // gLong, the underlying type for Py_Int, doesn't have a power function.
    // This simple and naive implementation limits us to positive powers,
    // though we cheat by calling Float for negative powers. Fractional powers
    // should also work thanks to rpow.
    pow(other: any): any {
        if (other.isInt && other.value.isNegative()) {
            return Py_Float.fromPy_Int(this).pow(other);
        } else {
            return this.mathOp(other, function(a, b) {
                var res = a.value;
                var x = gLong.ONE;
                for (x; x.lessThan(b.value); x = x.add(gLong.ONE)) {
                    res = res.multiply(a.value);
                }
                return new Py_Int(res);
            });
        }
    }

    lshift(other: any): any {
        return this.mathOp(other, function(a, b) {
            return new Py_Int(a.value.shiftLeft(b.toNumber()));
        });
    }

    rshift(other: any): any {
        return this.mathOp(other, function(a, b) {
            return new Py_Int(a.value.shiftRight(b.toNumber()));
        });
    }

    and(other: any): any {
        return this.mathOp(other, function(a, b) {
            return new Py_Int(a.value.and(b.value));
        });
    }

    xor(other: any): any {
        return this.mathOp(other, function(a, b) {
            return new Py_Int(a.value.xor(b.value));
        });
    }

    or(other: any): any {
        return this.mathOp(other, function(a, b) {
            return new Py_Int(a.value.or(b.value));
        });
    }

    // Reverse mathematical operations are exactly the same as the above except
    // they have reversed arguments. There was probably a neater implementation
    // of this, but I kept confusing myself while trying to think of it.
    radd(other: any): any {
        return this.mathOp(other, function(a, b) {
            return new Py_Int(a.value.add(b.value));
        });
    }

    rsub(other: any): any {
        return this.mathOp(other, function(a, b) {
            return new Py_Int(a.value.subtract(b.value));
        });
    }

    rmult(other: any): any {
        return this.mathOp(other, function(a, b) {
            return new Py_Int(a.value.multiply(b.value));
        });
    }

    rfloordiv(other: any): any {
        return this.mathOp(other, function(a, b) {
            if (b.value.isZero())
                throw new Error("Division by 0");
            return new Py_Int(a.value.div(b.value));
        });
    }

    rdiv(other: any): any {
        return this.rtruediv(other);
    }

    rtruediv(other: any): any {
        return Py_Float.fromPy_Int(this).rtruediv(other);
        // return this.mathOp(other, function(a, b) {
        //     return Py_Float.fromPy_Int(new Py_Int(a.div(b.value)));
        // });
    }

    rmod(other: any): any {
        return this.mathOp(other, function(a, b) {
            if (b.value.isZero())
                throw new Error("Modulo by 0 is not allowed");
            return new Py_Int(a.value.modulo(b.value));
            // return a.sub(b.mult(a.floordiv(b)));
        });
    }

    rdivmod(other: any): any {
        return this.mathOp(other, function(a, b) {
            return a.div(b).mod(b);
        });
    }

    rpow(other: any): any {
        if (other.isInt && other.value.isNegative()) {
            return Py_Float.fromPy_Int(this).rpow(other);
        } else {
            return this.mathOp(other, function(a, b) {
                var res = a;
                var x = gLong.ONE;
                for (x; x.lessThan(b.value); x = x.add(gLong.ONE)) {
                    res = res.mult(a);
                }
                return res;
            });
        }
    }

    rlshift(other: any): any {
        return this.mathOp(other, function(a, b) {
            return new Py_Int(a.value.shiftLeft(b.toNumber()));
        });
    }

    rrshift(other: any): any {
        return this.mathOp(other, function(a, b) {
            return new Py_Int(a.value.shiftRight(b.toNumber()));
        });
    }

    rand(other: any): any {
        return this.mathOp(other, function(a, b) {
            return new Py_Int(a.value.and(b.value));
        });
    }

    rxor(other: any): any {
        return this.mathOp(other, function(a, b) {
            return new Py_Int(a.value.xor(b.value));
        });
    }

    ror(other: any): any {
        return this.mathOp(other, function(a, b) {
            return new Py_Int(a.value.or(b.value));
        });
    }

    // Negation is obvious and simple.
    neg(): Py_Int {
        return this.mult(Py_Int.fromInt(-1));
    }

    // Apparently unary plus doesn't really do much.
    // Presumably you can do more with it in user-defined classes.
    pos(): Py_Int {
        return this
    }

    abs(): Py_Int {
        if (this.value.isNegative())
            return this.neg();
        else
            return this;
    }

    invert(): Py_Int {
        return new Py_Int(this.value.not());
    }

    // Rich comparison operations are used to compare the various numeric types.
    // Like the above mathops, they need to be able to handle arguments of
    // different types.
    // Note that there are no rop functions. Instead, the functions mirror each
    // other: a.lt(b) == b.gt(a), a.eq(b) == b.eq(a), etc.
    private cmpOp(other: any, op: (a: gLong, b: gLong) => any): any {
        if (other.isInt)
            return op(this.value, other.value);
        else
            return NIError;
    }

    lt(other): boolean {
        return this.cmpOp(other, function(a, b) { return a.lessThan(b); });
    }

    le(other): boolean {
        return this.cmpOp(other, function(a, b) {
            return a.lessThanOrEqual(b);
        });
    }

    eq(other): boolean {
        return this.cmpOp(other, function(a, b) { return a.equals(b); });
    }

    ne(other): boolean {
        return this.cmpOp(other, function(a, b) { return a.notEquals(b); });
    }

    gt(other): boolean {
        return this.cmpOp(other, function(a, b) {
            return a.greaterThan(b);
        });
    }

    ge(other): boolean {
        return this.cmpOp(other, function(a, b) {
            return a.greaterThanOrEqual(b);
        });
    }

    toString(): string {
        return this.value.toString();
    }

    toNumber(): number {
        return this.value.toNumber();
    }

    asBool(): boolean {
         return this.toNumber() !== 0;
    }
}

export class Py_Long extends pytypes.Py_Object {
    isLong: boolean = true;
    value: Decimal;
    constructor(val: Decimal) {
        super();
        this.value = val;
    }

    // Long is a step above integer in the hierarchy. They represent
    // arbitrary-precision decimal numbers.
    static fromInt(n: number) {
        var d = new Decimal(n);
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

    asBool(): boolean {
         return !this.eq(Py_Long.fromInt(0));
    }
}

// Py_Complex models Python Complex numbers. These are stored as 2
// floating-point numbers, one each for the real and imaginary components.
// Complex is the "widest" of Python's numeric types, which means any operation
// between another number and a complex will (most likely) recast the other
// number as a Complex.
export class Py_Complex extends pytypes.Py_Object {
    isComplex: boolean = true;
    real: Py_Float;
    imag: Py_Float;
    constructor(real: Py_Float, imag: Py_Float) {
        super();
        this.real = real;
        this.imag = imag;
    }

    // fromNumber creates a new complex number from 1 or 2 JS numbers.
    // This is simple since Py_Floats are just wrappers around JS numbers.
    static fromNumber(r: number, i = 0) {
        return new Py_Complex(new Py_Float(r), new Py_Float(i));
    }

    // The following three functions are used to widen other numbers to Complex.
    static fromPy_Int(n: Py_Int): Py_Complex {
        return new Py_Complex(Py_Float.fromPy_Int(n), new Py_Float(0));
    }

    static fromPy_Long(n: Py_Long): Py_Complex {
        return new Py_Complex(Py_Float.fromPy_Long(n), new Py_Float(0));
    }

    static fromPy_Float(n: Py_Float): Py_Complex {
        return new Py_Complex(n, new Py_Float(0));
    }

    // All mathematical operations on Complex numbers must accept any other
    // Python numbers (Int, Long and Float). Therefore, this 'wrapper' is used
    // to handle the common case of casting the other argument to a Complex.
    private mathOp(other: any, op: (a: Py_Complex, b: Py_Complex) => any): any {
        if (other.isInt)
            return op(this, Py_Complex.fromPy_Int(other));
        else if (other.isLong)
            return op(this, Py_Complex.fromPy_Long(other));
        else if (other.isFloat)
            return op(this, Py_Complex.fromPy_Float(other));
        else if (other.isComplex)
            return op(this, other);
        else
            return NIError;
    }

    // Reverse math ops will occur iff a `op` b => a doesn't implement op for
    // type b. For longs, this should occur for a: Py_Int, b: Py_Long
    // Therefore, these should do c: Py_Long = Py_Long(a), c `op` b
    private revMathOp(other: any, op: (a: Py_Complex, b: Py_Complex)=>any): any {
        if (other.isInt)
            return op(Py_Complex.fromPy_Int(other), this);
        else if (other.isLong)
            return op(Py_Complex.fromPy_Long(other), this);
        else if (other.isFloat)
            return op(Py_Complex.fromPy_Float(other), this);
        else if (other.isComplex)
            return op(other, this);
        else
            return NIError;
    }

    // The following operations should be self explanatory.
    add(other: any): any {
        return this.mathOp(other, function(a, b) {
            return new Py_Complex(a.real.add(b.real), a.imag.add(b.imag));
        });
    }

    sub(other: any): any {
        return this.mathOp(other, function(a, b) {
            return new Py_Complex(a.real.sub(b.real), a.imag.sub(b.imag));
        });
    }

    // Multiplication and division are weird on Complex numbers. Wikipedia is a
    // good primer on the subject.
    mult(other: any): any {
        return this.mathOp(other, function(a, b) {
            var r, i: Py_Float;
            r = a.real.mult(b.real).sub(a.imag.mult(b.imag));
            i = a.imag.mult(b.real).add(a.real.mult(b.imag));
            return new Py_Complex(r, i);
        });
    }

    floordiv(other: any): any {
        return this.mathOp(other, function(a, b) {
            if (b.real.value == 0 && b.imag.value == 0)
                throw new Error("Division by 0")
            var r, d: Py_Float;
            r = a.real.mult(b.real).add(a.imag.mult(b.imag));
            d = b.real.mult(b.real).add(b.imag.mult(b.imag));
            // Note: floor division always zeros the imaginary part
            return new Py_Complex(r.floordiv(d), new Py_Float(0));
        });
    }

    div(other: any): any {
        return this.truediv(other);
    }

    truediv(other: any): any {
        return this.mathOp(other, function(a, b) {
            if (b.real.value == 0 && b.imag.value == 0)
                throw new Error("Division by 0")
            var r, i, d: Py_Float;
            r = a.real.mult(b.real).add(a.imag.mult(b.imag));
            i = a.imag.mult(b.real).sub(a.real.mult(b.imag));
            d = b.real.mult(b.real).add(b.imag.mult(b.imag));
            return new Py_Complex(r.truediv(d), i.truediv(d));
        });
    }

    // Modulo is REALLY weird in Python. (a % b) will always have the sign of b,
    // and a = (a//b)*b + (a%b). Complex numbers make it worse, because they
    // only consider the real component of (a // b)
    mod(other: any): any {
        return this.mathOp(other, function(a, b) {
            if (b.real.value == 0 && b.imag.value == 0)
                throw new Error("Modulo by 0");
            else if (b.real.value == 0)
                return new Py_Complex(a.real, a.imag.mod(b.imag));
            else if (b.imag.value == 0)
                return new Py_Complex(a.real.mod(b.real), a.imag);
            else {
                var div = new Py_Complex(a.floordiv(b).real, new Py_Float(0));
                // See complexobject.c, because Python is weird
                // See Wikipedia: Modulo_operation#Modulo_operation_expression
                return a.sub(b.mult(div));
            }
        });
    }

    divmod(other: any): any {
        return this.mathOp(other, function(a, b) {
            return a.floordiv(b).mod(b);
        });
    }

    // Powers with complex numbers are weird. Could easily do integer powers w/
    // multiplication loops, but not negative or fractional powers.
    pow(other: any): any {
        return NIError;
        // return this.mathOp(other, function(a, b) {
        //     return new Py_Complex(a.real.add(b.real), a.imag.add(b.imag));
        // });
    }

    // The following are undefined for floats and therefore undefined for
    // complex
    // lshift(other: any): any {
    //     return NIError
    // }

    // rshift(other: any): any {
    //     return NIError
    // }

    // and(other: any): any {
    //    return NIError;
    // }

    // xor(other: any): any {
    //    return NIError;
    // }

    // or(other: any): any {
    //    return NIError;
    // }

    // Reverse operations. Same notes as above.
    radd(other: any): any {
        return this.revMathOp(other, function(a, b) {
            return new Py_Complex(a.real.add(b.real), a.imag.add(b.imag));
        });
    }

    rsub(other: any): any {
        return this.revMathOp(other, function(a, b) {
            return new Py_Complex(a.real.sub(b.real), a.imag.sub(b.imag));
        });
    }

    rmult(other: any): any {
        return this.revMathOp(other, function(a, b) {
            var r, i: Py_Float;
            r = a.real.mult(b.real).sub(a.imag.mult(b.imag));
            i = a.imag.mult(b.real).add(a.real.mult(b.imag));
            return new Py_Complex(r, i);
        });
    }

    rfloordiv(other: any): any {
        return this.revMathOp(other, function(a, b) {
            if (b.real.value == 0 && b.imag.value == 0)
                throw new Error("Division by 0")
            var r, i, d: Py_Float;
            r = a.real.mult(b.real).add(a.imag.mult(b.imag));
            i = a.imag.mult(b.real).sub(a.real.mult(b.imag));
            d = b.real.mult(b.real).add(b.imag.mult(b.imag));
            return new Py_Complex(r.floordiv(d), i.floordiv(d));
        });
    }

    rdiv(other: any): any {
        return this.rtruediv(other);
    }

    rtruediv(other: any): any {
        return this.revMathOp(other, function(a, b) {
            if (b.real.value == 0 && b.imag.value == 0)
                throw new Error("Division by 0")
            var r, i, d: Py_Float;
            r = a.real.mult(b.real).add(a.imag.mult(b.imag));
            i = a.imag.mult(b.real).sub(a.real.mult(b.imag));
            d = b.real.mult(b.real).add(b.imag.mult(b.imag));
            return new Py_Complex(r.truediv(d), i.truediv(d));
        });
    }

    rmod(other: any): any {
        return this.revMathOp(other, function(a, b) {
            if (b.real.value == 0 && b.imag.value == 0)
                throw new Error("Modulo by 0");
            else if (b.real.value == 0)
                return new Py_Complex(a.real, a.imag.mod(b.imag));
            else if (b.imag.value == 0)
                return new Py_Complex(a.real.mod(b.real), a.imag);
            else
                return a.sub(b.mult(a.floordiv(b)));
        });
    }

    rdivmod(other: any): any {
        return this.revMathOp(other, function(a, b) {
            return a.floordiv(b).mod(b);
        });
    }

    // Powers with complex numbers are weird. Could easily do integer powers w/
    // multiplication loops, but not negative or fractional powers.
    rpow(other: any): any {
        return NIError;
        // return this.revMathOp(other, function(a, b) {
        // });
    }

    // rlshift(other: any): any {
    //     return NIError
    // }

    // rrshift(other: any): any {
    //     return NIError
    // }

    // rand(other: any): any {
    // }

    // rxor(other: any): any {
    // }

    // ror(other: any): any {
    // }

    neg(): Py_Complex {
        return new Py_Complex(this.real.neg(), this.imag.neg());
    }

    pos(): Py_Complex {
        return this
    }

    // This is the standard definition for absolute value: The ABSOLUTE distance
    // of (a + bi) from 0. Therefore, hypotenuse.
    abs(): Py_Float {
        var r = this.real.value;
        var i = this.imag.value;
        return new Py_Float(Math.sqrt(r*r + i*i));
    }

    // This isn't implemented for floats in Python, apparently?
    // invert(): any {
    //     return NIError
    // }

    // Rich comparison ops
    // Python does not define an ordering for complex numbers

    // lt(other): any {
    //     return NIError;
    // }

    // le(other): any {
    //     return NIError;
    // }

    eq(other): boolean {
        return this.mathOp(other, function(a, b) {
            return (a.real.eq(b.real) && a.imag.eq(b.imag));
        });
    }

    ne(other): boolean {
        return this.mathOp(other, function(a, b) {
            return (a.real.ne(b.real) && a.imag.ne(b.imag));
        });
    }

    // gt(other): any {
    //     return NIError;
    // }

    // ge(other): any {
    //     return NIError;
    // }

    toString(): string {
        if (this.real.value == 0) {
            return `${this.imag.value}j`;
        }
        if (this.imag.value < 0) {
            return `(${this.real.value}-${-this.imag.value}j)`;
        }
        return `(${this.real.value}+${this.imag.value}j)`;
    }

    asBool(): boolean {
        return !(this.real.value === 0 && this.imag.value === 0);
    }
}
