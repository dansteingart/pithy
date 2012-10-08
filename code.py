#! /usr/bin/python

import web
import os
import commands
import time
import json
import random
import string
from subprocess import Popen, PIPE, STDOUT
import glob
from datetime import datetime
import settings

urls = (
	'/history/','history',	
	'/runner/','runner',
	'/arbwrite/','arbwrite',	
	'/arbread/','arbread',	
	'/(.*)','generic'	
)

app = web.application(urls, globals())

this_path = os.path.realpath(".").split("/")[len(os.path.realpath(".").split("/"))-1]+"/"


#If we don't specify a URL, make a random one
class generic:
	def GET(self,generic):
		web.header('Content-Type','text/html; charset=utf-8', unique=True)
		out = open("static/index.html").read()
		#if generic == (this_path): 
			#return web.seeother(this_path+''.join(random.choice(string.ascii_uppercase + string.digits) for x in range(6)))	
		return out


#get history of a given script
class history:
	def POST(self):
		web.header('Content-Type','text/html; charset=utf-8', unique=True)
		x = web.input()
		page_name = x['page_name'].split("/")[1]
		length = len("_1314970891") #get length of timestamp
		structure = "code_stamped/"+page_name+"*"
		hist_list = []
		for thing in glob.glob(structure):
			check = thing.split("/")[1]
			check=check[0:len(check)-length]
			if check == page_name:
				name = thing.split("/")[1]
				date = int(name[len(name)+1-length:len(name)])
				d_tup = datetime.fromtimestamp(date)
				date = str(d_tup.year)+"-"+str(d_tup.month).rjust(2,"0")+"-"+str(d_tup.day).rjust(2,"0")+" "+str(d_tup.hour).rjust(2,"0")+":"+str(d_tup.minute).rjust(2,"0")+":"+str(d_tup.second).rjust(2,"0")			
				hist_list.append([name,date])
		hist_list = sorted(hist_list, key=lambda dater: dater[1])
		hist_list.reverse()
		return json.dumps({'out':hist_list})
		
class arbwrite:
	def POST(self):
		web.header('Content-Type','text/html; charset=utf-8', unique=True)
		x = web.input()
		page_name = x['page_name'].split("/")[1]
		try:
			open("code/"+page_name,'w').write(x['value'])
			open("code_stamped/"+page_name+"_"+str(int(time.time())),'w').write(x['value'])
		except Exception as err:
			web.debug(err)
			json.dumps({'success':"false",'state':str(err)})
		return json.dumps({'success':"true"})




bad_words = settings.bad_words
class runner:
	def POST(self):
		web.header('Content-Type','text/html; charset=utf-8', unique=True)
		x = web.input()
		page_name = x['page_name'].split("/")[1]
		script_name = x['script_name']
		prepend = settings.prepend		
		out = ""
		image_list = []
		try:
			tim = str(int(time.time()))
			counter = 0
			data = x['value']
			
			for b in bad_words:
				if data.find(b) > -1:
					out = "Found '"+b+"', this is a BAD WORD"
					return json.dumps({'out':out,'images':image_list})
			
			temp =""
			
			full_name = page_name
			try:
				temp = open("code/"+full_name).read()
			except Exception as errface:
				web.debug("flume")
				web.debug(errface)
				temp = "dood"
			if temp != data or temp == "dood":
				open("code/"+page_name,'w').write(data)
				open("code_stamped/"+page_name+"_"+str(int(time.time())),'w').write(x['value'])
						
			data = prepend+x['value']
			
			while data.find("showme()")>-1:
				data = data.replace("showme()","save_image('"+page_name+"_"+tim+"')\n",1)
				counter += 1

			open("code/temper.py",'w').write(data)
			
			out = ""
			fullcmd = settings.python_path+" "+os.path.realpath(".")+"/code/temper.py"
			p = Popen(fullcmd.split(),stdout=PIPE, stderr=PIPE)
			watchdog = 200 #20 seconds maximum execution time
			counter = 0
			while p.poll() == None:
				time.sleep(.1)
				counter +=1
				if counter > watchdog:
					p.kill()
					outerr = "Timed out, check for infinite recursion"
									
			if len(out) == 0: 
				stdout, stderr = p.communicate()
				out = stdout
				outerr = stderr

			for i in os.listdir("images"): 
				if i.find(page_name+"_"+tim) > -1: 
					image_list.append("images/"+i)
			
		except Exception as err:
			outerr = str(err)
		return json.dumps({'out':out,'outerr':outerr,'images':image_list})

		
class arbread:
	def POST(self):
		web.header('Content-Type','text/html; charset=utf-8', unique=True)
		x = web.input()
		back_to_pith = {}
		out = "Fill Me Up"
		page_name = x['page_name'].split("/")[len(x['page_name'].split("/"))-1]
		try:
			try:
				out = open("code/"+page_name).read()
			except:
				out = open("code_stamped/"+page_name).read()
		except Exception as err:
			web.debug(page_name)
			web.debug(err)
			a = 5
		#now get last set of data processed
		try:
			dataset = open("code/"+page_name+"_dataset").read()
		except:
			dataset = ""
		back_to_pith['script'] = out
		back_to_pith['dataset'] = dataset
		
		return json.dumps(back_to_pith)

if __name__ == "__main__": app.run()
