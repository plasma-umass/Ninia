# Two running threads -> 1) Main 2) Loop
# Main thread waits until count == 10000 and endMainLoop is set 
# This means Main thread waits until Loop terminates before it terminates itself and all other threads
# So both threads are run to completion and loop doesn't simply terminate just because the main thread terminated
import thread

endMainLoop = False
count = 0
def incr():
    global count
    count = count + 1

def cond():
    return count == 10000

def loop(arg):
    global endMainLoop
    while True:
        incr()
        if(cond()):
            print "Finished with loop"
            endMainLoop = True
            break

thread.start_new_thread(loop, (1,))

while True:
    if(cond() and endMainLoop):
        print "Exiting main loop"
        break

print "All Threads Finished"