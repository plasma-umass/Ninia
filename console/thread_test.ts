var fs = require('fs');
var Unmarshaller = require('../src/unmarshal');
var Interpreter = require('../src/interpreter');
var testOut = '';
var mockStdout = { write: function (data) {
    testOut += data;
} };
var interp = new Interpreter(mockStdout);
var numTests = 0;
var numPassed = 0;
var testFails = {};
function test(name, file) {
    process.stdout.write("Running " + name + "... ");
    numTests += 1;
    var u = new Unmarshaller(fs.readFileSync(file + '.pyc'));
    testOut = ''; // reset the output catcher
    var testName = file.split('/')[1]; // grab 'math' from 'pytests/math/int'
    if (isNaN(testFails[testName]))
        testFails[testName] = 0; // initialize
    var err = null;
    try {
        interp.interpret(u.value(), false);
    }
    catch (e) {
        if (e.stack) {
            err = "" + e.stack + "\n";
        }
        else {
            err = "" + e + "\n";
        }
    }
    var expectedOut = fs.readFileSync(file + '.out').toString();
    if (!err && testOut == expectedOut) {
        process.stdout.write("Pass\n");
        numPassed += 1;
    }
    else {
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
    console.log("\n--- Results ---");
    for (var tName in testFails) {
        if (testFails[tName] > 0) {
            console.log("" + testFails[tName] + " test failed in " + tName + " tests.");
        }
    }
    console.log("Passed " + numPassed + "/" + numTests + " tests.");
}
// Add more tests here:
console.log("\n--- Math tests ---");
test("Thread print test", "pytests/thread_print_test");

printResults();
//# sourceMappingURL=test.js.map