def gen_123():
    yield 1
    yield 2
    yield 3

def gen_next():
    gen = gen_123()
    print gen.next()
    print gen.next()
    print gen.next()

def gen_loop():
    gen = gen_123()
    for x in gen:
        print x

gen_next()
gen_loop()