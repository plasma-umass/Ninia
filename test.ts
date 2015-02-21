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
test("Integer test", "pytests/math/intTest.pyc");
test("Long Int test", "pytests/math/longTest.pyc");
test("Floating-point test", "pytests/math/floatTest.pyc");
test("Complex number test", "pytests/math/complexTest.pyc");
test("Mixed Arithmetic test", "pytests/math/mixedMathTest.pyc");
test("Keyword and default arguments test","pytests/functions/keywordargs.pyc");
test("Numeric comparison test", "pytests/functions/comparisonTest.pyc");
test("Loop test", "pytests/loopTest.pyc");
test("Builtins test", "pytests/builtinsTest.pyc");
