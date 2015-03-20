
a = set(['a', 'b', 'c', 'd'])
b = set(['c', 'd', 'e', 'f'])
c = set(['a', 'c'])

def canonical_print(x):
  print repr(x)[:3], sorted(x)


canonical_print(a & b)
canonical_print(a - b)
canonical_print(a ^ b)
canonical_print(a | b)

# subset checks
print c < a

