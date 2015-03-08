import Py_Int = require('./integer');
import iterator = require('./iterator');

// all iterables must support iter()
export interface Iterable {
    iter: ()=>iterator.Iterator;
}

export class Py_List implements Iterable {
  constructor(private _list: any[]) {}
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
    var s = '[';
    for (var i=0; i<this._list.length; i++) {
      var x = this._list[i];
      // XXX: Ugly hack around the lack of repr()
      if (typeof x == 'string') {
        s += "'" + x.toString() + "'";
      } else {
        s += x.toString();
      }
      s += ', ';
    }
    if (s.length > 1) {
      return s.slice(0, -2) + ']';
    }else{
      return '[]'
    }
  }
}

export class Py_Tuple implements Iterable {
  private _len: Py_Int;  // can't resize a tuple
  constructor(private _tuple: any[]) {
    this._len = Py_Int.fromInt(_tuple.length);
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
    var s = '(';
    for (var i=0; i<this._tuple.length; i++) {
      var x = this._tuple[i];
      // XXX: Ugly hack around the lack of repr()
      if (typeof x == 'string') {
        s += "'" + x.toString() + "'";
      } else {
        s += x.toString();
      }
      s += ', ';
    }
    return s.slice(0, -2) + ')';
  }
}

export class Py_Dict {
  constructor(private _map: any) {}
  public get(key: any): any {
    // XXX: should use hash(key)
    return this._map[key];
  }
  public set(key: any, val: any): void {
    // XXX: should use hash(key)
    this._map[key] = val;
  }
  public toString(): string {
    var s = '{';
    for (var k in this._map) {
      if (this._map.hasOwnProperty(k)) {
        s += "'" + k.toString() + "': " + this._map[k].toString() + ', ';
      }
    }
    if (s.length > 1) {
      s = s.slice(0, -2);  // trim off last ', '
    }
    return s + '}';
  }
}
