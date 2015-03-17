foo = 4
bar = []

def outer(arg=5):
  print foo, bar, arg
  local = 2
  def inner():
    print foo, bar, arg
    local = -1
  inner()
  print local

outer()

def o():
  a = 0
  def i():
    return a
  a += 1
  return i

i = o()
print i()
