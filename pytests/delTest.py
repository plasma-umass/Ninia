
a = 4
b = 3
del a

def foo():
  global b
  del b

foo.a = 4
del foo.a

foo()

c = [3,4,5,6]
del c[0]
print c
del c[:1]
print c
del c[:]
print c

