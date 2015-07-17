
class TestContextManager(object):
  def __init__(self):
    print 'Setting up context manager'
  def __enter__(self):
    print 'Started context'
    return '<value>'
  def __exit__(self, exc_type, exc_value, exc_trace):
    print 'Left context:', exc_type, exc_value, exc_trace

print 'Before the context'
with TestContextManager() as foo:
  print 'Inside the context with:', foo
print 'After the context'

