from __future__ import division

# Binary operations
def binary_ops(x, integral=True, is_complex=False):
  print x + 1, x - 1, x * 3
  print x // 4, x / 2, x / 2.0
  print x % 2, -x % 4, x % -3
  p = x ** 4
  q = x ** -2
  if is_complex:
    print '<%.2f,%.2f>' % (p.real, p.imag)
    print '<%.3f,%.3f>' % (q.real, q.imag)
  else:
    print p
    print q
  if integral:
    print x << 2, x >> 2
    print x & 3, x | 19, x ^ 14

def binary_cmp():
  # hacky way of forcing the actual opcodes to get called
  zero = 0
  three = 3
  ten = 10
  tenf = 10.
  tenl = 10L
  print zero == -0
  print ten == tenl
  print tenf == tenl
  print tenl > three
  print zero < tenf
  print three == (3 + 0j)
  print tenl == (4 + 4j)
  print three <= 3.0

binary_ops(5)
binary_ops(5L)
binary_ops(5., integral=False)
binary_ops(1+5j, integral=False, is_complex=True)
binary_cmp()

