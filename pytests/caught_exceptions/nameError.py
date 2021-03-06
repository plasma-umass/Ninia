def catching_less():
    try:
        raise NameError
    except:
        print "Success"

def catching_same():
    try:
        raise Exception("Hello")
    except Exception:
        print "Success"

def bar():
    raise Exception

def foo():
    try:
        bar()
    except NameError:
        print "Failure"

def nested():
    try:
        foo()
    except Exception:
        print "Success"

def nested_try():
    try:
        try:
            raise
        except NameError:
            print "Failure"
    except:
        print "Success"

def catching_same2():
    try:
        raise NameError("Message")
    except NameError:
        print "Success"

def multiple_arg():
    try:
        raise NameError, "Message"
    except Exception:
        print "Caught"

catching_less()
catching_same()
nested()
nested_try()
catching_same2()
multiple_arg()