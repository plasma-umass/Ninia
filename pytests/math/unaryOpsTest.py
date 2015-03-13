# Unary operations

def test_unary(x, integral=True):
  print 'Unary test:', x
  print +x, -x,
  if integral:
    print ~x,
  print not x, `x`

test_unary(4)
test_unary(4., integral=False)
test_unary(4L)
test_unary(1+4j, integral=False)
