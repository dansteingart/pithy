#! /usr/bin/python
import sys
from commands import getoutput as go
import re

#get process list
pss = go("ps ax | grep %s.py" % sys.argv[1])
pss = pss.split("\n")

for p in pss:
    ps =  p.split()[0] #get PID

    #get process tree for this process
    tk = go("pstree %s -A -p" % ps).split("\n")[0] 
    s = tk.find(ps) 
    print tk[s:]
    tk = re.findall(r'\d+', tk[s:])

    #for this process and each subprocess
    for t in tk:
      go("kill -9 %s" % t)
      #print int(ps)
      #print go("kill -9 %i" % int(ps))
      
      
