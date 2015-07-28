# TODO : Fix output ordering (so that it is deterministic)
import thread
t1 = False
t2 = False
count = 0
def incr():
    global count
    count = count + 1

def cond():
    if(count == 10000):
        return True
    return False

def func1(arg):
    while(1):
        if(cond() == True and t2 == True):
            print "Done"
            break

thread.start_new_thread(func1, (1,))

while(1):
    global t2
    incr()
    if(count == 10000):
        t2 = True
        break

print "All finished"