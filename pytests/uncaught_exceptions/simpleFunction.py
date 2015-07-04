def foo():
	bar()

def bar():
	print "World"
	foobar()

def foobar():
	print "Byee"
	raise

foo()