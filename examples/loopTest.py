x = 0
for i in [2,3]:
  x += i

if x == 5:
  print 'simple loop: passed'
else:
  print 'simple loop: failed'

x = 0
for i in [6,5,4]:
  for j in [1,2]:
    x += i*j

if x == 45:
  print 'nested loop: passed'
else:
  print 'nested loop: failed'

