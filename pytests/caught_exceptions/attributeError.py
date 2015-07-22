def error():
    try:
        return error.hello
    except AttributeError:
        print "Error"

error()