# A recursive function that has to return "1"
# for every positive integer input
def foo_rec(x):
    if x == 1:
        return x
    return foo_rec(x - 1)

print "Should print 1: ", foo_rec(2)
print "Should print 1: ", foo_rec(3)
print "Should print 1: ", foo_rec(5)


# Recursive fibonacci implementation
def fib_rec(n):
    if n < 3:
        # Call a recursive function inside of a recursive function
        return foo_rec(n)
    return fib_rec(n - 1) + fib_rec(n - 2)

print "2nd fibonacci number is: ", fib_rec(2)
print "3rd fibonacci number is: ", fib_rec(3)
print "6th fibonacci number is: ", fib_rec(6)
