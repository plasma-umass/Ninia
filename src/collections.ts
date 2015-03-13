import primitives = require('./primitives');
import iterator = require('./iterator');
import interfaces = require('./interfaces');
import enums = require('./enums');
import singletons = require('./singletons');
import Py_Object = primitives.Py_Object;
import Py_Int = primitives.Py_Int;
import Py_Long = primitives.Py_Long;
import Iterable = interfaces.Iterable;
import Iterator = interfaces.Iterator;
import IPy_Object = interfaces.IPy_Object;
import None = singletons.None;

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
}

export class Py_List extends Py_Object implements Iterable {
  private _list: IPy_Object[];
  constructor(lst: IPy_Object[]) {
    super();
    this._list = lst;
  }
  static fromIterable(x: Iterable) {
    var it = x.iter();
    var list = new Py_List([]);
    for (var val = it.next(); val != null; val = it.next()) {
        list._list.push(val);
    }
    return list;
  }
  public getType(): enums.Py_Type { return enums.Py_Type.LIST; }
  public len(): number {
    return this._list.length;
  }

  public append(args: IPy_Object[]): IPy_Object {
    this._list.push(args[0]);
    return None;
  }

  public iter(): Iterator {
    return new iterator.ListIterator(this._list);
  }
  public toString(): string {
    if (this._list.length == 0) {
      return '[]';
    }
    var s = '[';
    for (var i=0; i<this._list.length; i++) {
      s += this._list[i].__repr__();
      s += ', ';
    }
    // Remove last ', ' from the end.
    return s.slice(0, -2) + ']';
  }

  public asBool(): boolean {
    return this.len() !== 0;
  }
  private standardizeKey(key: IPy_Object): number {
    var fixedKey: number;
    switch (key.getType()) {
      case enums.Py_Type.INT:
      case enums.Py_Type.LONG:
        fixedKey = (<Py_Int | Py_Long> key).toNumber();
        break;
      default:
        fixedKey = parseInt(key.toString(), 10);
        break;
    }
    if (fixedKey < 0) fixedKey += this._list.length;
    return fixedKey;
  }

  public __add__(other: IPy_Object): Py_List {
    if (other instanceof Py_List) {
      return new Py_List(this._list.concat((<Py_List> other)._list));
    } else {
      throw new Error("???");
    }
  }
  public __len__(): Py_Int {
    return new Py_Int(this.len());
  }
  public __getitem__(key: IPy_Object): IPy_Object {
    if (key.getType() === enums.Py_Type.SLICE) {
      var slice = <Py_Slice> key,
        start = slice.start === None ? 0 : (<Py_Int> slice.start).toNumber(),
        stop = slice.stop === None ? this._list.length : (<Py_Int> slice.stop).toNumber();
      if (slice.step === None) {
        return new Py_List(this._list.slice(start, stop));
      } else {
        var newArr: IPy_Object[] = [], step = (<Py_Int> slice.step).toNumber(), i: number;
        for (i = start; i < stop; i += step) {
          newArr.push(this._list[i]);
        }
        return new Py_List(newArr);
      }
    } else {
      return this._list[this.standardizeKey(key)];
    }
  }
  public __setitem__(key: IPy_Object, val: IPy_Object): IPy_Object {
    this._list[this.standardizeKey(key)] = val;
    return None;
  }
  public __delitem__(key: IPy_Object): IPy_Object {
    // Delete is the same as splicing out the element and moving everything down
    this._list.splice(this.standardizeKey(key), 1);
    return None;
  }
}

export class Py_Tuple extends Py_Object implements Iterable {
  private _len: Py_Int;  // can't resize a tuple
  private _tuple: Py_Object[];
  constructor(t: Py_Object[]) {
    super();
    this._tuple = t;
    this._len = new Py_Int(t.length);
  }
  static fromIterable(x: Iterable) {
    var it = x.iter();
    var tuple = [];
    for (var val = it.next(); val != null; val = it.next()) {
        tuple.push(val);
    }
    return new Py_Tuple(tuple);
  }

  public len(): number {
      return this._len.toNumber();
  }

  public iter(): Iterator {
    return new iterator.ListIterator(this._tuple);
  }
  public toString(): string {
    if (this._tuple.length == 0) {
      return '()';
    }
    var s = '(';
    for (var i=0; i<this._tuple.length; i++) {
      s += this._tuple[i].__repr__();
      s += ', ';
    }
    // Remove last ', ' from the end.
    return s.slice(0, -2) + ')';
  }

  public asBool(): boolean {
    return this.len() !== 0;
  }

  public __len__(): Py_Int {
    return new Py_Int(this.len());
  }
}

export class Py_Dict extends Py_Object {
  private _keys: IPy_Object[];
  private _vals: { [name: string]: IPy_Object };
  constructor() {
    super();
    this._keys = [];
    this._vals = {};
  }
  public get(key: IPy_Object): IPy_Object {
    var h = key.hash();
    return this._vals[h];
  }
  public set(key: IPy_Object, val: IPy_Object): void {
    var h = key.hash();
    if (this._vals[h] === undefined) {
      this._keys.push(key);
    }
    this._vals[h] = val;
  }

  public len(): number {
      return this._keys.length;
  }
  public toString(): string {
    if (this._keys.length == 0) {
      return '{}';
    }
    var s = '{';
    for (var i=0; i<this._keys.length; i++) {
      var key = this._keys[i];
      var h = key.hash();
      var val = this._vals[h];
      s += key.__repr__() + ': ';
      s += val.__repr__() + ', ';
    }
    // trim off last ', '
    return s.slice(0, -2) + '}';
  }

  public asBool(): boolean {
    return this.len() !== 0;
  }

  public __len__(): Py_Int {
    return new Py_Int(this.len());
  }
}
