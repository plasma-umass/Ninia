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
test("Integer test", "tests/math/intTest.pyc");
test("Long Int test", "tests/math/longTest.pyc");
test("Floating-point test", "tests/math/floatTest.pyc");
test("Complex number test", "tests/math/complexTest.pyc");
test("Mixed Arithmetic test", "tests/math/mixedMathTest.pyc");
test("Keyword and default arguments test","tests/functions/keywordargs.pyc");
test("Numeric comparison test", "tests/functions/comparisonTest.pyc");
test("Loop test", "tests/loopTest.pyc");
test("Builtins test", "tests/builtinsTest.pyc");
