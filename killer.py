
#! /usr/bin/python
import sys
from commands import getoutput as go
import re
import os
#get process list

try:
    tokill = sys.argv[1]
except:
    tokill = 'microphone_check'

print tokill
pss = go("ps ax | grep %s" % (tokill))

pss = pss.split("\n")

for p in pss:
    ps =  p.split()[0] #get PID
    print ps
    print go("kill -9 %s" % ps)


