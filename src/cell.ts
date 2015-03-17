import interfaces = require('./interfaces');
import IPy_Object = interfaces.IPy_Object;
import enums = require('./enums');

class Py_Cell implements IPy_Object {
    ob_ref: IPy_Object;
    
    public constructor(ob_ref: IPy_Object){
        this.ob_ref = ob_ref;
    }
    
    public getType(): enums.Py_Type { return enums.Py_Type.OTHER; }
    
    public hash(): number {
        return -1;
    }

}

export = Py_Cell;
