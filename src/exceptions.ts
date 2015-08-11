// Exception classes
import {Py_Tuple, Py_Dict} from './collections';
import {Py_Object, Py_Str} from './primitives';
import {IPy_FrameObj, IPy_Object} from './interfaces';
import {Py_SyncNativeFuncObject} from './nativefuncobject';
import {Thread} from './threading';

export class BaseException extends Py_Object {
  $__dict__ = new Py_Dict(<any> this);
  $args: Py_Tuple;
  $message: Py_Str;
  $__mro__: Py_Tuple;
  $__call__: Py_SyncNativeFuncObject;
  $__getstate__: Py_SyncNativeFuncObject;
  $__setstate__: Py_SyncNativeFuncObject;

  constructor(args?: IPy_Object[]) {
    super();
    if (args) {
      this.$args = new Py_Tuple(args);
    }
  }
}
BaseException.prototype.$__mro__ = new Py_Tuple([BaseException.prototype, Py_Object.prototype]);
BaseException.prototype.$__call__ = new Py_SyncNativeFuncObject((t: Thread, f: IPy_FrameObj, args: IPy_Object[], kwargs: Py_Dict) => {
  return new BaseException(args);
});
BaseException.prototype.$__getstate__ = new Py_SyncNativeFuncObject((t: Thread, f: IPy_FrameObj, args: IPy_Object[], kwargs: Py_Dict) => {
  return this.$args;
});
BaseException.prototype.$__setstate__ = new Py_SyncNativeFuncObject((t: Thread, f: IPy_FrameObj, args: IPy_Object[], kwargs: Py_Dict) => {
  this.$__dict__ = kwargs;
  return kwargs;
});

// Helper for defining subclasses in python-land
function inherit(obj: typeof BaseException, superobj: typeof BaseException): void {
  var super_mro: any[] = superobj.prototype.$__mro__.toArray();
  var mro: any[] = Array.prototype.concat(obj.prototype, super_mro);
  obj.prototype.$__mro__ = new Py_Tuple(mro);
  obj.prototype.$__call__ = new Py_SyncNativeFuncObject(
    (t: Thread, f: IPy_FrameObj, args: IPy_Object[], kwargs: Py_Dict) => {
      return new obj(args);
     });
}

export class Exception extends BaseException {}
inherit(Exception, BaseException);

export class KeyboardInterrupt extends BaseException {}
inherit(KeyboardInterrupt, BaseException);

export class NameError extends Exception {}
inherit(NameError, Exception);

export class ArithmeticError extends Exception {}
inherit(ArithmeticError, Exception);

export class ZeroDivisionError extends Exception {}
inherit(ZeroDivisionError, ArithmeticError);

export class AttributeError extends Exception {}
inherit(AttributeError, Exception);

export class TypeError extends Exception {}
inherit(TypeError, Exception);

export class StopIteration extends Exception {}
inherit(StopIteration, Exception);

export class ThreadError extends Exception {}
inherit(ThreadError, Exception);