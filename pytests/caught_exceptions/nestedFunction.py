# Exceptions should be propogated to their calling functions until an exception handler is found
def foo():
	try:
		bar()
	except:
		print "Hello"

def bar():
	print "World"
	foobar()

def foobar():
	print "Byee"
	raise

foo()