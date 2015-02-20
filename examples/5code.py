import dis


def abs(x):
    if x<0:
        x = -x
    return x

dis.dis(abs)
x = -5
print abs(x)
