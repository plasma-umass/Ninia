# Simple exceptions
def foo():
    # Without raising an exception
    try:
        print "Hello"
        print "World"
    except:
        print "This should not print"

def bar():
    #raising an exception
    try:
        print "Hello"
        raise 
        print "This should not print"
    except:
        print "World"

foo()
bar()