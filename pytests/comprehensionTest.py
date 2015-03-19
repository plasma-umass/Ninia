
print [x for x in xrange(2)]
gen = (x for x in xrange(4,6))
for a in gen:
  print a
