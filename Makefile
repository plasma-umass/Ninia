# directories
SDIR=src
TDIR=pytests
# compilers
TSC=./node_modules/typescript/bin/tsc
TSCFLAGS=-t ES3 --sourceMap --module commonjs --noImplicitAny
PYTHON=python2.7
PYC=$(PYTHON) -m compileall
BROWSERIFY=./node_modules/browserify/bin/cmd.js
TSLINT=./node_modules/tslint/bin/tslint
# Source files:
TSSOURCES=$(wildcard $(SDIR)/*.ts) $(wildcard lib/*.ts) $(wildcard console/*.ts)
# Generated JS files (used for cleanup)
GENJS=$(TSSOURCES:.ts=.js)
# Test files:
PYSOURCES=$(wildcard $(TDIR)/*.py) $(wildcard $(TDIR)/**/*.py)
PYCS=$(PYSOURCES:.py=.pyc)
TESTOUTS=$(PYSOURCES:.py=.out)
# Main library output file:
MAININ=browser/demo-raw.js
MAINOUT=browser/demo.js
# Console application files:
TEST_RUNNER=console/test.js
RUNNER=ninia

.PHONY: main test coverage compile lint clean
main: compile $(MAINOUT) $(RUNNER)

test: compile $(PYCS) $(TESTOUTS)
	node $(TEST_RUNNER)

coverage: compile $(PYCS) $(TESTOUTS)
	istanbul cover $(TEST_RUNNER)

compile: $(TSSOURCES) $(TSC) bower_components
	$(TSC) $(TSCFLAGS) $(TSSOURCES)

lint:
	$(TSLINT) $(foreach source,$(TSSOURCES), -f $(source))

$(RUNNER):
	@echo '#!/bin/sh\nnode "$$(dirname $$0)/console/runner.js" $$@' >$(RUNNER)
	@chmod +x $(RUNNER)

$(MAINOUT): $(MAININ)
	$(BROWSERIFY) $(MAININ) > $(MAINOUT)

$(TSC):
	npm install .

bower_components:
	bower install

%.js: %.ts
	$(TSC) $(TSCFLAGS) $^

%.pyc: %.py
	$(PYC) $^

%.out: %.pyc
	-$(PYTHON) -u $^ > $@ 2>&1

clean:
	$(RM) $(GENJS) $(PYCS) $(MAINOUT) $(TESTOUTS) $(RUNNER)
