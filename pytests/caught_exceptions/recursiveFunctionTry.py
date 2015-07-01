# Exception handling for recursive functions
def foo(depth):
    print depth
    if depth == 0:
        raise
    else:
        depth = depth - 1
        foo(depth)

def bar():
    try:
        foo(10)
    except:
        print "Found"

bar()