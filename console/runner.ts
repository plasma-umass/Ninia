import fs = require('fs');
import Unmarshaller = require('../src/unmarshal');
import Interpreter = require('../src/interpreter');
var argv = require('minimist')(process.argv.slice(2), {
  alias: { 'h': 'help' },
  boolean: ['debug'],
});

if (argv._.length != 1 || argv.help) {
  console.log(`Usage: ninia [options] <file.pyc>`);
  console.log('Options:\n\t--help -- show this help message');
  console.log('\t--debug -- turn on debug output');
  process.exit(1);
}

var interp = new Interpreter();
var file: string = argv._[0];
var u = new Unmarshaller(fs.readFileSync(file));
interp.interpret(u.value(), argv.debug);
