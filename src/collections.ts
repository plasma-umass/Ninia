import pytypes = require('./pytypes');
import numeric = require('./numeric');
import iterator = require('./iterator');
import interfaces = require('./interfaces');
import Py_Int = numeric.Py_Int;
import Iterable = interfaces.Iterable;
import Iterator = interfaces.Iterator;
import IPy_Object = interfaces.IPy_Object;

export class Py_List extends pytypes.Py_Object implements Iterable {
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
  public len(): number {
    return this._list.length;
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
}

export class Py_Tuple extends pytypes.Py_Object implements Iterable {
  private _len: Py_Int;  // can't resize a tuple
  private _tuple: pytypes.Py_Object[];
  constructor(t: pytypes.Py_Object[]) {
    super();
    this._tuple = t;
    this._len = Py_Int.fromNumber(t.length);
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
}

export class Py_Dict extends pytypes.Py_Object {
  private _keys: IPy_Object[];
  private _vals: any;
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
}
