import sys

arg = sys.argv[1]
print arg
from commands import getoutput as go

a = arg.split("BREAKKKKK")
dird = ""
fil = a[-1]+".py"
for i in a[:-1]: dird+=i+"/" 
go("mkdir -p code/"+dird)
print dird+fil
print go("cp code/%s.py code/%s/%s" % (arg,dird,fil))
