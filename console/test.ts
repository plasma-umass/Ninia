import fs = require('fs');
import Unmarshaller = require('../src/unmarshal');
import Interpreter = require('../src/interpreter');

var testOut: string = '';
var oldStdout = process.stdout.write;
process.stdout.write = <any> ((data: string) => {testOut += data;});
var interp = new Interpreter();
var numTests = 0;
var numPassed = 0;
var testFails: { [testName: string]: number; } = { };

function realPrint(text: string) {
    oldStdout.apply(process.stdout, [text]);
}

function restorePrint(cb: () => void): void {
    var newStdout = process.stdout.write;
    process.stdout.write = oldStdout;
    cb();
    process.stdout.write = newStdout;
}

function test(name: string, file: string) {
    realPrint(`Running ${name}... `);
    numTests += 1;
    var u = new Unmarshaller(fs.readFileSync(file+'.pyc'));
    testOut = '';  // reset the output catcher
    var testName = file.split('/')[1];  // grab 'math' from 'pytests/math/int'
    if (isNaN(testFails[testName]))
        testFails[testName] = 0;  // initialize
    var err: string = null;
    try {
        interp.interpret(u.value(), false);
    } catch (e) {
        if (e.stack) {
            err = `${e.stack}\n`;
        } else {
            err = `${e}\n`
        }
    }
    var expectedOut = fs.readFileSync(file+'.out').toString();
    if (!err && testOut == expectedOut) {
        realPrint("Pass\n");
        numPassed += 1;
    } else {
        realPrint("Fail\n");
        restorePrint(() => {
            console.log('CPython output:\n', expectedOut);
            console.log('Ninia output:\n', testOut);
            if (err) {
                console.log(err);
            }
        });
        testFails[testName] += 1;
    }
}

function printResults() {
    restorePrint(() => {
       console.log(`\n--- Results ---`);
        for (var tName in testFails) {
            if (testFails[tName] > 0) {
                console.log(`${testFails[tName]} test failed in ${tName} tests.`);
            }
        }
        console.log(`Passed ${numPassed}/${numTests} tests.`); 
    });
}

// Add more tests here:
realPrint(`\n--- Math tests ---\n`);
test("Unary operations test", "pytests/math/unaryOpsTest");
test("Binary operations test", "pytests/math/binaryOpsTest");
test("In-place operations test", "pytests/math/inplaceTest");
test("Mixed Arithmetic test", "pytests/math/mixedMathTest");
realPrint(`\n--- Function tests ---\n`);
test("Keyword and default arguments test","pytests/functions/keywordargs");
test("Recursion test", "pytests/functions/recursionTest");
test("Scoping test", "pytests/functions/scopeTest");
test("Generators test", "pytests/functions/generatorTest");
realPrint(`\n--- Builtin tests ---\n`);
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
test("Underscore names test", "pytests/builtins/underscoresTest");
realPrint(`\n--- Collection tests ---\n`);
test("List test", "pytests/collections/lists");
test("Set test", "pytests/collections/sets");
test("Dict test", "pytests/collections/dicts");
realPrint(`\n--- Control flow tests ---\n`);
test("Loop test", "pytests/loopTest");
test("Range test", "pytests/rangeTest");
test("Comprehension test", "pytests/comprehensionTest");
realPrint(`\n--- Class tests ---\n`);
test("Basic class test", "pytests/classes/userDefTest");
realPrint(`\n--- Caught Exception tests ---`);
test("Basic Exception test", "pytests/caught_exceptions/except");
test("Nested Function Exception test", "pytests/caught_exceptions/nestedFunction");
test("Nested Try-Block Exception test", "pytests/caught_exceptions/nestedTry");
test("Recursive function Try-Block Exception test", "pytests/caught_exceptions/recursiveFunctionTry");
realPrint(`\n--- Uncaught Exception tests ---`);
test("Basic Uncaught Exception test", "pytests/uncaught_exceptions/simpleFunction");
test("Recurisve Function Uncaught Exception test", "pytests/uncaught_exceptions/recursiveFunctionUncaught");
realPrint(`\n--- Thread tests ---`);
test("Termination test", "pytests/threads/terminationTest");
realPrint(`\n--- Other tests ---\n`);
test("Strings test", "pytests/stringTest");
test("Slice test", "pytests/sliceTest");
test("Assignment test", "pytests/assignmentTest");
test("Deletion test", "pytests/delTest");
printResults()
