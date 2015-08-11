import thread
lock = thread.allocate_lock()
print "Unacquired: ", lock.locked()
print lock.acquire()
print "Acquired: ", lock.locked()
print lock.release()
print "Ending", lock.locked()