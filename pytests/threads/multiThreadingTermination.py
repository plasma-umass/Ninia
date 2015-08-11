# If main thread terminates, all other threads terminated
import thread

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

def loop(arg):
    while True:
        incr()
    print "This should not print"

print "Starting"
thread.start_new_thread(loop, (1,))
print "Ending"