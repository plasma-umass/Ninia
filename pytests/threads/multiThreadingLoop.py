# Two running threads -> 1) Main 2) Loop
# Main thread waits until count == 10000 and endMainLoop is set 
# This means Main thread waits until Loop terminates before it terminates itself and all other threads
# So both threads are run to completion and loop doesn't simply terminate just because the main thread terminated
import thread

endMainLoop = False
count = 0

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