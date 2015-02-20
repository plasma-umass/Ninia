def test(testVal, refVal, name):
    if (testVal != refVal):
        print "FAILED:", name
        print "\tRESULT:", testVal, "!=", refVal
        return 0
    else:
        print "passed:", name
        return 1


def foo(x=1, y=2, z=3):
    return x + y + z

passed = 0
total = 8

passed = passed + test(foo(), 6, "No arguments")
passed = passed + test(foo(x=9), 14, "x has argument")
passed += test(foo(y=18), 22, "y has argument")
passed += test(foo(z=-1.0), 2.0, "z has argument")
passed += test(foo(x=4, y=64L), 71, "x and y have arguments")
passed += test(foo(z=-200.0, x=0), -198.0, "z and x have arguments (reversed)")
passed += test(foo(x=3, y=10.5, z=11), 24.5, "All 3 have arguments")
passed += test(foo(z=12.9, y=3, x=-30), -14.1,
               "All 3 have arguments (scrambled order)")

print "Passed", passed, "/", total, "tests"
