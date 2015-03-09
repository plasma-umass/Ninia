import fs = require('fs');
import Unmarshaller = require('./src/unmarshal');
import Interpreter = require('./src/interpreter');

var testOut: string = '';
var mockStdout = {write: (data: string) => {testOut += data;}};
var interp = new Interpreter(mockStdout);
var numTests = 0;
var numPassed = 0;
var testFails: { [testName: string]: number; } = { };

function test(name, file) {
    process.stdout.write(`Running ${name}... `);
    numTests += 1;
    var u = new Unmarshaller(fs.readFileSync(file+'.pyc'));
    testOut = '';  // reset the output catcher
    var testName = file.split('/')[1];  // grab 'math' from 'pytests/math/int'
    if (isNaN(testFails[testName]))
        testFails[testName] = 0;  // initialize

    try {
        interp.interpret(u.value());
    } catch (e) {
        process.stdout.write("Fail : ");
        process.stdout.write(`${e}\n`);
        testFails[testName] += 1;
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
        testFails[testName] += 1;
    }
}

function printResults() {
    console.log(`\n--- Results ---`);
    for (var tName in testFails) {
        if (testFails[tName] > 0) {
            console.log(`${testFails[tName]} test failed in ${tName} tests.`);
        }
        else {
            console.log(`${tName} tests passed successfully!`);
        }
    }
    console.log(`Passed ${numPassed}/${numTests} tests.`);
}

// Add more tests here:
console.log(`\n--- Math tests ---`);
test("Integer test", "pytests/math/intTest");
test("Long Int test", "pytests/math/longTest");
test("Floating-point test", "pytests/math/floatTest");
test("Complex number test", "pytests/math/complexTest");
test("Mixed Arithmetic test", "pytests/math/mixedMathTest");
console.log(`\n--- Function tests ---`);
test("Keyword and default arguments test","pytests/functions/keywordargs");
test("Numeric comparison test", "pytests/functions/comparisonTest");
console.log(`\n--- Builtin tests ---`);
test("Builtin Types test", "pytests/builtins/builtinTypes");
test("Bin function test", "pytests/builtins/bin");
test("Hex function test", "pytests/builtins/hex");
test("Complex function test", "pytests/builtins/complex");
test("Bool function test", "pytests/builtins/bool");
test("Divmod function test", "pytests/builtins/divmod");
test("Abs function test", "pytests/builtins/abs");
test("Cmp function test", "pytests/builtins/cmp");
test("All & Any functions test", "pytests/builtins/all_any");
test("Chr & Ord functions test", "pytests/builtins/chr_ord");
console.log(`\n--- Other tests ---`);
test("Loop test", "pytests/loopTest");
test("Range test", "pytests/rangeTest");
test("Recursion test", "pytests/recursionTest");
test("Strings test", "pytests/stringTest");
printResults()
