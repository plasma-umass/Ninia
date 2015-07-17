a = [2, 'z']
b = list(a)
print a, b, 2 in a, 'y' not in b

a = {'foo': 5}
b = dict(foo=5)
print a, b, 'foo' in a, 'bar' not in b

a = (1, 'x')
b = tuple([1, 'x'])
print a, b, 1 in a, 'y' not in b

a = {3, 4}
b = set((3, 4))
print a, b, 3 in a, 5 not in b

print 4 in xrange(12)
print 4 in xrange(4)
print 4 in xrange(6, 12)
print 4 in xrange(1, 12, 2)

# Non-exhaustive set of "easy" cases for builtin functions
print float(5), float('5')
print int(), int(5), int('1101', base=2)

