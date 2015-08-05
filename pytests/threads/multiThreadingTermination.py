# If main thread terminates, all other threads terminated
import thread

count = 0
def incr():
    global count
    count = count + 1

def loop(arg):
    while True:
        incr()
    print "This should not print"

print "Starting"
thread.start_new_thread(loop, (1,))
print "Ending"