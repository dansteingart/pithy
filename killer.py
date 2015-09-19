#! /usr/bin/python
import sys
from commands import getoutput as go
import re

pss = go("ps ax | grep %s.py" % sys.argv[1])

pss = pss.split("\n")
#print pss
for p in pss:
    ps =  p.split()[0]
    tk = go("pstree %s -A -p" % ps).split("\n")[0]
    s = tk.find(ps)
    print tk[s:]
    tk = re.findall(r'\d+', tk[s:])
    for t in tk:
      go("kill -9 %s" % t)
      #print int(ps)
      #print go("kill -9 %i" % int(ps))
      
      
