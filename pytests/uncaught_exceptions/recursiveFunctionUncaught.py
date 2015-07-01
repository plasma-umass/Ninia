def foo(depth):
    print depth
    if depth == 0:
        raise
    else:
        depth = depth - 1
        foo(depth)

def bar():
    foo(10)

bar()