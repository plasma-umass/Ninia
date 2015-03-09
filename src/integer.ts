import gLong = require("../lib/gLong");
import singletons = require('./singletons');
var NIError = singletons.NotImplemented;
import Py_Float = require('./float');
import pytypes = require('./pytypes');

// Py_Int represents the Python Integer class. Integers are marshalled as 32 and
// 64 bit integers, but they are handled as 64 bit ints. This class follows the
// latter design by quietly handling the small ints.
class Py_Int extends pytypes.Py_Object {
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
}
export = Py_Int;
