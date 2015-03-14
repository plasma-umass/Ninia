a = 4+3j
print hasattr(a, 'imag')
print getattr(a, 'real')

def b(): pass
setattr(b, 'foo', -1)
print b.foo
