num_passed = 0
num_tests = 0


def test(exp, act, name):
  global num_tests, num_passed
  num_tests += 1
  if exp == act:
    print 'passed: ' + name
    num_passed += 1
  else:
    print 'failed: ' + name

x = 0
for i in [2,3]:
  x += i
test(5, x, 'simple loop')

x = 0
for i in [6,5,4]:
  for j in [1,2]:
    x += i*j
test(45, x, 'nested loop')

x = 0
for i in xrange(4):
  x += i
test(6, x, 'xrange loop')

x = 0
for i in range(3):
  x += i
test(3, x, 'range loop')

print 'Passed', num_passed, '/', num_tests, 'tests'
