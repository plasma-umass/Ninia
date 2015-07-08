import primitives = require('./primitives');
import iterator = require('./iterator');
import interfaces = require('./interfaces');
import enums = require('./enums');
import assert = require('./assert');
import Thread = require('./threading');
import nativefuncobject = require('./nativefuncobject');
import Py_Object = primitives.Py_Object;
import Py_Int = primitives.Py_Int;
import Py_Long = primitives.Py_Long;
import Py_Slice = primitives.Py_Slice;
import Py_Str = primitives.Py_Str;
import True = primitives.True;
import False = primitives.False;
import Iterable = interfaces.Iterable;
import Iterator = interfaces.Iterator;
import IPy_Object = interfaces.IPy_Object;
import None = primitives.None;
import NotImplemented = primitives.NotImplemented;


export class Py_List extends Py_Object implements Iterable {
  private _list: IPy_Object[];
  public $append = new nativefuncobject.Py_SyncNativeFuncObject((t: Thread, f: interfaces.IPy_FrameObj, args: IPy_Object[], kwargs: Py_Dict) => {
    this.append(args[0]);
    return primitives.None;
  });
  public $__getitem__ = new nativefuncobject.Py_SyncNativeFuncObject((t: Thread, f: interfaces.IPy_FrameObj, args: IPy_Object[], kwargs: Py_Dict) => {
    return this.__getitem__(args[0]);
  });
  public $__delitem__ = new nativefuncobject.Py_SyncNativeFuncObject((t: Thread, f: interfaces.IPy_FrameObj, args: IPy_Object[], kwargs: Py_Dict) => {
    return this.__delitem__(args[0]);
  });
  public $__setitem__ = new nativefuncobject.Py_SyncNativeFuncObject((t: Thread, f: interfaces.IPy_FrameObj, args: IPy_Object[], kwargs: Py_Dict) => {
    return this.__setitem__(args[0], args[1]);
  });
  
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

  public append(item: IPy_Object): IPy_Object {
    this._list.push(item);
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
            lim = this._list.length - 1 - curr;
          }
          for (var j = 0; j < lim; j++){
            this._list[curr - i + j] = this._list[curr + j + 1];
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
    var tuple: IPy_Object[] = [];
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
    return this._len;
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

/**
 * Our implementation of Python dictionaries.
 * 
 * Python dictionaries form the basis of every object in Python.
 * Objects all have an underlying __dict__ property, which is a
 * dictionary containing all of the properties on the object.
 * 
 * Thus, to update the property 'bar' on object 'foo', one can
 * do either:
 * 
 * foo.bar = 4
 * 
 * ...or:
 * 
 * foo.__dict__['bar'] = 4
 * 
 * Naturally, JavaScript objects share this same property, in
 * that you can access property 'bar' as either foo.bar or
 * foo['bar'].
 * 
 * One key difference: Python dictionaries can have arbitrary
 * keys, whereas JavaScript objects only support string keys.
 * However, in Python, only dictionary items keyed on a string 
 * actually surface as object properties...
 * 
 * Which brings me to our idiosyncratic two-bucket dictionary
 * design. The first bucket is for items keyed on a Python
 * string; those go into "_stringDict", keyed on the string
 * prepended with $ to prevent collisions with special JavaScript
 * properties. The second bucket is for items keyed on other
 * Python objects; like in Python, those are keyed on their
 * __hash__ value.
 * 
 * This design lets us use *arbitrary JavaScript objects as
 * _stringDict*, making it possible for Python objects to live
 * a dual existence as both Dictionary and Object. An object's
 * __dict__ property in Ninia is just a Py_Dict with the
 * object as its _stringDict. :)
 */
export class Py_Dict extends Py_Object implements Iterable {
  // Non-string keys.
  protected _objectKeys: IPy_Object[];
  // Stores items not keyed on a string.
  protected _vals: { [hash: number]: IPy_Object };
  // Stores items keyed on a string.
  protected _stringDict: { [str: string]: IPy_Object };
  constructor(stringDict: { [str: string]: IPy_Object } = {}) {
    super();
    this._objectKeys = [];
    this._vals = {};
    this._stringDict = stringDict;
  }
  public getStringDict(): { [str: string]: IPy_Object } {
    return this._stringDict;
  }
  public clone(): Py_Dict {
    var clone = new Py_Dict(),
      keys = Object.keys(this._vals), i: number, key: string;
    for (i = 0; i < keys.length; i++) {
      key = keys[i];
      clone._vals[<any> key] = this._vals[<any> key];
    }
    clone._objectKeys = this._objectKeys.slice(0);
    keys = Object.keys(this._stringDict);
    for (i = 0; i < keys.length; i++) {
      key = keys[i];
      clone._stringDict[key] = this._stringDict[key];  
    }
    return clone;
  }
  public get(key: IPy_Object): IPy_Object {
    if (key instanceof Py_Str) {
      return this._stringDict[`$${key.toString()}`];
    } else {
      var h = key.hash();
      return this._vals[h];
    }
  }
  public __getitem__(key: IPy_Object): IPy_Object {
    return this.get(key); 
  }
  public set(key: IPy_Object, val: IPy_Object): void {
    if (key instanceof Py_Str) {
      this._stringDict[`$${key.toString()}`] = val;
    } else {
      var h = key.hash();
      if (this._vals[h] === undefined) {
        this._objectKeys.push(key);
      }
      this._vals[h] = val;
    }
  }
  public del(key: IPy_Object): void {
    if (key instanceof Py_Str) {
      delete this._stringDict[`$${key.toString()}`];
    } else {
      var h = key.hash();
      if (this._vals[h] !== undefined) {
        delete this._vals[h];
      }
      this._objectKeys.splice(this._objectKeys.indexOf(key), 1); 
    }
  }
  public iter(): Iterator {
    return new iterator.ListIterator(this._objectKeys.concat(
      Object.keys(this._stringDict).map(
        (key: string) => new Py_Str(key.slice(1))
      )));
  }
  public len(): number {
      return Object.keys(this._stringDict).length + this._objectKeys.length;
  }
  public toPairs(): [IPy_Object,IPy_Object][] {
    var pairs: [IPy_Object, IPy_Object][] = [], i: number;
    for (i = 0; i < this._objectKeys.length; i++) {
      var key = this._objectKeys[i];
      var h = key.hash();
      var val = this._vals[h];
      pairs.push([key, val]);
    }
    Object.keys(this._stringDict).forEach((key: string) => {
      pairs.push(<[IPy_Object, IPy_Object]> [new Py_Str(key.slice(1)), this._stringDict[key]]);
    });
    return pairs;
  }
  public keys(): IPy_Object[] {
    return this._objectKeys.concat(
      Object.keys(this._stringDict).map(
        (key: string) => new Py_Str(key.slice(1))
      )
    );
  }
  public toString(): string {
    var s = '{';
    for (var i = 0; i < this._objectKeys.length; i++) {
      var key = this._objectKeys[i];
      var h = key.hash();
      var val = this._vals[h];
      s += key.__repr__() + ': ';
      s += val.__repr__() + ', ';
    }
    Object.keys(this._stringDict).forEach((key) => {
      s += "'" + key.slice(1) + "': " + this._stringDict[key].__repr__() + ", ";
    });
    // trim off last ', '
    return (s.length > 1 ? s.slice(0, -2)  : s) + '}';
  }

  public asBool(): boolean {
    return this.len() !== 0;
  }

  public __len__(): Py_Int {
    return new Py_Int(this.len());
  }
  
  public __eq__(o: IPy_Object): IPy_Object {
    if (o === this) {
      return True;
    } else {
      return False;
    }
  }
}

export class Py_Set extends Py_Dict implements IPy_Object {
  static fromArray(objects: IPy_Object[]): Py_Set {
    var res = new Py_Set();
    objects.forEach((obj) => res.set(obj, obj));
    return res;
  }
  
  static fromIterable(x: Iterable) {
    var set = new Py_Set();
    var it = x.iter();
    for (var val = it.next(); val != null; val = it.next()) {
      set.set(val, val);
    }
    return set;
  }

  public toString(): string {
    var s = 'set([';
    for (var i = 0; i < this._objectKeys.length; i++) {
      s += this._objectKeys[i].__repr__() + ', ';
    }
    Object.keys(this._stringDict).forEach((key) => {
      s += key.slice(1) + ', ';
    });
    return (s.length > 5 ? s.slice(0, -2) : s) + '])';
  }

  // set intersection
  public __and__(x: IPy_Object): IPy_Object {
    if (!(x instanceof Py_Set)) {
      return NotImplemented;
    }
    var res = new Py_Set(), myKeys = this.keys(),
      other: Py_Set = <Py_Set> x;
    for (var i = 0; i < myKeys.length; i++) {
      if (other.get(myKeys[i]) !== undefined) {
        res.set(myKeys[i], myKeys[i]);
      }
    }
    return res;
  }

  // set difference
  public __sub__(x: IPy_Object): IPy_Object {
    if (!(x instanceof Py_Set)) {
      return NotImplemented;
    }
    var res = new Py_Set(), myKeys = this.keys(),
      other: Py_Set = <Py_Set> x;
    for (var i = 0; i < myKeys.length; i++) {
      if (other.get(myKeys[i]) === undefined) {
        res.set(myKeys[i], myKeys[i]);
      }
    }
    return res;
  }

  // set symmetric difference
  public __xor__(x: IPy_Object): IPy_Object {
    // TODO: implement this directly
    var left = this.__sub__(x);
    var right = x.__sub__(this);
    return left.__or__(right);
  }

  // set union
  public __or__(x: IPy_Object): IPy_Object {
    if (!(x instanceof Py_Set)) {
      return NotImplemented;
    }
    return Py_Set.fromArray(this.keys().concat((<Py_Set> x).keys()));
  }

  // subset
  public __lt__(x: IPy_Object): IPy_Object {
    if (!(x instanceof Py_Set)) {
      return NotImplemented;
    }
    var h: string, other: Py_Set = <Py_Set> x,
      myKeys = this.keys();
    for (var i = 0; i < myKeys.length; i++) {
      if (other.get(myKeys[i]) === undefined) {
        return False;
      }
    }  
    // make sure we're not equal
    return (this.len() == (<Py_Set> x).len())? False : True;
  }
}
