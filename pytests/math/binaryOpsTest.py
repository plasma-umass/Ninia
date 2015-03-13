from __future__ import division

# Binary operations
def binary_ops(x, integral=True):
  print x + 1
  print x + (-2)
  print x - 1
  print x * 3
  print x // 4
  print x / 2
  print x / 2.0
  print x % 2
  print -x % 4
  print x % -3
  print x ** 4
  print x ** -2
  if integral:
    print x << 2
    print x >> 2
    print x & 3
    print x | 19
    print x ^ 14

binary_ops(5)
binary_ops(5L)
binary_ops(5., integral=False)
binary_ops(1+5j, integral=False)

