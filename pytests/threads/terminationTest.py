import os

def foo():
    print "Hello"
    os._exit(0)
    print "This should not print"

foo()