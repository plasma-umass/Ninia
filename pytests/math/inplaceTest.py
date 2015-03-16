
def inplace_ops(x):
  x += 1
  print x
  x -= 1
  print x
  x *= 2
  print x
  x /= 2
  print x

inplace_ops(7)
inplace_ops(7.)
inplace_ops(7L)
inplace_ops(7j)
