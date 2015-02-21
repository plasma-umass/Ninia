import fs = require('fs');
import Unmarshaller = require('./src/unmarshal');
import Interpreter = require('./src/interpreter');

if (process.argv.length < 3) {
  console.log(`Usage: ${process.argv[0]} ${process.argv[1]} <file.pyc>`);
  process.exit(1);
}

var interp = new Interpreter(process.stdout);
var file = process.argv[2];
var u = new Unmarshaller(fs.readFileSync(file));
interp.interpret(u.value());
