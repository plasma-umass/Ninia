# Threads wait to acquire the lock in turns
import thread

a_lock = thread.allocate_lock()
t1 = False
t2 = False
t3 = False
t4 = False

def incr():
    pass

def loop(asdf):
    global t1, t2
    t1 = True
    a_lock.acquire()
    print "T2: Acquired"
    print "T2: Releasing"
    a_lock.release()
    t2 = True

def loop2(asdf):
    global t3, t4
    t3 = True
    while(not t2):
        incr()
    a_lock.acquire()
    print "T3: Acquired"
    print "T3: Releasing"
    a_lock.release()
    t4 = True

a_lock.acquire()
print "T1: Acquired"

thread.start_new_thread(loop, (1,))
thread.start_new_thread(loop2, (1,))

while not (t1 and t3):
    incr()

print "T1: Releasing"
a_lock.release()

while not (t2 and t4):
    incr()

print "T1: Terminating"