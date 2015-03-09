a = [2, 'z']
b = list(a)
print a, b

a = {'foo': 5}
b = dict(foo=5)
print a, b

a = (1, 'x')
b = tuple([1, 'x'])
print a, b

# Non-exhaustive set of "easy" cases for builtin functions
print float(5), float('5')
print int(), int(5), int('1101', base=2)
