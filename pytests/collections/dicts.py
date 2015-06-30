
def dict_test(d):
  print d.get('bar', 'default')
  print d.get('baz', 'default')
  for key in sorted(d):
    print key, d[key]

dict_test(dict(foo=4, bar='x'))
dict_test({'foo': 4, 'bar': 'x', 5: 3.0})

l = dict(f=4)
print l.__getitem__('f')
l.__setitem__('f', 4)
print l['f']
l.__delitem__('f')
print l
