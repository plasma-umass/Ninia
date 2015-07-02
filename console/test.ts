import fs = require('fs');
import Unmarshaller = require('../src/unmarshal');
import Interpreter = require('../src/interpreter');
var async = require('async');
import domain = require('domain');

var testOut: string = '';
var oldStdout = process.stdout.write;
process.stdout.write = <any> ((data: string) => {testOut += data;});
var interp = new Interpreter();
var numTests = 0;
var numPassed = 0;
var testFails: { [testName: string]: number; } = { };
var expectedOut = "";
var testName = "";
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
var testList = [
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
    [`\n--- Caught Exception tests ---`],
    ["Basic Exception test", "pytests/caught_exceptions/except"],
    ["Nested Function Exception test", "pytests/caught_exceptions/nestedFunction"],
    ["Nested Try-Block Exception test", "pytests/caught_exceptions/nestedTry"],
    ["Recursive function Try-Block Exception test", "pytests/caught_exceptions/recursiveFunctionTry"],
    [`\n--- Uncaught Exception tests ---`],
    ["Basic Uncaught Exception test", "pytests/uncaught_exceptions/simpleFunction"],
    ["Recurisve Function Uncaught Exception test", "pytests/uncaught_exceptions/recursiveFunctionUncaught"],
    [`\n--- Thread tests ---`],
    ["Termination test", "pytests/threads/terminationTest"],
    [`\n--- Other tests ---`],
    ["Strings test", "pytests/stringTest"],
    ["Slice test", "pytests/sliceTest"],
    ["Assignment test", "pytests/assignmentTest"],
    ["Deletion test", "pytests/delTest"]
];

function indiv_test(name: string, file: string, cb) {

    realPrint(`Running ${name}... `);
    numTests += 1;
    var u = new Unmarshaller(fs.readFileSync(file+'.pyc'));
    testOut = '';  // reset the output catcher
    testName = file.split('/')[1];  // grab 'math' from 'pytests/math/int'
    if (isNaN(testFails[testName]))
        testFails[testName] = 0;  // initialize
    var err: string = null;
            expectedOut = fs.readFileSync(file+'.out').toString();
     
        interp.interpret(u.value(), false, function() {
            if (testOut == expectedOut) {
                realPrint("Pass\n");
                numPassed += 1;
            } else {
                realPrint("Fail\n");
                restorePrint(() => {
                    console.log('CPython output:\n', expectedOut);
                    console.log('Ninia output:\n', testOut);
                });
                testFails[testName] += 1;
            }
            cb();
        });
}

var testList_dup = testList.slice(0);

var iteration = function(cur_test, inCb) {
    var name = cur_test[0];
    if(cur_test.length === 1){
        realPrint(name + "\n");
        testList_dup.shift();
        inCb();
    }
    else{
        var file = cur_test[1];
        testList_dup.shift();
        indiv_test(name, file, function() {
            inCb();
        });
    }    
}
function processTests(){
    async.eachSeries(testList, iteration, function(err) {
        printResults();
    });
}

function runTests() {
    var d = domain.create();

    d.on('error', function(err){
        realPrint("Fail\n");
        restorePrint(() => {
            console.log('CPython output:\n', expectedOut);
            console.log('Ninia output:\n', testOut);
        });
        realPrint("Uncaught exception in Ninia: \n\t" + err.toString() + "\n");
        testFails[testName] += 1;
        testList = testList_dup.slice(0);
        runTests();
    });

    d.run(function() {
        processTests();
    });
}

runTests();