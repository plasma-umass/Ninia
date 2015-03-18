for i in [2, 3]:
    print i

for i in [6, 5, 4]:
    for j in [1, 2]:
        print i, j

for i in xrange(4):
    print i

for i in range(3):
    print i

for i in range(0, 10, 2):
    print i

for i in range(0, -10, -2):
    print i

for i in range(4, 7):
    print i
    break
else:
    print 'should not print this'

for i in ['a', 'b']:
    try:
        continue
        print 'should not print this'
    finally:
        print i

