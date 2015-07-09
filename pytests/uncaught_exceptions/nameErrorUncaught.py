# def foo():
#     asdf

# foo()
class MyException(NameError):
    pass

# raise MyException("My hovercraft is full of eels")
def bar():
    # try:
    raise MyException
    # except:
    #     print "caught"

bar()