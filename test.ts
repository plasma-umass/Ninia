import fs = require('fs');
import Unmarshaller = require('./src/unmarshal');
import Interpreter = require('./src/interpreter');

var interp = new Interpreter(process.stdout);
function test(name, file) {
    console.log("Running " + name);
    var u = new Unmarshaller(fs.readFileSync(file));
    // The test does all the pass/fail checking
    interp.interpret(u.value());
    console.log();
}

// See README for adding more tests
test("Integer test", "examples/math/intTest.pyc");
test("Long Int test", "examples/math/longTest.pyc");
test("Floating-point test", "examples/math/floatTest.pyc");
test("Complex number test", "examples/math/complexTest.pyc");
test("Mixed Arithmetic test", "examples/math/mixedMathTest.pyc");
test("Keyword and default arguments test","examples/functions/keywordargs.pyc");
test("Numeric comparison test", "examples/functions/comparisonTest.pyc");
test("Loop test", "examples/loopTest.pyc");
