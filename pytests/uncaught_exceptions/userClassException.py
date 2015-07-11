class MyException(NameError):
    pass

class MyClass(MyException):
    pass

def error():
    raise MyClass, "Exception Message"

error()