import fs = require('fs');
import Unmarshaller = require('./src/unmarshal');
import Interpreter = require('./src/interpreter');

var testOut: string = '';
var mockStdout = {write: (data: string) => {testOut += data;}};
var interp = new Interpreter(mockStdout);
var numTests = 0;
var numPassed = 0;

function test(name, file) {
    process.stdout.write(`Running ${name}... `);
    numTests += 1;
    var u = new Unmarshaller(fs.readFileSync(file+'.pyc'));
    testOut = '';  // reset the output catcher
    try {
      interp.interpret(u.value());
    } catch (e) {
        process.stdout.write(`${e}\n`);
        return;
    }
    var expectedOut = fs.readFileSync(file+'.out').toString();
    if (testOut == expectedOut) {
        process.stdout.write("Pass\n");
        numPassed += 1;
    } else {
        process.stdout.write("Fail\n");
        console.log('CPython output:\n', expectedOut);
        console.log('Ninia output:\n', testOut);
    }
}

// Add more tests here:
test("Integer test", "pytests/math/intTest");
test("Long Int test", "pytests/math/longTest");
test("Floating-point test", "pytests/math/floatTest");
test("Complex number test", "pytests/math/complexTest");
test("Mixed Arithmetic test", "pytests/math/mixedMathTest");
test("Keyword and default arguments test","pytests/functions/keywordargs");
test("Numeric comparison test", "pytests/functions/comparisonTest");
test("Loop test", "pytests/loopTest");
test("Builtins test", "pytests/builtinsTest");
test("Range test", "pytests/rangeTest");

console.log(`Passed ${numPassed}/${numTests} tests.`);
