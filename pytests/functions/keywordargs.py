
def foo(x=1, y=2, z=3):
    return x + y + z

print foo(), "No arguments"
print foo(x=9), "x has argument"
print foo(y=18), "y has argument"
print foo(z=-1.0), "z has argument"
print foo(x=4, y=64L), "x and y have arguments"
print foo(z=-200.0, x=0), "z and x have arguments (reversed)"
print foo(x=3, y=10.5, z=11), "All 3 have arguments"
print foo(z=12.9, y=3, x=-30), "All 3 have arguments (scrambled order)"

args = (2, 3)
kwargs = dict(z=4)
print foo(*args)
print foo(**kwargs)
print kwargs
print foo(*args, **kwargs)
print kwargs
