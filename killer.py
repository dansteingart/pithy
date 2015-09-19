#! /usr/bin/python
import sys
from commands import getoutput as go
import re
import os 
#get process list
tokill = os.path.dirname(os.path.realpath(__file__))+'/code/' + sys.argv[1]
print tokill
pss = go("ps ax | grep %s.py" % (tokill))
print pss
pss = pss.split("\n")

for p in pss:
    ps =  p.split(" ")[0] #get PID
    #get process tree for this process
    tk = go("pstree %s -A -p" % ps.split("/")[-1]).split("\n")[0]
    s = tk.find(ps) 
    #print tk[0]
    tk = re.findall(r'\d+', tk[s:])
    print tk
    #for this process and each subprocess
    for t in tk:
      print go("kill -9 %s" % t)


