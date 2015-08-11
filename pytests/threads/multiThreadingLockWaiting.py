# Threads wait to acquire the lock in turns
import thread

a_lock = thread.allocate_lock()
t1 = False
t2 = False
t3 = False
t4 = False

# NOTE: Ninia's current Thread interface schedules threads based on the number of bytecode method resumes
# If Ninia comes across a long loop, it considers it to be a single bytecode method and starts executing it
# The threadpool is not able to schedule other threads, as the complete execution of a bytecode method is a single method resume
# e.g.
#     count = 1
#     while(True):
#          count = count + 1
#          if(count == 100000):
#              break
#
# In the example above, the threadpool cannot regain control and schedule other threads until loop execution is completed
# To counteract this, there must be at least one function call inside of a loop
# This results in the counter to be decremented inside of Thread.run and other threads can be scheduled
#
# This is a current limitation of Ninia since most programs with long-running loops call at least one function in the loop body which decrements the counter

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