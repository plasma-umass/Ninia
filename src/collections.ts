import primitives = require('./primitives');
import iterator = require('./iterator');
import interfaces = require('./interfaces');
import enums = require('./enums');
import singletons = require('./singletons');
import assert = require('./assert');
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

  public getIndices(length: number) : {start: number; stop: number; step: number; length:number; }{
    var res : {start: number; stop: number; step: number; length:number; } = {start: 0, stop: 0, step: 0, length: 0};
    res.step = this.step === None ? 1 : (<Py_Int | Py_Long> this.step).toNumber();
    var defstart = res.step < 0 ? length - 1 : 0;
    var defstop = res.step < 0 ? -1 : length;

    if (this.start === None) {
      res.start = defstart;
    } else {
      res.start = (<Py_Int | Py_Long> this.start).toNumber();
      if (res.start < 0) {
        res.start += length;
      }
      if (res.start < 0) {
        res.start = (res.step < 0)  ? -1 : 0;
      }
      if (res.start >= length){
        res.start = (res.step < 0) ? length - 1 : length;
      }
    }

    if (this.stop === None) {
      res.stop = defstop;
    } else {
      res.stop = (<Py_Int | Py_Long> this.stop).toNumber();
      if (res.stop < 0) {
        res.stop += length;
      }
      if (res.stop < 0) {
        res.stop = (res.step < 0) ? -1 : 0;
      }
      if (res.stop >= length) {
        res.stop = (res.step < 0) ? length - 1 : length;
      }
    }

    if ((res.step < 0 && res.stop >= res.start)
        || (res.step > 0 && res.start >= res.stop)) {
      res.length = 0;
    }
    else if (res.step < 0) {
      res.length = Math.floor((res.stop - res.start + 1)/res.step) + 1;
    }
    else {
      res.length = Math.floor((res.stop-res.start-1)/res.step) + 1;
    }
    return res;
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
        indices = slice.getIndices(this._list.length),
        start = indices.start,
        stop = indices.stop,
        step = indices.step,
        length = indices.length,
        newArr: IPy_Object[] = [],
        i: number,
        curr: number;
      for (i = 0, curr = start; i < length; i += 1, curr += step) {
        newArr.push(this._list[curr]);
      }
        return new Py_List(newArr);
    } else {
      return this._list[standardizeKey(key, this._list.length)];
    }
  }

  public __setitem__(key: IPy_Object, val: IPy_Object): IPy_Object {
    if (key.getType() === enums.Py_Type.SLICE) {
      var slice = <Py_Slice> key,
        step = slice.step === None ? 1 : (<Py_Int | Py_Long> slice.step).toNumber();
      var rlist = <Py_List> Py_List.fromIterable(<Iterable> val);

      if (step === 1){
        var start = slice.start === None ? 0 : (<Py_Int> slice.start).toNumber(),
          stop = slice.stop === None ? this._list.length : (<Py_Int> slice.stop).toNumber(),
          len = stop - start < 0 ? 0 : stop - start;
        Array.prototype.splice.apply(this._list, [start, len].concat(rlist.toArray()));

      } else {
        var indices = slice.getIndices(this._list.length);
        var start = indices.start,
          stop = indices.stop,
          step = indices.step,
          length = indices.length;
        if(step !== 1 && rlist.len() !== length){
          throw new Error('attempt to assign sequence of size ' + rlist.len() + ' to extended slice of size ' + length);
        }

        for(var curr = start, i = 0; i < length; curr += step, i += 1){
          this._list[curr] = rlist.__getitem__(new Py_Int(i));
        }
      }
    } else {
      this._list[standardizeKey(key, this._list.length)] = val;
    }
    return None;
  }

  public __delitem__(key: IPy_Object): IPy_Object {
    // Delete is the same as splicing out the element and moving everything down
    if (key.getType() === enums.Py_Type.SLICE){
      var slice = <Py_Slice> key,
      step = slice.step === None ? 1 : (<Py_Int | Py_Long> slice.step).toNumber();
      if (step === 1){
        var start = slice.start === None ? 0 : (<Py_Int> slice.start).toNumber(),
          stop = slice.stop === None ? this._list.length : (<Py_Int> slice.stop).toNumber(),
          len = stop - start < 0 ? 0 : stop - start;
        this._list.splice(start, len);

      } else {
        var indices = slice.getIndices(this._list.length);
        var start = indices.start,
          stop = indices.stop,
          step = indices.step,
          length = indices.length;
        
        if (length <= 0) {
          return None;
        }
        if (step < 0) {
          stop = start + 1;
          start = stop + step*(length - 1) - 1;
          step = -step;
        }

        for(var curr = start, i = 0; curr < stop; curr += step, i += 1){
          var lim = step - 1
          if (curr + step >= this._list.length){
            lim = this._list.length - 1 - curr 
          }
          for (var j = 0; j < lim; j++){
            this._list[curr - i + j] = this._list[curr + j + 1]
          }
        }
        this._list.splice(this._list.length - length, length);
        
      }
    } else {
      this._list.splice(standardizeKey(key, this._list.length), 1);
    }
    return None;
  }

  public toArray(): any[] {
    return this._list;
  }
}

function standardizeKey(key: IPy_Object, len: number): number {
  assert(key.getType() <= enums.Py_Type.LONG, `index only accepts keys of type INT or LONG.`);
  var fixedKey = (<Py_Int | Py_Long> key).toNumber();
  if (fixedKey < 0) fixedKey += len;
  return fixedKey;
}

export class Py_Tuple extends Py_Object implements Iterable {
  private _len: Py_Int;  // can't resize a tuple
  private _tuple: IPy_Object[];
  constructor(t: IPy_Object[]) {
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
  public __getitem__(key: IPy_Object): IPy_Object {
    if (key.getType() === enums.Py_Type.SLICE) {
      var slice = <Py_Slice> key,
        indices = slice.getIndices(this._tuple.length),
        start = indices.start,
        stop = indices.stop,
        step = indices.step,
        length = indices.length,
        newArr: IPy_Object[] = [],
        i: number,
        curr: number;
      for (i = 0, curr = start; i < length; i += 1, curr += step) {
        newArr.push(this._tuple[curr]);
      }
      return new Py_Tuple(newArr);
    } else {
      return this._tuple[standardizeKey(key, this._tuple.length)];
    }
  }

  public toArray(): IPy_Object[] {
    return this._tuple;
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
