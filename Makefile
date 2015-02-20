# directories
SDIR=src
EDIR=tests
# compilers
TSC=./node_modules/typescript/bin/tsc
TSCFLAGS=--module commonjs
PYC=python2.7 -m compileall
BROWSERIFY=./node_modules/browserify/bin/cmd.js
# Source files:
TSSOURCES=$(wildcard $(SDIR)/*.ts) $(wildcard lib/*.ts)
JSSOURCES=$(TSSOURCES:.ts=.js)
# Example files:
PYSOURCES=$(wildcard $(EDIR)/*.py) $(wildcard $(EDIR)/**/*.py)
EXSOURCES=$(PYSOURCES:.py=.pyc)
# Main library output file:
MAININ=browser/demo-raw.js
MAINOUT=browser/demo.js
# Test application file:
TEST=test.ts
TESTJS=test.js

.PHONY: main test compile clean
main: compile
	$(BROWSERIFY) $(MAININ) > $(MAINOUT)

test: compile $(TESTJS) $(EXSOURCES)
	node $(TESTJS)

compile: $(TSSOURCES) $(TSC) bower_components
	$(TSC) $(TSCFLAGS) $(TSSOURCES)

$(TSC):
	npm install .

bower_components:
	bower install

%.js: %.ts
	$(TSC) $(TSCFLAGS) $^

%.pyc: %.py
	$(PYC) $^

clean:
	$(RM) $(JSSOURCES) $(TESTJS) $(EXSOURCES) $(MAINOUT)

