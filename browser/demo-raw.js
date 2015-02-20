var Unmarshaller = require('../src/unmarshal');
var Interpreter = require('../src/interpreter');

// Get the contents of the .pyc file
function readFile(readerEvent) {
    var buffer = new Uint8Array(readerEvent.target.result);
    var pycdata = new Buffer(buffer);
    interpData(pycdata);
}

// Once user has selected file, load it to be read
function loadFile() {
    var pycfile = document.getElementById('pycfile').files[0];
    if (typeof pycfile === "undefined") {
        alert("Please upload a .pyc file");
        return;
    }
    var reader = new FileReader();
    reader.onerror = function(error) {
        alert("There was an error when loading the file:\n" + error);
    }

    reader.onload = readFile;
    reader.readAsArrayBuffer(pycfile);
}

// Once file has been loaded and read, interpret it
function interpData(data) {
    if (data.length == 0) {
        alert("No data could be read from the file.");
        return;
    }

    // Prepare the device for output
    var outputDevice = {}
    var outputField = document.getElementById("output");
    outputDevice['write'] = function(str) {
        outputField.value += str;
    };
    // Reset the outputField's output
    outputField.value = "";

    // Create the interpreter and unmarshaller instance
    var interp = new Interpreter(outputDevice);
    var unmar = new Unmarshaller(data);
    // Unmarshal the file
    var code = unmar.value();
    // Interpret the code!
    interp.interpret(code);
}

BrowserFS.install(window);
document.getElementById("processFile").onclick = loadFile;
