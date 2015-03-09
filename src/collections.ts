import pytypes = require('./pytypes');
import Py_Int = require('./integer');
import iterator = require('./iterator');

// all iterables must support iter()
export interface Iterable {
    iter: ()=>iterator.Iterator;
}

export class Py_List extends pytypes.Py_Object implements Iterable {
  private _list: pytypes.Py_Object[];
  constructor(lst: pytypes.Py_Object[]) {
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
  public len(): Py_Int {
    return Py_Int.fromInt(this._list.length);
  }
  public iter(): iterator.Iterator {
    return new iterator.ListIterator(this._list);
  }
  public toString(): string {
    if (this._list.length == 0) {
      return '[]';
    }
    var s = '[';
    for (var i=0; i<this._list.length; i++) {
      s += this._list[i].repr();
      s += ', ';
    }
    // Remove last ', ' from the end.
    return s.slice(0, -2) + ']';
  }
}

export class Py_Tuple extends pytypes.Py_Object implements Iterable {
  private _len: Py_Int;  // can't resize a tuple
  private _tuple: pytypes.Py_Object[];
  constructor(t: pytypes.Py_Object[]) {
    super();
    this._tuple = t;
    this._len = Py_Int.fromInt(t.length);
  }
  static fromIterable(x: Iterable) {
    var it = x.iter();
    var tuple = [];
    for (var val = it.next(); val != null; val = it.next()) {
        tuple.push(val);
    }
    return new Py_Tuple(tuple);
  }
  public len(): Py_Int {
    return this._len;
  }
  public iter(): iterator.Iterator {
    return new iterator.ListIterator(this._tuple);
  }
  public toString(): string {
    if (this._tuple.length == 0) {
      return '()';
    }
    var s = '(';
    for (var i=0; i<this._tuple.length; i++) {
      s += this._tuple[i].repr();
      s += ', ';
    }
    // Remove last ', ' from the end.
    return s.slice(0, -2) + ')';
  }
}

export class Py_Dict extends pytypes.Py_Object {
  private _keys: pytypes.Py_Object[];
  private _vals: any;
  constructor() {
    super();
    this._keys = [];
    this._vals = {};
  }
  public get(key: pytypes.Py_Object): pytypes.Py_Object {
    var h = key.hash();
    return this._vals[h];
  }
  public set(key: pytypes.Py_Object, val: pytypes.Py_Object): void {
    var h = key.hash();
    if (this._vals[h] === undefined) {
      this._keys.push(key);
    }
    this._vals[h] = val;
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
      s += key.repr() + ': ';
      s += val.repr() + ', ';
    }
    // trim off last ', '
    return s.slice(0, -2) + '}';
  }
}
