/// <reference path="../bower_components/DefinitelyTyped/decimal.js/decimal.js.d.ts" />
import singletons = require('./singletons');
import enums = require('./enums');
import NIError = singletons.NotImplemented;
import None = singletons.None;
import interfaces = require('./interfaces');
import IPy_Number = interfaces.IPy_Number;
import IPy_Object = interfaces.IPy_Object;
import Decimal = require('decimal.js');

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

export class Py_Slice extends Py_Object {
  public start: IPy_Object;
  public stop: IPy_Object;
  public step: IPy_Object;

  constructor(start: IPy_Object, stop: IPy_Object, step: IPy_Object) {
    super();
    this.start = start;
    this.stop = stop;
    this.step = step;
  }

  public getType(): enums.Py_Type {
    return enums.Py_Type.SLICE;
  }

  public getIndices(length: number) : {start: number; stop: number; step: number; length:number; }{
    var res : {start: number; stop: number; step: number; length:number; } = {start: 0, stop: 0, step: 0, length: 0};
    res.step = this.step === None ? 1 : (<Py_Int | Py_Long> this.step).toNumber();
    var defstart = res.step < 0 ? length - 1 : 0;
    var defstop = res.step < 0 ? -1 : length;

    if (this.start === None) {
      res.start = defstart;
    } else {
      res.start = (<Py_Int | Py_Long> this.start).toNumber();
      if (res.start < 0) {
        res.start += length;
      }
      if (res.start < 0) {
        res.start = (res.step < 0)  ? -1 : 0;
      }
      if (res.start >= length){
        res.start = (res.step < 0) ? length - 1 : length;
      }
    }

    if (this.stop === None) {
      res.stop = defstop;
    } else {
      res.stop = (<Py_Int | Py_Long> this.stop).toNumber();
      if (res.stop < 0) {
        res.stop += length;
      }
      if (res.stop < 0) {
        res.stop = (res.step < 0) ? -1 : 0;
      }
      if (res.stop >= length) {
        res.stop = (res.step < 0) ? length - 1 : length;
      }
    }

    if ((res.step < 0 && res.stop >= res.start)
        || (res.step > 0 && res.start >= res.stop)) {
      res.length = 0;
    }
    else if (res.step < 0) {
      res.length = Math.floor((res.stop - res.start + 1)/res.step) + 1;
    }
    else {
      res.length = Math.floor((res.stop-res.start-1)/res.step) + 1;
    }
    return res;
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
    public len(): number {
      return this._str.length;
    }

    public toString(): string {
        return this._str;
    }
    public asBool(): boolean {
        return this.len() !== 0;
    }

    /** Python-visible functions **/
    public __repr__(): Py_Str {
        return Py_Str.fromJS(`'${this._str}'`);
    }
    public __str__(): Py_Str {
        return this;
    }
    public __len__(): Py_Int {
        return new Py_Int(this._str.length);
    }
    public __eq__(other: IPy_Object): IPy_Object {
      if (other instanceof Py_Str) {
        var cmp = this._str.localeCompare(other.toString());
        return Py_Boolean.fromJS(cmp == 0);
      }
      return NIError;
    }
    public __lt__(other: IPy_Object): IPy_Object {
      if (other instanceof Py_Str) {
        var cmp = this._str.localeCompare(other.toString());
        return Py_Boolean.fromJS(cmp < 0);
      }
      return NIError;
    }
    public __getitem__(idx: IPy_Object): IPy_Object {
      if (idx instanceof Py_Int) {
        var i = (<Py_Int> idx).toNumber();
        if (i < 0) {
          i += this.len();
        }
        return Py_Str.fromJS(this._str[i]);
      } else if (idx instanceof Py_Slice) {
        var indices = (<Py_Slice> idx).getIndices(this.len());
        if (indices.step !== 1) {
          throw new Error('String slicing with step != 1 is NYI');
        }
        return Py_Str.fromJS(this._str.slice(indices.start, indices.stop));
      }
      throw new Error(`ValueError: cannot subscript str with ${idx}`);
    }
    public __add__(other: IPy_Object): IPy_Object {
      if (other instanceof Py_Str) {
        return Py_Str.fromJS(this._str + other.toString());
      }
      return singletons.NotImplemented;
    }
    public __mod__(other: IPy_Object): Py_Str {
      // string formatting!
      // This arcane regex matches (most) valid format patterns
      // TODO: support the * syntax in the field width / precision sections.
      var p = /%(\(\w*\))?([#0`+ -])?(\d+)?(\.\d+)?[hlL]?([diouxXeDfFgGcrs%])/g;
      var matches = this._str.match(p);
      var num_matches = (matches === null)? 0 : matches.length;
      var fmt;
      var s = '', idx = 0, rhs_idx = 0;
      while ((fmt = p.exec(this._str)) !== null) {
        s += this._str.slice(idx, fmt.index);
        var obj: IPy_Object;
        if (rhs_idx == 0 && num_matches == 1) {
          obj = other;
        } else {
          obj = other.__getitem__(new Py_Int(rhs_idx));
          rhs_idx++;
        }
        s += format(fmt[1], fmt[2], fmt[3], fmt[4], fmt[5], obj);
        idx = p.lastIndex;
      }
      s += this._str.slice(idx);
      return Py_Str.fromJS(s);
    }
}

function format(mapping: string, conv_flags: string, field_width: string,
                precision: string, conv_type: string, obj: IPy_Object): string {
  // XXX: really hacky attempt at covering the common cases
  switch (conv_type) {
    case 's': return obj.__str__().toString();
    case 'r': return obj.__repr__().toString();
    case 'd': return ((<IPy_Number>obj).asLong().toNumber()|0).toString();
    case 'f':
      var x = (<IPy_Number>obj).asFloat().toNumber();
      if (precision !== undefined) {
        return x.toFixed(+precision.slice(1));
      }
      return x.toString();
  }
  return '';
}

function widenTo(a: IPy_Number, widerType: enums.Py_Type): IPy_Number {
  switch (widerType) {
    case enums.Py_Type.LONG:
      return a.asLong();
    case enums.Py_Type.FLOAT:
      return a.asFloat();
    case enums.Py_Type.COMPLEX:
      return a.asComplex();
    // Default case should never happen.
  }
}

/**
 * Template function for math operations. Widens either a or b to the others'
 * type before executing the math operation. We use a regular expression to
 * replace the function name in the generated version.
 */
function generateMathOp(name: string): (b: IPy_Number) => IPy_Number | typeof NIError {
  return eval(`(function() { return function(b) {
      var a = this,
        bType = b.getType(),
        aType = a.getType(),
        typeDiff = aType - bType;
      if (bType > ${enums.Py_Type.COMPLEX}) {
        // b is not a number.
        return NIError;
      } else if (typeDiff > 0) {
        // a is wider than b
        b = widenTo(b, aType);
      } else if (typeDiff < 0) {
        // b is wider than a
        a = widenTo(a, bType);
      }
      return a.${name}(b);
    }
  })()`);
}

// Py_Int represents the Python Integer class. Integers are marshalled as 32 and
// 64 bit integers, but they are handled as 64 bit ints. This class follows the
// latter design by quietly handling the small ints.
export class Py_Int extends Py_Object implements IPy_Number {
    protected value: number;
    constructor(val: number) {
        super();
        this.value = val;
    }

    getType(): enums.Py_Type { return enums.Py_Type.INT; }
    asLong(): Py_Long {
      return new Py_Long(new Decimal(this.value));
    }
    asFloat(): Py_Float {
      return new Py_Float(this.value);
    }
    asComplex(): Py_Complex {
      return new Py_Complex(this.asFloat(), new Py_Float(0));
    }

    // The following are very self explanatory.
    add(other: Py_Int): Py_Int { return new Py_Int((this.value + other.value) | 0); }
    sub(other: Py_Int): Py_Int { return new Py_Int((this.value - other.value) | 0); }
    mul(other: Py_Int): Py_Int { return new Py_Int((this.value * other.value) | 0); }
    floordiv(other: Py_Int): Py_Int {
      if (other.value === 0)
          throw new Error("Division by 0");
      return new Py_Int((this.value / other.value) | 0);
    }

    // Future division is always in effect
    div(other: Py_Int): Py_Float { return this.truediv(other); }

    // Since truediv has to return a Float, we automatically cast this Py_Int to
    // a Float and call truediv again.
    truediv(other: Py_Int): Py_Float {
      // TODO: Just do the division here.
      return this.asFloat().truediv(other.asFloat());
    }

    // Python modulo follows certain rules not seen in other languages.
    // 1. (a % b) has the same sign as b
    // 2. a == (a // b) * b + (a % b)
    // These are useful for defining modulo for different types though
    mod(other: Py_Int): Py_Int {
      var a = this.value, b = other.value;
      if (b === 0)
        throw new Error("Modulo by 0 is not allowed");
      var res = (a - (b * Math.floor(a / b))) | 0;
      return new Py_Int(res);
    }

    divmod(other: Py_Int): [Py_Int, Py_Int] {
        return [this.floordiv(other), this.mod(other)];
    }

    pow(other: Py_Int): Py_Float | Py_Int {
      var res = Math.pow(this.value, other.value);
      if ((res|0) != res) {
        return new Py_Float(res);
      }
      return new Py_Int(res | 0);
    }

    lshift(other: Py_Int): Py_Int {
      return new Py_Int(this.value << other.value);
    }

    rshift(other: Py_Int): Py_Int {
      return new Py_Int(this.value >> other.value);
    }

    and(other: Py_Int): Py_Int {
      return new Py_Int(this.value & other.value);
    }

    xor(other: Py_Int): Py_Int {
      return new Py_Int(this.value ^ other.value);
    }

    or(other: Py_Int): Py_Int {
      return new Py_Int(this.value | other.value);
    }

    // Negation is obvious and simple.
    __neg__(): Py_Int {
      return new Py_Int((this.value * -1) | 0);
    }

    // Apparently unary plus doesn't really do much.
    // Presumably you can do more with it in user-defined classes.
    __pos__(): Py_Int {
      return this;
    }

    __abs__(): Py_Int {
      if (this.value < 0)
        return this.__neg__();
      else
        return this;
    }

    __invert__(): Py_Int {
      return new Py_Int(~this.value);
    }

    lt(other: Py_Int): Py_Boolean {
      return this.value < other.value ? True : False;
    }
    le(other: Py_Int): Py_Boolean {
      return this.value <= other.value ? True : False;
    }
    eq(other: Py_Int): Py_Boolean {
      return this.value === other.value ? True : False;
    }
    ne(other: Py_Int): Py_Boolean {
      return this.value !== other.value ? True : False;
    }
    gt(other: Py_Int): Py_Boolean {
      return this.value > other.value ? True : False;
    }
    ge(other: Py_Int): Py_Boolean {
      return this.value >= other.value ? True : False;
    }

    toString(): string {
      return this.value.toString();
    }

    toNumber(): number {
      return this.value;
    }

    asBool(): boolean {
      return this.toNumber() !== 0;
    }
}

class Py_Boolean extends Py_Int {
  constructor(val: boolean) {
    super(val ? 1 : 0);
  }
  static fromJS(x: boolean): Py_Boolean {
    return x? True : False;
  }
  toString(): string {
    return this.value === 1 ? 'True' : 'False';
  }
}

// Boolean singletons.
export var True = new Py_Boolean(true);
export var False = new Py_Boolean(false);

var MAX_INT = new Decimal('9007199254740991');
var MIN_INT = new Decimal('-9007199254740991');

export class Py_Long extends Py_Object implements IPy_Number {
    value: decimal.Decimal;
    constructor(val: decimal.Decimal) {
        super();
        this.value = val;
    }

    getType(): enums.Py_Type { return enums.Py_Type.LONG; }
    asLong(): Py_Long {
      return this;
    }
    asFloat(): Py_Float {
      return new Py_Float(this.value.toNumber());
    }
    asComplex(): Py_Complex {
      return new Py_Complex(this.asFloat(), new Py_Float(0));
    }

    // Long is a step above integer in the hierarchy. They represent
    // arbitrary-precision decimal numbers.
    static fromNumber(n: number) {
        var d = new Decimal(n);
        return new Py_Long(d);
    }

    // fromString allows us to leverage the power of the underlying Decimal
    // class to easily convert from Py_Int to Py_Long.
    static fromString(s: string) {
        var d = new Decimal(s);
        return new Py_Long(d);
    }

    // The following should be self explanatary, to an extent.
    add(other: Py_Long): Py_Long {
      return new Py_Long(this.value.plus(other.value));
    }

    sub(other: Py_Long): Py_Long {
      return new Py_Long(this.value.minus(other.value));
    }

    mul(other: Py_Long): Py_Long {
      return new Py_Long(this.value.times(other.value));
    }

    // Note: The Decimal type DOES have a divideToInteger function. In Python,
    // the floor division operator always rounds towards negative infinity.
    // Therefore, the slightly longer div(...).floor() method chain should be
    // used.
    floordiv(other: Py_Long): Py_Long {
      if (other.value.isZero())
        throw new Error("Division by 0");
      return new Py_Long(this.value.div(other.value).floor());
    }

    // True division, always.
    div(other: Py_Long): Py_Long {
        return this.truediv(other);
    }

    truediv(other: Py_Long): Py_Long {
      if (other.value.isZero())
        throw new Error("Division by 0");
      return new Py_Long(this.value.div(other.value));
    }

    // As stated previously, Python's unusual mod rules come into play here.
    // (a % b) has b's sign, and a == (a // b) * b + (a % b)
    mod(other: Py_Long): Py_Long {
      if (other.value.isZero())
        throw new Error("Modulo by 0");
      return this.sub(other.mul(this.floordiv(other)));
    }

    divmod(other: Py_Long): Py_Long[] {
      return [this.floordiv(other), this.mod(other)];
    }

    // Thankfully, Decimal has a toPower function.
    pow(other: Py_Long): Py_Long {
      return new Py_Long(this.value.toPower(other.value));
    }

    // These are a bitty "hacky" but they get the job done.
    lshift(other: Py_Long): Py_Long {
      return new Py_Long(this.value.times(Decimal.pow(2, other.value)));
    }

    rshift(other: Py_Long): Py_Long {
      return new Py_Long(this.value.divToInt(Decimal.pow(2, other.value)));
    }

    // And, Xor and Or require messing with the guts of Decimal
    // Totally doable, but for now, not implemented
    // Future reference: Decimal's 'c' field is number[] (array of digits)
    // res[i] = a[i] | b[i]
    // But might need to treat negative numbers differently?
    and(other: Py_Long): Py_Long {
      if (this.fitsInJsNumber() && other.fitsInJsNumber()) {
        return Py_Long.fromNumber(this.toNumber() & other.toNumber());
      }
      throw new Error('Py_Long __and__ for wide numbers is NYI');
    }
    xor(other: Py_Long): Py_Long {
      if (this.fitsInJsNumber() && other.fitsInJsNumber()) {
        return Py_Long.fromNumber(this.toNumber() ^ other.toNumber());
      }
      throw new Error('Py_Long __xor__ for wide numbers is NYI');
    }
    or(other: Py_Long): Py_Long {
      if (this.fitsInJsNumber() && other.fitsInJsNumber()) {
        return Py_Long.fromNumber(this.toNumber() | other.toNumber());
      }
      throw new Error('Py_Long __or__ for wide numbers is NYI');
    }

    fitsInJsNumber(): boolean {
      return (this.value.lessThanOrEqualTo(MAX_INT) &&
              this.value.greaterThanOrEqualTo(MIN_INT));
    }

    __neg__(): Py_Long {
        return this.mul(Py_Long.fromString("-1"));
    }

    __pos__(): Py_Long {
        return this
    }

    __abs__(): Py_Long {
        if (this.value.isNegative())
            return this.__neg__();
        else
            return this;
    }

    // ~x = (-x) - 1 for integers, so we emulate that here
    __invert__(): Py_Long {
        return this.__neg__().sub(Py_Long.fromString("1"));
    }

    lt(other: Py_Long): Py_Boolean {
      return this.value.lessThan(other.value) ? True : False;
    }
    le(other: Py_Long): Py_Boolean {
      return this.value.lessThanOrEqualTo(other.value) ? True : False;
    }
    eq(other: Py_Long): Py_Boolean {
      return this.value.equals(other.value) ? True : False;
    }
    ne(other: Py_Long): Py_Boolean {
      return !this.value.equals(other.value) ? True : False;
    }
    gt(other: Py_Long): Py_Boolean {
      return this.value.greaterThan(other.value) ? True : False;
    }
    ge(other: Py_Long): Py_Boolean {
      return this.value.greaterThanOrEqualTo(other.value) ? True : False;
    }

    toString(): string {
      return this.value.toString() + 'L';
    }

    toNumber(): number {
      return this.value.toNumber();
    }

    __str__(): Py_Str {
      return Py_Str.fromJS(this.value.toString());
    }

    asBool(): boolean {
      return this.toNumber() !== 0;
    }
}


// Py_Float emulates the Python Floating-point numeric class. Py_Float is
// basically a wrapper around JavaScript's numbers.
// Note that edge cases with e.g. NaN, +/-Infinity are not really covered.
export class Py_Float extends Py_Object implements IPy_Number {
    // Public for Py_Complex
    value: number;
    constructor(val: number) {
        super();
        this.value = val;
    }

    getType(): enums.Py_Type { return enums.Py_Type.FLOAT; }
    asFloat(): Py_Float {
      return this;
    }
    asComplex(): Py_Complex {
      return new Py_Complex(this, new Py_Float(0));
    }

    // The following functions are dangerously self-explanatory
    add(other: Py_Float): Py_Float {
      return new Py_Float(this.value + other.value);
    }
    sub(other: Py_Float): Py_Float {
      return new Py_Float(this.value - other.value);
    }
    mul(other: Py_Float): Py_Float {
      return new Py_Float(this.value * other.value);
    }
    floordiv(other: Py_Float): Py_Float {
      if (other.value == 0)
        throw new Error("Division by 0");
      return new Py_Float(Math.floor(this.value / other.value));
    }
    div(other: Py_Float): Py_Float {
      return this.truediv(other);
    }
    truediv(other: Py_Float): Py_Float {
      if (other.value == 0)
        throw new Error("Division by 0");
      return new Py_Float(this.value / other.value);
    }
    // Modulo in Python has the following property: a % b) will always have the
    // sign of b, and a == (a//b)*b + (a%b).
    mod(other: Py_Float): Py_Float {
      if (other.value == 0)
        throw new Error("Modulo by 0");
      // TODO: Both are floats, can avoid creating unneeded intermediate objs.
      return this.sub(other.mul(this.floordiv(other)));
    }
    divmod(other: Py_Float): [Py_Float, Py_Float] {
      return [this.floordiv(other), this.mod(other)];
    }
    pow(other: Py_Float): Py_Float {
      return new Py_Float(Math.pow(this.value, other.value));
    }

    __neg__(): Py_Float {
      return this.mul(new Py_Float(-1));
    }

    __pos__(): Py_Float {
      return this
    }

    __abs__(): Py_Float {
      if (this.value < 0)
        return this.__neg__();
      else
        return this;
    }

    lt(other: Py_Float): Py_Boolean {
      return this.value < other.value ? True : False;
    }
    le(other: Py_Float): Py_Boolean {
      return this.value <= other.value ? True : False;
    }
    eq(other: Py_Float): Py_Boolean {
      return this.value == other.value ? True : False;
    }
    ne(other: Py_Float): Py_Boolean {
      return this.value != other.value ? True : False;
    }
    gt(other: Py_Float): Py_Boolean {
      return this.value > other.value ? True : False;
    }
    ge(other: Py_Float): Py_Boolean {
      return this.value >= other.value ? True : False;
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

// Py_Complex models Python Complex numbers. These are stored as 2
// floating-point numbers, one each for the real and imaginary components.
// Complex is the "widest" of Python's numeric types, which means any operation
// between another number and a complex will (most likely) recast the other
// number as a Complex.
export class Py_Complex extends Py_Object implements IPy_Number {
    // TODO: Does it make sense to eagerly make these floats, or lazily construct
    // floats from JavaScript numbers?
    real: Py_Float;
    imag: Py_Float;
    constructor(real: Py_Float, imag: Py_Float) {
      super();
      this.real = real;
      this.imag = imag;
    }

    getType(): enums.Py_Type { return enums.Py_Type.COMPLEX; }

    // fromNumber creates a new complex number from 1 or 2 JS numbers.
    // This is simple since Py_Floats are just wrappers around JS numbers.
    static fromNumber(r: number, i = 0) {
      return new Py_Complex(new Py_Float(r), new Py_Float(i));
    }

    // The following operations should be self explanatory.
    add(other: Py_Complex): Py_Complex {
      return new Py_Complex(this.real.add(other.real), this.imag.add(other.imag));
    }

    sub(other: Py_Complex): Py_Complex {
      return new Py_Complex(this.real.sub(other.real), this.imag.sub(other.imag));
    }

    // Multiplication and division are weird on Complex numbers. Wikipedia is a
    // good primer on the subject.
    mul(other: Py_Complex): Py_Complex {
      var r, i: Py_Float;
      r = this.real.mul(other.real).sub(this.imag.mul(other.imag));
      i = this.imag.mul(other.real).add(this.real.mul(other.imag));
      return new Py_Complex(r, i);
    }

    floordiv(other: Py_Complex): Py_Complex {
      if (other.real.value == 0 && other.imag.value == 0)
        throw new Error("Division by 0")
      var r, d: Py_Float;
      r = this.real.mul(other.real).add(this.imag.mul(other.imag));
      d = other.real.mul(other.real).add(other.imag.mul(other.imag));
      // Note: floor division always zeros the imaginary part
      return new Py_Complex(r.floordiv(d), new Py_Float(0));
    }

    div(other: Py_Complex): Py_Complex {
      return this.truediv(other);
    }

    truediv(other: Py_Complex): Py_Complex {
      if (other.real.value == 0 && other.imag.value == 0)
        throw new Error("Division by 0")
      var r, i, d: Py_Float;
      r = this.real.mul(other.real).add(this.imag.mul(other.imag));
      i = this.imag.mul(other.real).sub(this.real.mul(other.imag));
      d = other.real.mul(other.real).add(other.imag.mul(other.imag));
      return new Py_Complex(r.truediv(d), i.truediv(d));
    }

    // Modulo is REALLY weird in Python. (a % b) will always have the sign of b,
    // and a = (a//b)*b + (a%b). Complex numbers make it worse, because they
    // only consider the real component of (a // b)
    mod(other: Py_Complex): Py_Complex {
      if (other.real.value == 0 && other.imag.value == 0)
        throw new Error("Modulo by 0");
      else if (other.real.value == 0)
        return new Py_Complex(this.real, this.imag.mod(other.imag));
      else if (other.imag.value == 0)
        return new Py_Complex(this.real.mod(other.real), this.imag);
      else {
        var div = new Py_Complex(this.floordiv(other).real, new Py_Float(0));
        // See complexobject.c, because Python is weird
        // See Wikipedia: Modulo_operation#Modulo_operation_expression
        return this.sub(other.mul(div));
      }
    }

    divmod(other: Py_Complex): Py_Complex {
      return this.floordiv(other).mod(other);
    }

    // Powers with complex numbers are weird.
    // Fractional and complex powers are NYI.
    pow(other: Py_Complex): Py_Complex {
      var n = other.real.toNumber();
      if (other.imag.toNumber() == 0 && ((n|0) == n)) {
        var real = this.real.value;
        var imag = this.imag.value;
        // De Moivre's formula
        var r_n = Math.pow(Math.sqrt(real*real + imag*imag), n);
        var phi_n = Math.atan2(imag, real) * n;
        return Py_Complex.fromNumber(r_n*Math.cos(phi_n), r_n*Math.sin(phi_n));
      }
      throw new Error('Py_Complex __pow__ for non-integer powers is NYI');
    }

    __neg__(): Py_Complex {
      return new Py_Complex(this.real.__neg__(), this.imag.__neg__());
    }

    __pos__(): Py_Complex {
      return this
    }

    // This is the standard definition for absolute value: The ABSOLUTE distance
    // of (a + bi) from 0. Therefore, hypotenuse.
    __abs__(): Py_Float {
        var r = this.real.value;
        var i = this.imag.value;
        return new Py_Float(Math.sqrt(r*r + i*i));
    }

    eq(other): Py_Boolean {
      return (this.real.eq(other.real) === True && this.imag.eq(other.imag) === True) ? True : False;
    }

    ne(other): Py_Boolean {
      return (this.real.ne(other.real) === True && this.imag.ne(other.imag) === True) ? True : False;
    }

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

// Generate math ops.
[Py_Int, Py_Long, Py_Float, Py_Complex].forEach((numericType) => {
  ["add", "sub", "mul", "floordiv", "mod", "divmod", "pow", "lshift", "rshift",
   "and", "xor", "or", "div", "truediv", "lt", "le", "eq", "ne", "gt", "ge"]
   .forEach((opName) => {
     if (numericType.prototype[opName] !== undefined) {
       numericType.prototype[`__${opName}__`] = generateMathOp(opName);
     }
   });
});
