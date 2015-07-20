import {IPy_Object} from './interfaces';
import {Py_Type} from './enums';

class Py_Cell implements IPy_Object {
    ob_ref: IPy_Object;
    
    public constructor(ob_ref: IPy_Object){
        this.ob_ref = ob_ref;
    }
    
    public getType(): Py_Type { return Py_Type.OTHER; }
    
    public hash(): number {
        return -1;
    }

}

export = Py_Cell;
