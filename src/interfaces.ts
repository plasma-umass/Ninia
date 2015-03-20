import enums = require('./enums');
import primitives = require('./primitives');
import Py_Object = primitives.Py_Object;
import Py_Int = primitives.Py_Int;
import Py_Long = primitives.Py_Long;
import Py_Float = primitives.Py_Float;
import Py_Complex = primitives.Py_Complex;
import Py_Str = primitives.Py_Str;

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

  // Math functions
  __pos__?(): IPy_Object;
  __neg__?(): IPy_Object;
  __invert__?(): IPy_Object;
  __abs__?(): IPy_Object;
  __divmod__?(a: IPy_Object): [Py_Object, Py_Object]; // XXX: Should return a tuple.
  __rdivmod__?(a: IPy_Object): [Py_Object, Py_Object]; // XXX: Should return a tuple.
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

  // Comparison functions
  __lt__?(a: IPy_Object): IPy_Object;
  __le__?(a: IPy_Object): IPy_Object;
  __eq__?(a: IPy_Object): IPy_Object;
  __ne__?(a: IPy_Object): IPy_Object;
  __gt__?(a: IPy_Object): IPy_Object;
  __ge__?(a: IPy_Object): IPy_Object;

  // Sequence / mapping types
  /**
   * Called to implement the built-in function len(). Should return the length
   * of the object, an integer >= 0. Also, an object that doesn't define a
   * __nonzero__() method and whose __len__() method returns zero is considered
   * to be false in a Boolean context.
   */
  __len__?(): Py_Int;
  /**
   * Called to implement evaluation of self[key]. For sequence types, the
   * accepted keys should be integers and slice objects. Note that the special
   * interpretation of negative indexes (if the class wishes to emulate a
   * sequence type) is up to the __getitem__() method. If key is of an
   * inappropriate type, TypeError may be raised; if of a value outside the set
   * of indexes for the sequence (after any special interpretation of negative
   * values), IndexError should be raised. Note: for loops expect that an
   * IndexError will be raised for illegal indexes to allow proper detection of
   * the end of the sequence.
   */
  __getitem__?(key: IPy_Object): IPy_Object;
  /**
   * Called to implement assignment to self[key]. Same note as for
   * __getitem__(). This should only be implemented for mappings if the objects
   * support changes to the values for keys, or if new keys can be added, or for
   * sequences if elements can be replaced. The same exceptions should be raised
   * for improper key values as for the __getitem__() method.
   */
  __setitem__?(key: IPy_Object, value: IPy_Object): IPy_Object;
  /**
   * Called to implement deletion of self[key]. Same note as for __getitem__().
   * This should only be implemented for mappings if the objects support removal
   * of keys, or for sequences if elements can be removed from the sequence. The
   * same exceptions should be raised for improper key values as for the
   * __getitem__() method.
   */
  __delitem__?(key: IPy_Object): IPy_Object;
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
