
def math():
	a = 5
	b = 3
	
	# Swap operands
	a, b = b, a
	assert a == 3
	assert b == 5


tests = [math, ]

for test in tests:
	print "Running test:", test
	test()