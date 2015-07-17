
print [x for x in xrange(2)]
gen = (x for x in xrange(4,6))
for a in gen:
  print a

print {x for x in xrange(6,8)}
print {x: 'X' for x in xrange(8,10)}

