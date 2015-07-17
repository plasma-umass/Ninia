import sys
sys.path.append("./pytests/classes/nestedFolder")
from specific_pets import *

print 'Cat' in locals()
print 'Dog' in locals()
print 'Pet' in locals()
print '_Hidden' in locals()

from specific_pets import _Hidden
print '_Hidden' in locals()

