Ninia
===================

*Ninia* is a genus of snake, commonly called *coffee snakes*. In this case, it is also an implementation of Python on top of JavaScript.

Ninia is currently a work-in-progress, and actively welcomes contributions!

## Features

Supports a subset of Python 2.7.8 bytecode:
- Functions (including keyword and default arguments)
- Condition statements (`if` and comparisons of integers and booleans)
- The four numeric types: Integer (32 and 64 bit), Long (arbitrary precision),
  Float and Complex.
    - Certain operations are unsupported, e.g. powers for complex numbers
- Output via printing
    - Spaces are not automatically inserted between elements
- **NOTE:** This interpreter forces true division. That is, `5 / 2 == 2.5`. To
  force floor division, use the `\\` operator à la Python 3.
- Most unary and binary op codes are defined, along with those necessary for
  loading and storing objects and executing functions.

## Building & Running

### Dependencies

- TypeScript version 1.1.0.1
- Browserify (`npm install browserify`)
- NodeJS for testing
- Python 2.7.8 for compiling tests
    - `python2.7` should be in $PATH

### Running

- Compile the main JavaScript driver:
```
$ make main
```
- Load `main.html` in your browser of choice
- Click on "Choose File" and upload a .pyc file
- Click "Process File". The output should appear in the Output area.

### Testing

- Compile the test.js file and the Python tests with Make
- Run the test.js file in node
```
$ make test
$ node test.js
```
- Alternatively, follow the "Running the Interpreter" steps and load one of the
  \*test.pyc files from the examples/ directory.

### Adding More Tests
- Write the test: `testExample.py`
- Save it somewhere in the examples/ directory
- Add a new test to test.ts that gives a description for the test and a path to
  the .pyc file:
```javascript
test("This is a sample test", "examples/path/to/testExample.pyc");
```
- Make should be able to automatically compile the test file

## History

Theodore Sudol and Cibele Freire originally wrote Ninia as a class project for CMPSCI 630, a graduate-level software systems class. The [PLASMA lab](https://plasma.cs.umass.edu/) at UMass is continuing the project to experiment with bringing conventional programming languages to the web on top of JavaScript.

Ninia will reuse the common infrastructure present in [Doppio and DoppioJVM](https://github.com/plasma/umass/doppio) to bring Python to the browser.
