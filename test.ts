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
    var err = null;
    try {
        interp.interpret(u.value());
    } catch (e) {
        if (e.stack) {
            err = `${e.stack}\n`;
        } else {
            err = `${e}\n`
        }
    }
    var expectedOut = fs.readFileSync(file+'.out').toString();
    if (!err && testOut == expectedOut) {
        process.stdout.write("Pass\n");
        numPassed += 1;
    } else {
        process.stdout.write("Fail\n");
        console.log('CPython output:\n', expectedOut);
        console.log('Ninia output:\n', testOut);
        if (err) {
            console.log(err);
        }
        testFails[testName] += 1;
    }
}

function printResults() {
    console.log(`\n--- Results ---`);
    for (var tName in testFails) {
        if (testFails[tName] > 0) {
            console.log(`${testFails[tName]} test failed in ${tName} tests.`);
        }
    }
    console.log(`Passed ${numPassed}/${numTests} tests.`);
}

// Add more tests here:
console.log(`\n--- Math tests ---`);
test("Unary operations test", "pytests/math/unaryOpsTest");
test("Binary operations test", "pytests/math/binaryOpsTest");
test("Mixed Arithmetic test", "pytests/math/mixedMathTest");
console.log(`\n--- Function tests ---`);
test("Keyword and default arguments test","pytests/functions/keywordargs");
test("Recursion test", "pytests/functions/recursionTest");
test("Scoping test", "pytests/functions/scopeTest");
test("Generators test", "pytests/functions/generatorTest");
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
test("Attribute accessors test", "pytests/builtins/attrs");
console.log(`\n--- Collection tests ---`);
test("List test", "pytests/collections/lists");
console.log(`\n--- Control flow tests ---`);
test("Loop test", "pytests/loopTest");
test("Range test", "pytests/rangeTest");
console.log(`\n--- Other tests ---`);
test("Strings test", "pytests/stringTest");
test("Slice test", "pytests/sliceTest");
test("Multiple Assignment test", "pytests/multipleAssignment");
printResults()
