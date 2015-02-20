from __future__ import division


def test(testVal, refVal, name):
    if (testVal != refVal):
        print "FAILED:", name
        print "\tRESULT:", testVal, "!=", refVal
        return 0
    else:
        print "passed:", name
        return 1

passed = 0
total = 8

i = 10
l = 15L
f = 6.25
c = (12 - 3j)

print "(Note: Not guaranteed to be exhaustive."
passed = passed + test(i + l, 25L, "Integer + Long addition")
passed = passed + test(i + f, 16.25, "Integer + Float addition")
passed = passed + test(i + c, (22 - 3j), "Integer + Complex addition")
passed = passed + test(l - f, 8.75, "Long - float subtraction")
passed = passed + test(l * i, 150L, "Long * Integer mutliplication")
passed = passed + test(c * f, (75 - 18.75j), "Complex * float multiplication")
passed = passed + test(l / i, 1.5, "Long / Integer division (floating result)")
passed = passed + test(l ** 2, 225L, "Long ** Integer power")

print "Passed", passed, "/", total, "tests"
