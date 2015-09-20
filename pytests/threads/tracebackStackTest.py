import traceback

def abcd():
    lumberjack()

def lumberjack():
    bright_side_of_death()

def bright_side_of_death():
    traceback.print_stack()
    print traceback.extract_stack()
    print traceback.format_stack()

abcd()