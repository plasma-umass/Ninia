import sys, traceback

def abcd():
    lumberjack()

def lumberjack():
    bright_side_of_death()

def bright_side_of_death():
    asdf

try:
    abcd()
except NameError:
    exc_type, exc_value, exc_traceback = sys.exc_info()

    # -------- print_tb complete ----------------#
    print "*** print_tb:"
    traceback.print_tb(exc_traceback)
    traceback.print_tb(exc_traceback, -1)
    traceback.print_tb(exc_traceback, 0)
    traceback.print_tb(exc_traceback, 3)

    # --------- print_exception complete --------------- #
    print "*** print_exception:"
    traceback.print_exception("ABCD", "EFG", exc_traceback)
    traceback.print_exception(exc_type, exc_value, exc_traceback)
    traceback.print_exception(exc_type, exc_value, exc_traceback, -1)
    traceback.print_exception(exc_type, exc_value, exc_traceback, 0)
    traceback.print_exception(exc_type, exc_value, exc_traceback, 3)

    # --------- print_exc complete --------------- #
    print "*** print_exc:"
    traceback.print_exc()
    traceback.print_exc(-1)
    traceback.print_exc(0)
    traceback.print_exc(3)

    # --------- format_exc complete --------------- #
    print "*** format_exc:"
    print traceback.format_exc(), traceback.format_exc(-1), traceback.format_exc(0), traceback.format_exc(3) 

    # --------- print_last complete --------------- #
    print "*** print_last:"
    print traceback.format_exc(), traceback.format_exc(-1), traceback.format_exc(0), traceback.format_exc(3) 

    # --------- extract_tb complete --------------- #
    print "*** extract_tb:"
    print traceback.extract_tb(exc_traceback)
    print traceback.extract_tb(exc_traceback, 0)
    print traceback.extract_tb(exc_traceback, -1)
    print traceback.extract_tb(exc_traceback, 3)

    # --------- format_list complete --------------- #
    print traceback.format_list([('spam.py', 3, '<module>', 'spam.eggs()'),('eggs.py', 42, 'eggs', 'return "bacon"')])

    # --------- format_exception_only complete --------------- #
    print traceback.format_exception_only("NamError", "Invalid name!")

    # Errenous test, skipped for now (Double quotes vs single quotes issue)
    # --------- format_exception complete --------------- #
    # print "*** format_exception:"
    # print traceback.format_exception(exc_type, exc_value,exc_traceback)
    # print traceback.format_exception(exc_type, exc_value,exc_traceback, 0)
    # print traceback.format_exception(exc_type, exc_value,exc_traceback, 3)
    # print traceback.format_exception(exc_type, exc_value,exc_traceback, -1)

    # --------- format_tb complete --------------- #
    print "*** format_tb:"
    print traceback.format_tb(exc_traceback)
    print traceback.format_tb(exc_traceback, 0)
    print traceback.format_tb(exc_traceback, 3)
    print traceback.format_tb(exc_traceback, -1)