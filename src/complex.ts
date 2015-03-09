import singletons = require('./singletons');
var NIError = singletons.NotImplemented;
import Py_Int = require('./integer');
import Py_Long = require('./long');
import Py_Float = require('./float');
import pytypes = require('./pytypes');

// Py_Complex models Python Complex numbers. These are stored as 2
// floating-point numbers, one each for the real and imaginary components.
// Complex is the "widest" of Python's numeric types, which means any operation
// between another number and a complex will (most likely) recast the other
// number as a Complex.
class Py_Complex extends pytypes.Py_Object {
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
}
export = Py_Complex;
