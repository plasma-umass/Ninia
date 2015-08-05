# Threads acquire a lock and modify global variable
import thread
num_threads = 1
lock = thread.allocate_lock()
def func(a):
    global num_threads
    lock.acquire()
    print "Num Thread: ", num_threads
    num_threads += 1
    lock.release()

thread.start_new_thread(func,(1,))
thread.start_new_thread(func,(2,))
thread.start_new_thread(func,(3,))
thread.start_new_thread(func,(4,))
thread.start_new_thread(func,(5,))
thread.start_new_thread(func,(6,))

def incr():
    pass

while num_threads < 7:
    incr()