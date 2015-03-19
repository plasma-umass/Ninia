from __future__ import division

def inplace_ops(x, integral=True):
  x += 1
  print x
  x -= 1
  print x
  x *= 2
  print x
  x //= 2
  print x
  x **= 2
  print x
  if integral:
    x >>= 2
    print x
    x <<= 2
    print x
    x &= 7
    print x
    x |= 7
    print x
    x ^= 4
    print x
  x /= 2
  print x
  x %= 10
  print x

inplace_ops(7)
inplace_ops(7L)
inplace_ops(7., integral=False)
inplace_ops(7+7j, integral=False)
