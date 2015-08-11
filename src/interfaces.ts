import {Py_Complex, Py_Float, Py_Int, Py_Long, Py_Object, Py_Str
       } from './primitives';
import {Py_Dict, Py_Tuple} from './collections';
import {Py_Type} from './enums';
import {Thread} from './threading';

/**
 * Generic stack frame interface.
 */
export interface IPy_FrameObj extends IPy_Object {
  back: IPy_FrameObj;
  globals: Py_Dict;
  locals: Py_Dict;
  
  exec(t: Thread): void;
  /**
   * PRECONDITION: The function associated with the stack frame is in the middle of a Python function call.
   * The argument is the return value from that function call.
   * 
   * This method does not re-start execution. exec() should be called sometime after this to resume execution.
   */
  resume(rv: IPy_Object, exc: IPy_Object): void;
  tryCatchException(t: Thread, exc: IPy_Object): boolean;
}

/**
 * Generic function interface implemented by bytecode and native functions.
 */
export interface IPy_Function extends IPy_Object {
  /**
   * Call the function on the given thread.
   */
  exec(t: Thread, caller: IPy_FrameObj, args: IPy_Object[], kwargs: Py_Dict): void;
  /**
   * [Helper function] Call the function on the given thread. Triggers the callback with the return value.
   * Primarily used in native functions.
   */
  exec_from_native(t: Thread, caller: IPy_FrameObj, args: IPy_Object[], kwargs: Py_Dict, cb: (rv: IPy_Object) => void): void;
}

/**
 * Generic interface implemented by all Python objects.
 * 
 * Functions not beginning with $ are synchronous, internal versions.
 */
export interface IPy_Object {
  getType(): Py_Type;
  hash(): number;
  asBool?(): boolean;
  
  __hash__?(): Py_Int;
  __repr__?(): Py_Str;
  __str__?(): Py_Str;
  
  $__hash__?: IPy_Function;
  $__repr__?: IPy_Function;
  $__str__?: IPy_Function;

  // Math functions
  __pos__?(t: Thread): IPy_Object;
  __neg__?(t: Thread): IPy_Object;
  __invert__?(t: Thread): IPy_Object;
  __abs__?(t: Thread): IPy_Object;
  __divmod__?(t: Thread, a: IPy_Object): Py_Tuple;
  __rdivmod__?(t: Thread, a: IPy_Object): Py_Tuple;
  __pow__?(t: Thread, a: IPy_Object): IPy_Object;
  __rpow__?(t: Thread, a: IPy_Object): IPy_Object;
  __mul__?(t: Thread, a: IPy_Object): IPy_Object;
  __rmul__?(t: Thread, a: IPy_Object): IPy_Object;
  __div__?(t: Thread, a: IPy_Object): IPy_Object;
  __rdiv__?(t: Thread, a: IPy_Object): IPy_Object;
  __mod__?(t: Thread, a: IPy_Object): IPy_Object;
  __rmod__?(t: Thread, a: IPy_Object): IPy_Object;
  __add__?(t: Thread, a: IPy_Object): IPy_Object;
  __radd__?(t: Thread, a: IPy_Object): IPy_Object;
  __sub__?(t: Thread, a: IPy_Object): IPy_Object;
  __rsub__?(t: Thread, a: IPy_Object): IPy_Object;
  __floordiv__?(t: Thread, a: IPy_Object): IPy_Object;
  __rfloordiv__?(t: Thread, a: IPy_Object): IPy_Object;
  __truediv__?(t: Thread, a: IPy_Object): IPy_Object;
  __rtruediv__?(t: Thread, a: IPy_Object): IPy_Object;
  __lshift__?(t: Thread, a: IPy_Object): IPy_Object;
  __rlshift__?(t: Thread, a: IPy_Object): IPy_Object;
  __rshift__?(t: Thread, a: IPy_Object): IPy_Object;
  __rrshift__?(t: Thread, a: IPy_Object): IPy_Object;
  __and__?(t: Thread, a: IPy_Object): IPy_Object;
  __rand__?(t: Thread, a: IPy_Object): IPy_Object;
  __xor__?(t: Thread, a: IPy_Object): IPy_Object;
  __rxor__?(t: Thread, a: IPy_Object): IPy_Object;
  __or__?(t: Thread, a: IPy_Object): IPy_Object;
  __ror__?(t: Thread, a: IPy_Object): IPy_Object;
  __iadd__?(t: Thread, a: IPy_Object): IPy_Object;
  __add__?(t: Thread, a: IPy_Object): IPy_Object;
  __ipow__?(t: Thread, a: IPy_Object): IPy_Object;
  
  $__pos__?: IPy_Function;
  $__neg__?: IPy_Function;
  $__invert__?: IPy_Function;
  $__abs__?: IPy_Function;
  $__divmod__?: IPy_Function;
  $__rdivmod__?: IPy_Function;
  $__pow__?: IPy_Function;
  $__ipow__?: IPy_Function;
  $__rpow__?: IPy_Function;
  $__mul__?: IPy_Function;
  $__rmul__?: IPy_Function;
  $__div__?: IPy_Function;
  $__rdiv__?: IPy_Function;
  $__mod__?: IPy_Function;
  $__rmod__?: IPy_Function;
  $__add__?: IPy_Function;
  $__radd__?: IPy_Function;
  $__sub__?: IPy_Function;
  $__rsub__?: IPy_Function;
  $__floordiv__?: IPy_Function;
  $__rfloordiv__?: IPy_Function;
  $__truediv__?: IPy_Function;
  $__rtruediv__?: IPy_Function;
  $__lshift__?: IPy_Function;
  $__rlshift__?: IPy_Function;
  $__rshift__?: IPy_Function;
  $__rrshift__?: IPy_Function;
  $__and__?: IPy_Function;
  $__rand__?: IPy_Function;
  $__xor__?: IPy_Function;
  $__rxor__?: IPy_Function;
  $__or__?: IPy_Function;
  $__ror__?: IPy_Function;
  $__iadd__?: IPy_Function;

  // Comparison functions
  __lt__?(a: IPy_Object): IPy_Object;
  __le__?(a: IPy_Object): IPy_Object;
  __eq__?(a: IPy_Object): IPy_Object;
  __ne__?(a: IPy_Object): IPy_Object;
  __gt__?(a: IPy_Object): IPy_Object;
  __ge__?(a: IPy_Object): IPy_Object;

  $__lt__?: IPy_Function;
  $__le__?: IPy_Function;
  $__eq__?: IPy_Function;
  $__ne__?: IPy_Function;
  $__gt__?: IPy_Function;
  $__ge__?: IPy_Function;

  // Sequence / mapping types
  /**
   * Called to implement the built-in function len(). Should return the length
   * of the object, an integer >= 0. Also, an object that doesn't define a
   * __nonzero__() method and whose __len__() method returns zero is considered
   * to be false in a Boolean context.
   */
  __len__?(): Py_Int;
  $__len__?: IPy_Function;
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
  __getitem__?(t: Thread, key: IPy_Object): IPy_Object;
  $__getitem__?: IPy_Function;
  /**
   * Called to implement assignment to self[key]. Same note as for
   * __getitem__(). This should only be implemented for mappings if the objects
   * support changes to the values for keys, or if new keys can be added, or for
   * sequences if elements can be replaced. The same exceptions should be raised
   * for improper key values as for the __getitem__() method.
   */
  __setitem__?(t: Thread, key: IPy_Object, value: IPy_Object): IPy_Object;
  $__setitem__?: IPy_Function;
  /**
   * Called to implement deletion of self[key]. Same note as for __getitem__().
   * This should only be implemented for mappings if the objects support removal
   * of keys, or for sequences if elements can be removed from the sequence. The
   * same exceptions should be raised for improper key values as for the
   * __getitem__() method.
   */
  __delitem__?(t: Thread, key: IPy_Object): IPy_Object;
  $__delitem__?: IPy_Function;
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
  next: () => IPy_Object;
}

// all iterables must support iter() and __contains__()
export interface Iterable extends IPy_Object {
  iter: () => Iterator;
  __contains__: (x: IPy_Object) => IPy_Object;
}
