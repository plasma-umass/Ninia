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
total = 15

# Basic math
passed = passed + test(5L + 1, 6, "Basic addition (5 + 1 = 6)")
passed = passed + test(5L + (-2), 3, "Negative addition (5 + (-2) = 3)")
passed = passed + test(5L - 1, 4, "Basic subtraction (5 - 1 = 4)")
passed = passed + test(5L * 3, 15, "Basic multiplication (5 * 3 = 15)")
passed = passed + test(7L // 4, 1, "Floor division (7 // 4 = 1)")
passed = passed + test(5L / 2, 2.5, "Normal division (5 / 2 = 2.5)")
passed = passed + test(5L / 2.0, 2.5, "Floating division (5 / 2.0 = 2.5)")
passed = passed + test(5L % 2, 1, "Basic modulo (5 % 2 = 1)")
passed = passed + test(-5L % 4, 3, "Negative modulo (-5 % 4 = 3)")
passed = passed + test(5L % -3, -1, "Negative modulo (5 % -3 = -1)")
passed = passed + test(5L ** 4, 625, "Positive power (5 ** 4 = 625)")
passed = passed + test(5L ** -2, 0.04, "Negative power (5 ** -2 = 0.04)")
passed = passed + test(5L << 2, 20, "Left shift (5 << 2 = 20)")
passed = passed + test(5L >> 2, 1, "Right shift (5 >> 2 = 1)")
passed = passed + test(~5L, -6, "Inversion (~5 = -6)")

print "Passed", passed, "/", total, "tests"
