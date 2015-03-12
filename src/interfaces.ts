import enums = require('./enums');
import pytypes = require('./pytypes');
import numeric = require('./numeric');
import Py_Long = numeric.Py_Long;
import Py_Float = numeric.Py_Float;
import Py_Complex = numeric.Py_Complex;
import Py_Str = pytypes.Py_Str;

/**
 * Generic interface implemented by all Python objects.
 */
export interface IPy_Object {
  getType(): enums.Py_Type;
  hash(): number;
  asBool?(): boolean;
  // TODO: Stricter typing. And figure out what happens if a user-defined type fails to return the correct type.
  __repr__?(): Py_Str;
  __str__?(): Py_Str;
  __pos__?(): IPy_Object;
  __neg__?(): IPy_Object;
  __invert__?(): IPy_Object;
  __abs__?(): IPy_Object;
  __divmod__?(a: IPy_Object): [pytypes.Py_Object, pytypes.Py_Object]; // XXX: Should return a tuple.
  __rdivmod__?(a: IPy_Object): [pytypes.Py_Object, pytypes.Py_Object]; // XXX: Should return a tuple.
  __pow__?(a: IPy_Object): IPy_Object;
  __rpow__?(a: IPy_Object): IPy_Object;
  __mul__?(a: IPy_Object): IPy_Object;
  __rmul__?(a: IPy_Object): IPy_Object;
  __div__?(a: IPy_Object): IPy_Object;
  __rdiv__?(a: IPy_Object): IPy_Object;
  __mod__?(a: IPy_Object): IPy_Object;
  __rmod__?(a: IPy_Object): IPy_Object;
  __add__?(a: IPy_Object): IPy_Object;
  __radd__?(a: IPy_Object): IPy_Object;
  __sub__?(a: IPy_Object): IPy_Object;
  __rsub__?(a: IPy_Object): IPy_Object;
  __floordiv__?(a: IPy_Object): IPy_Object;
  __rfloordiv__?(a: IPy_Object): IPy_Object;
  __truediv__?(a: IPy_Object): IPy_Object;
  __rtruediv__?(a: IPy_Object): IPy_Object;
  __lshift__?(a: IPy_Object): IPy_Object;
  __rlshift__?(a: IPy_Object): IPy_Object;
  __rshift__?(a: IPy_Object): IPy_Object;
  __rrshift__?(a: IPy_Object): IPy_Object;
  __and__?(a: IPy_Object): IPy_Object;
  __rand__?(a: IPy_Object): IPy_Object;
  __xor__?(a: IPy_Object): IPy_Object;
  __rxor__?(a: IPy_Object): IPy_Object;
  __or__?(a: IPy_Object): IPy_Object;
  __ror__?(a: IPy_Object): IPy_Object;
  __iadd__?(a: IPy_Object): IPy_Object;
  __add__?(a: IPy_Object): IPy_Object;
  __lt__?(a: IPy_Object): typeof numeric.True;
  __le__?(a: IPy_Object): typeof numeric.True;
  __eq__?(a: IPy_Object): typeof numeric.True;
  __ne__?(a: IPy_Object): typeof numeric.True;
  __gt__?(a: IPy_Object): typeof numeric.True;
  __ge__?(a: IPy_Object): typeof numeric.True;
}

/**
 * Generic interface implemented by all numeric types.
 */
export interface IPy_Number extends IPy_Object {
  asLong?(): Py_Long;
  asFloat?(): Py_Float;
  asComplex?(): Py_Complex;
}

// all iterators must support next()
export interface Iterator extends IPy_Object {
    next: () => any;
}

// all iterables must support iter()
export interface Iterable extends IPy_Object {
    iter: () => Iterator;
}
