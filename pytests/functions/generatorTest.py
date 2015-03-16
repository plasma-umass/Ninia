
def gen_123():
  yield 1
  yield 2
  yield 3

gen = gen_123()
print gen
for x in gen:
  print x

