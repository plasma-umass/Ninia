def slice_test(a):
  print a[0], a[-1], a[4]
  print a[:3]
  print a[-2:]
  print a[1:1]

slice_test(range(5))
slice_test(('a','b','c','d','e'))


# a[:]
a = range(10)
b = range(11, 14)
a[1:4] = b
print a


a = range(10)
b = range(11, 25)
a[:] = b
print a

# a[start:end]
a = range(10)
b = range(11, 13)
a[1:5] = b
print a

a = range(10)
b = range(11, 25)
a[1:3] = b
print a

# a[start:]
a = range(10)
b = range(11, 13)
a[1:] = b
print a

a = range(10)
b = range(11, 25)
a[1:] = b
print a

# a[:end]
a = range(10)
b = range(11, 13)
a[:5] = b
print a

a = range(10)
b = range(11, 25)
a[:5] = b
print a
