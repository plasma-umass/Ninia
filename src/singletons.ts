// This file is split apart from builtins.ts to avoid circular dependencies.

// We don't export this, so our instances will be singleton-ish.
class SingletonClass {
    constructor(private name: string) {}
    toString(): string {
        return this.name;
    }
}

// Python has a single null object called "None".
class NoneType extends SingletonClass{
      asBool(): boolean {
          return false;          
      }
}
export var None = new NoneType("None");

// Ellipsis is the object corresponding to the ... syntax.
export var Ellipsis = new SingletonClass("Ellipsis");

// Python uses "NotImplemented" to signal that some operation (e.g. addition,
// less-than) is not supported for a particular set of arguments. Typically the
// reverse operation is tried (e.g. add => radd). If that also returns
// NotImplemented, the interpreter throws an error.
export var NotImplemented = new SingletonClass("NotImplemented");
