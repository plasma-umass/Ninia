///<reference path="../bower_components/DefinitelyTyped/async/async.d.ts" />
import fs = require('fs');
import Unmarshaller = require('../src/unmarshal');
import Interpreter = require('../src/interpreter');
import async = require('async');
import domain = require('domain');

var testOut: string = '';
var oldStdout = process.stdout.write;
process.stdout.write = <any> ((data: string) => {testOut += data;});
const interp = new Interpreter();
var numTests = 0,
    numPassed = 0,
    numSkipped = 0;
var testFails: { [testName: string]: number; } = { };
var expectedOut = "";
var testName = "";
// Store test results
var result: string = "";
function realPrint(text: string) {
    oldStdout.apply(process.stdout, [text]);
}

function restorePrint(cb: () => void): void {
    var newStdout = process.stdout.write;
    process.stdout.write = oldStdout;
    cb();
    process.stdout.write = newStdout;
}

function printResults() {
    restorePrint(() => {
        console.log(result);
        console.log(`\n--- Results ---`);
        for (var tName in testFails) {
           if (testFails[tName] > 0) {
               console.log(`${testFails[tName]} test failed in ${tName} tests.`);
           }
        }
        const numFailed = numTests - numPassed - numSkipped;
        console.log(`PASS: ${numPassed} / SKIP: ${numSkipped} / FAIL: ${numFailed}`);
        if (numFailed != 0) {
            process.exit(1);
        }
    });
}

// Add more tests here:
const testList = [
    [`\n--- Math tests ---`],
    ["Unary operations test", "pytests/math/unaryOpsTest"],
    ["Binary operations test", "pytests/math/binaryOpsTest"],
    ["In-place operations test", "pytests/math/inplaceTest"],
    ["Mixed Arithmetic test", "pytests/math/mixedMathTest"],
    [`\n--- Function tests ---`],
    ["Keyword and default arguments test", "pytests/functions/keywordargs"],
    ["Recursion test", "pytests/functions/recursionTest"],
    ["Scoping test", "pytests/functions/scopeTest"],
    ["Generators test", "pytests/functions/generatorTest"],
    [`\n--- Builtin tests ---`],
    ["Builtin Types test", "pytests/builtins/builtinTypes"],
    ["Bin function test", "pytests/builtins/bin"],
    ["Hex function test", "pytests/builtins/hex"],
    ["Complex function test", "pytests/builtins/complex"],
    ["Bool function test", "pytests/builtins/bool"],
    ["Divmod function test", "pytests/builtins/divmod"],
    ["Abs function test", "pytests/builtins/abs"],
    ["Cmp function test", "pytests/builtins/cmp"],
    ["All & Any functions test", "pytests/builtins/all_any"],
    ["Chr & Ord functions test", "pytests/builtins/chr_ord"],
    ["Attribute accessors test", "pytests/builtins/attrs"],
    ["Underscore names test", "pytests/builtins/underscoresTest"],
    [`\n--- Collection tests ---`],
    ["List test", "pytests/collections/lists"],
    ["Set test", "pytests/collections/sets"],
    ["Dict test", "pytests/collections/dicts"],
    [`\n--- Control flow tests ---`],
    ["Loop test", "pytests/loopTest"],
    ["Range test", "pytests/rangeTest"],
    ["Comprehension test", "pytests/comprehensionTest"],
    [`\n--- Class tests ---`],
    ["Basic class test", "pytests/classes/userDefTest"],
    ["Class import / inheritance test", "pytests/classes/externalImport"],
    ["import-star test", "pytests/classes/importStar"],
    [`\n--- Caught Exception tests ---`],
    ["Basic Exception test", "pytests/caught_exceptions/except"],
    ["Nested Function Exception test", "pytests/caught_exceptions/nestedFunction"],
    ["Nested Try-Block Exception test", "pytests/caught_exceptions/nestedTry"],
    ["Recursive function Try-Block Exception test", "pytests/caught_exceptions/recursiveFunctionTry"],
    ["NameError test", "pytests/caught_exceptions/nameError"],
    ["ArithmeticError test", "pytests/caught_exceptions/arithmeticError"],
    ["AttributeError test", "pytests/caught_exceptions/attributeError"],
    [`\n--- Uncaught Exception tests ---`],
    ["Basic Uncaught Exception test", "pytests/uncaught_exceptions/simpleFunction"],
    ["Recurisve Function Uncaught Exception test", "pytests/uncaught_exceptions/recursiveFunction"],
    ["NameError Uncaught test", "pytests/uncaught_exceptions/nameError"],
    ["Raise exception with arguments test", "pytests/uncaught_exceptions/raiseMultipleArg"],
    ["User-defined exceptions test", "pytests/uncaught_exceptions/userClassException"],
    ["ArithmeticError Uncaught test", "pytests/uncaught_exceptions/arithmeticError"],
    [`\n--- Thread tests ---`],
    ["Termination test", "pytests/threads/terminationTest"],
    [`\n--- Other tests ---`],
    ["Strings test", "pytests/stringTest"],
    ["Slice test", "pytests/sliceTest"],
    ["Assignment test", "pytests/assignmentTest"],
    ["Deletion test", "pytests/delTest"],
    ["Context Manager test", "pytests/contextTest"]
];

// Add tests here that you'd like to skip, for some reason.
const skipTests: {[file: string]: boolean} = {
    "pytests/comprehensionTest": true,
    "pytests/functions/generatorTest": true
};

var d = domain.create();
var async_cb: () => void = null;
d.on('error', function(err: any){
    onFailure();
    result += `${err.stack != null ? err.stack : ""}\n`;
    async_cb();
});

// Called whenver Ninia output doesn't match cpython output
function onFailure() {
    result += `Fail\nCPython output:\n${expectedOut}\nNinia output:\n${testOut}\n`;
    testFails[testName] += 1;
}

// Execute an individual test
function indiv_test(name: string, file: string, cb: () => void) {
    numTests++;
    if (!!(skipTests[file])) {
        numSkipped++;
        return cb();
    }
    result += `Running ${name}... `;
    var u = new Unmarshaller(fs.readFileSync(file+'.pyc'));
    testOut = '';  // reset the output catcher
    testName = file.split('/')[1];  // grab 'math' from 'pytests/math/int'
    if (isNaN(testFails[testName]))
        testFails[testName] = 0;  // initialize

    expectedOut = fs.readFileSync(file+'.out').toString();
    // save cb so it can be invoked by domain error handler
    async_cb = cb;
    d.run(function() {
        interp.interpret(u.value(), false, function() {
            if (testOut == expectedOut) {
                result += `Pass\n`;
                numPassed += 1;
            } else {
                onFailure();
            }
            cb();
        });
    });
}

// Setting up for an individual test
function iteration(cur_test: [string], inCb: () => void) {
    var name = cur_test[0];
    if(cur_test.length === 1){
        result += `${name}\n`;
        inCb();
    }
    else{
        var file = cur_test[1];
        indiv_test(name, file, inCb);
    }
}

// Runs all tests
function processTests(){
    async.eachSeries(testList, iteration, function(err: Error) {
        printResults();
    });
}

processTests();
