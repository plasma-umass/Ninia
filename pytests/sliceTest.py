def slice_test(a):
  print a[0], a[-1], a[4]
  print a[:3]
  print a[-2:]
  print a[1:1]

slice_test(range(5))
slice_test(('a','b','c','d','e'))

