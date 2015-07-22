def zero():
    try:
        print 1/0
    except ZeroDivisionError:
        print "Error"

def arith():
    try:
        1/0
    except ArithmeticError:
        print "Error"

zero()
arith()