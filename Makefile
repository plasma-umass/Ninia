# Typescript compiler
TSC=tsc
TSCFLAGS=--module commonjs
# Python 2.7 "compiler"
PYC=python2.7 -m compileall
# Source and Example directory
SDIR=src
EDIR=examples
# Source files:
TSSOURCES=$(wildcard $(SDIR)/*.ts) $(wildcard lib/*.ts)
JSSOURCES=$(TSSOURCES:.ts=.js)
# Example files:
PYSOURCES=$(wildcard $(EDIR)/*.py) $(wildcard $(EDIR)/**/*.py)
EXSOURCES=$(PYSOURCES:.py=.pyc)
# Main library output file:
MAININ=main.js
MAINOUT=pyinterp.js
# Flags for compiling main file
# MAINFLAGS=--out pyinter.js # This fails silently. GG, TypeScript.
# Test application file:
TEST=test.ts
TESTJS=test.js

main:
	@echo Compiling source files...
	$(TSC) $(TSCFLAGS) $(TSSOURCES)
	@echo
	@echo Compiling main JS file...
	browserify $(MAININ) > $(MAINOUT)

test: $(TESTJS) $(EXSOURCES)
	@echo WARNING:
	@echo Deleting the src/\*.js files will break $(TESTJS)!
	node $(TESTJS)

$(TESTJS): $(TEST) $(TSSOURCES)
	@echo
	@echo Compiling $(TESTJS)
	$(TSC) $(TSCFLAGS) $(TEST)

%.js: %.ts
	$(TSC) $(TSCFLAGS) $^

%.pyc: %.py
	$(PYC) $^

.PHONY: clean clean-src clean-ex clean-test

clean-src:
	@echo
	@echo Cleaning $(SDIR)/ JS files
	$(RM) $(JSFILE) $(JSSOURCES)

clean-ex:
	@echo
	@echo Cleaning $(EDIR)/ PYC files
	$(RM) $(EXSOURCES)

clean-test: clean-ex
	@echo
	@echo Cleaning $(TESTJS)
	$(RM) $(TESTJS)

clean-main: clean-src
	@echo
	@echo Cleaning $(MAINOUT)
	$(RM) $(MAINOUT)

clean-all: clean-main clean-test clean-src clean-ex

clean: clean-main
