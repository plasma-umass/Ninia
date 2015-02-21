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

print "(Note: Not guaranteed to be exhaustive)"
passed = passed + test(-0 == 0, True, "Sanity check: 0 == 0")
passed = passed + test(10 == 10L, True, "Integer-Long equality")
passed = passed + test(300L > 10, True, "Long-Integer comparison")
passed = passed + test(-10.0 < 0, True, "Float-Integer comparison")
passed = passed + test(20.0 == 20L, True, "Float-Long equality")
passed = passed + test(3 == (3 + 0j), True, "Integer-Complex equality")
passed = passed + test(4L == (4 + 4j), False, "Long-Complex inequality")
passed = passed + test(3 <= 3.0, True, "Integer-Float LTE comparison")

print "Passed", passed, "/", total, "tests"
