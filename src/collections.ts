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
    return s.slice(0, -2) + ']';
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