# Multiple try-except blocks
def foo():
	try:
	    try:
	        print "Hello"
	        raise 
	        print "This should not print"
	    except:
	    	print "World"
	    	print "No more"
	except:
		print "The end"

foo()