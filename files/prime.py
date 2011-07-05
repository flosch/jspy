import math

MAX = 50
count = 3
overallcount = 0
while count < MAX:
    isprime = True

    for x in range(2, int(math.sqrt(count) + 1)):
        if count % x == 0:
            isprime = False
            break

    if isprime:
        overallcount += 1
        print count

    count += 1

print
print "Found", overallcount, "primes from 1 to", MAX, ":)"