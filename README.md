Ninia
===================

*Ninia* is a genus of snake, commonly called *coffee snakes*. In this case, it is also an implementation of Python on top of JavaScript.

Ninia is currently a work-in-progress, and actively welcomes contributions!

## Features

Supports a subset of Python 2.7.8 bytecode:
- Functions (including keyword and default arguments)
- Condition statements (`if` and comparisons of integers and booleans)
- The four numeric types: Integer (32 and 64 bit), Long (arbitrary precision), Float, and Complex.
    - Certain operations are unsupported, e.g. powers for complex numbers
- The `print` statement.
- **NOTE:** This interpreter forces true division. That is, `5 / 2 == 2.5`. To
  force floor division, use the `//` operator à la Python 3.
- Opcode status: 65 of 119 defined and (mostly) working.

## Building & Running

### Dependencies

- node.js, npm, and bower
- Python 2.7 for compiling tests (`python2.7` should be in $PATH)

### Running

Compile the main JavaScript driver with `make`, then
load `browser/demo.html` in your browser of choice.

Click on "Choose File" and upload a .pyc file, then click "Process File".
The output should appear in the Output area.

### Testing

Run the test suite with `make test`.
Alternatively, follow the "Running" steps and load one of the
 \*test.pyc files from the pytests/ directory.

### Adding More Tests

 1. Write a python file `testExample.py` somewhere in the pytests/ directory.
 2. Add a new line to test.ts that gives a description for the test and a path to
  the test file:
```javascript
test("This is a sample test", "pytests/path/to/testExample");
```
 3. Check that it runs with `make test`.

## History

Theodore Sudol and Cibele Freire originally wrote Ninia as a class project for CMPSCI 630, a graduate-level software systems class. The [PLASMA lab](https://plasma.cs.umass.edu/) at UMass is continuing the project to experiment with bringing conventional programming languages to the web on top of JavaScript.

Ninia will reuse the common infrastructure present in [Doppio and DoppioJVM](https://github.com/plasma/umass/doppio) to bring Python to the browser.
