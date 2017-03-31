##Author: Dan Steingart
##Date Started: tag test
##Notes: 


import sys
import json

try: 
    fil = sys.argv[1]
    lines = open("code/"+fil+".py",'r').read()
except Exception as E: 
    print E
    exit()

lines = lines.split('\n')

for l in lines:
    if l.find('tag:')>-1:
        bin = l.split('tag:')[1].strip()
        print bin,fil
        h = bin+".json"
        try: arr = json.load(open(h))
        except: arr = []
        print arr
        if fil not in arr:
            print "writing"
            arr.append(fil)
            json.dump(arr,open(h,'w'))
