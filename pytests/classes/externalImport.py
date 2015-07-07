import sys
sys.path.append("./pytests/classes/nestedFolder")
from pet import Pet

p = Pet("CoolGuy", "Llama")

print p.name
print p.__dict__['name']
print p.getName()

from specific_pets import Dog, Cat

d = Dog("Fido", False)
print d.name
print d.__dict__['name']
print d.getName()
print d.chasesCats()

print isinstance(p, Pet)
print isinstance(p, Dog)
print isinstance(d, Pet)
print isinstance(d, Dog)
print isinstance(d, Cat)
