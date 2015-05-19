#! /usr/bin/python
import sys
from commands import getoutput as go
pss = go("ps ax | grep %s.py" % sys.argv[1])

pss = pss.split("\n")
#print pss
for p in pss:
    ps =  p.split()[0]
    print int(ps)
    print go("kill -9 %i" % int(ps))
    
