#! /usr/bin/python
import sys
from commands import getoutput as go
import re
import os
#get process list

try:  
    tokill = sys.argv[1]
except: 
    tokill = 'foof' 

print tokill
pss = go("ps ax | grep %s" % (tokill))

pss = pss.split("\n")

for p in pss:
    ps =  p.split()[0] #get PID
    print ps
    #get process tree for this process
    tk = go("pstree %s -A -p" % ps.split("/")[-1]).split("\n")[0]
    match = r'\((?:\d*\.)?\d+\)'
    tk = re.findall(match, tk)
    print tk
    #for this process and each subprocess
    for t in tk:
        t = t.replace("(","").replace(")","")
        print go("kill -9 %s" % t)







