def name_error1():
    try:
        raise
    except:
        print "Success"

def name_error2():
    try:
        raise NameError
    except:
        print "Success"

def name_error3():
    try:
        raise Exception
    except Exception:
        print "Success"

def name_error4():
    try:
        try:
            raise
        except NameError:
            print "Failure"
    except:
        print "Success"

def name_error5():
    try:
        raise NameError
    except NameError:
        print "Success"


name_error1()
name_error2()
name_error3()
name_error4()
name_error5()