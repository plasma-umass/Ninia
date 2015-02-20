def test(testVal, refVal, name):
    if (testVal != refVal):
        print "FAILED:", name
        print "\tRESULT:", testVal, "!=", refVal
        return 0
    else:
        print "passed:", name
        return 1

x = (5j)
y = (-3 + 10j)
passed = 0
total = 14

# Basic math
passed = passed + test(x + y, (-3 + 15j), "Addition (2 complex numbers)")
passed = passed + test(x + 5, (5 + 5j), "Addition (complex + integer)")
passed = passed + test(x - y, (3 - 5j), "Subtraction (complex - complex)")
passed = passed + test(y - 3.0, (-6 + 10j), "Subtraction (complex - float)")
passed = passed + test(x * y, (-50 - 15j), "Multiplication (complex * complex)")
passed = passed + test(x * 2, 10j, "Multiplication (complex * integer)")
passed = passed + test(y // 4, (-1+0j), "Floor division (complex / integer)")
passed = passed + test(y / x, (2 + 0.6j), "Normal division (complex / complex)")
passed = passed + test(y / 4, (-0.75 + 2.5j),
    "Normal division (complex / integer)")
passed = passed + test(y % 4, (1 + 10j), "Modulo (complex % integer)")
passed = passed + test(y % x, (-3 + 0j), "Modulo (complex % imaginary)")
passed = passed + test(y % (2 + 5j), (-5 + 5j), "Modulo (complex % complex)")
passed = passed + test(y % 2, (1 + 10j), "Negative modulo")
passed = passed + test(-x, -5j, "Negation")

print "Passed", passed, "/", total, "tests"
