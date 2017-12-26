//NodeJS Imports to Make Everything Just Work
var sharejs = require('share').server;

var http = require("http"); //HTTP Server
var url = require("url"); // URL Handling
var fs = require('fs'); // Filesystem Access (writing files)
var os = require("os"); //OS lib, used here for detecting which operating system we're using
var util = require("util");
var express = require('express'); //App Framework (similar to web.py abstraction)
var app = express();
var cors = require('cors');

//there is redundancy here that needs to be cleaned up
var exec = require('child_process').exec,child;
var spawn = require('child_process').spawn,child;

//For dealing with llocal files
var os = require("os")
var glob = require('glob')
var options = {db: {type: 'none'}};
 
//Create the server, start up sharejs.  Note this is an _old_ version of sharejs, pre 0.8.
server = http.createServer(app)
sharejs.attach(app, options);

//start socket.io
io = require('socket.io')
io = io.listen(server); //Socket Creations
io.set('log level', 1)

//a vestige, need to clean out.  don't change this

//basic authentication would be great to outh2 this sucka at some point 
app.use(express.basicAuth(function(user, pass, callback) {
	raw = fs.readFileSync(assetbase+"/pass.json").toString();
	things = JSON.parse(raw);
	names = things['things']
	var result = null;
	for (i in names)
	{
		nuser = names[i]['user'];
		npass = names[i]['pass'];
		if (user == nuser & pass == npass )
		{
			result = (user === nuser && pass === pass);
			result = user;
		} 
	}
 	callback(null /* error */, result); //on error
}));

app.use(cors());

//big hack to make killing work --> this should be necessary anhymore try to remove it and see what it does
var os_offset = 2
if (os.platform() == 'darwin') os_offset = 2

//make required directories


//setup variables for where stuff goes and comes from
codebase = "code/"
histbase = "code_stamped/"
tempbase = "temp_results/"
resbase = "results/"
tempbase = resbase //this should just work
stored_resbase = "marked_results/" //ambitions that never came to fruition
imgbase = "images/"
filebase = "files/"
assetbase = "assets/"

//What a new pages shows
base_template = "##Author: \n##Date Started: \n##Notes: \n";
pythonbin = "/usr/bin/python";
prependbase = "static/prepend.txt";
gitted = false;
var foldermode = false;
for (var i = 0; i < process.argv.length;i++)
{
	if (process.argv[i].search("--codebase=")>-1)
	{
		codebase = process.argv[i].split("=")[1]+"/";
	}
	if (process.argv[i].search("--histbase=")>-1)
	{
		histbase = process.argv[i].split("=")[1]+"/";
	}
	if (process.argv[i].search("--pythonbin=")>-1)
	{
		pythonbin = process.argv[i].split("=")[1];
	}
	if (process.argv[i].search("--prependbase=")>-1)
	{
		prependbase = process.argv[i].split("=")[1];
	}

	if (process.argv[i].search("--foldermode=")>-1)
	{
		foldermode = (process.argv[i].split("=")[1] == 'true');
	}


	
}



dirs = [tempbase,codebase,histbase,resbase,imgbase,filebase,assetbase]
for (d in dirs)
{
	dird = dirs[d].toString()
	console.log(dird)
	try
	{
		fs.mkdirSync(dird); 
		console.log(dird+" has been made")
	}
	catch (e) 
	{
		console.log(dird+" is in place")
	}
}

//create pithy.py lib if it doesn't already exist
try
{
	checkface = fs.readFileSync(codebase+'/pithy.py').toString()
	console.log("pithy.py is in place")
}
catch (e)
{
	console.log("making a pithy library")
	console.log(prependbase)
	fs.writeFileSync(codebase+'/pithy.py',fs.readFileSync(prependbase).toString())
}

//create python_basics.py lib if it doesn't already exist
try
{
	checkface = fs.readFileSync(codebase+'/python_basics.py').toString()
	console.log("tutorial is in place")
}
catch (e)
{
	console.log("making a tutorial")
	fs.writeFileSync(codebase+'/python_basics.py',fs.readFileSync('static/python_basics').toString())
}

//create pass.json file if it doesn't already exist
try
{
	checkface = fs.readFileSync(assetbase+'/pass.json').toString()
	console.log("pass.json is in place")
	
}
catch (e)
{
	console.log("making a password file")
	fs.writeFileSync(assetbase+'/pass.json',fs.readFileSync('static/passmold').toString())
}

//Basic Settings
settings = {
	//"bad_words" : ["rm ","write","while True:","open "],
	"python_path" : pythonbin,
	//'prepend' : "fs.readFileSync('static/prepend.txt').toString()"
	'prepend' : ""
}


//Socket Clean Up Via: http://stackoverflow.com/a/9918524/565514
var clients = {}
io.sockets.on('connection', function(socket) {
  	console.log(socket.id +" Connected")
  	var count = 0;
	for (var k in clients) {if (clients.hasOwnProperty(k)) {++count;}}
	console.log("Clients Connected:"+count)
	clients[socket.id] = socket;

  socket.on('disconnect', function() {
	console.log(socket.id +" Disconnected")
  	var count = 0;
	for (var k in clients) {if (clients.hasOwnProperty(k)) {++count;}}
	console.log("Clients Connected:"+count)
    delete clients[socket.id];
  });
});


//Process Management variables
var timers = []
var processes = {}
var send_list = []
var spawn_list = {}
var intervalers = {}
var results = {}

//Set Static Directories
app.use(express.bodyParser());
app.use("/static", express.static(__dirname + '/static'));
app.use("/images", express.static(__dirname + '/images'));
app.use("/"+filebase, express.static(__dirname + "/"+filebase));

//http://stackoverflow.com/a/4698083/565514
function sJAP(objArray, prop, direction){
    if (arguments.length<2) throw new Error("sortJsonArrayByProp requires 2 arguments");
    var direct = arguments.length>2 ? arguments[2] : 1; //Default to ascending

    if (objArray && objArray.constructor===Array){
        var propPath = (prop.constructor===Array) ? prop : prop.split(".");
        objArray.sort(function(a,b){
            for (var p in propPath){
                if (a[propPath[p]] && b[propPath[p]]){
                    a = a[propPath[p]];
                    b = b[propPath[p]];
                }
            }
            // convert numeric strings to integers
            a = a.match(/^\d+$/) ? +a : a;
            b = b.match(/^\d+$/) ? +b : b;
            return ( (a < b) ? -1*direct : ((a > b) ? 1*direct : 0) );
        });
    }
}

activefiles = []
hist_dict = []

function getBigHistory()
{
	out = fs.readdirSync(histbase)

	hist_dict = []
	for (i in activefiles)
	{
	
		its = activefiles[i].replace(".py","")
		things = activefiles[i].replace(".py","_1*")
		globs = glob.sync(histbase+"/"+things)
		hist_dict[hist_dict.length] = {'fil':its,'hits':globs.length}
	}

	//sort files (ht to http://stackoverflow.com/a/10559790)
	hist_dict.sort(function(a, b) {
	               return a.hits - b.hits;
	           });
	hist_dict.reverse()
	
}



app.get('/*', function(req, res){
	if (req.params[0] == "") 
	{
		if (req.params[0] == "") 
		{
			indexer = fs.readFileSync('static/homepage.html').toString()

			//New Files
			//get file list
			out = fs.readdirSync(codebase)
			//sort files (ht to http://stackoverflow.com/a/10559790)
			
			out.sort(function(a, b) {
			               return fs.statSync(codebase + a).mtime - 
			                      fs.statSync(codebase + b).mtime;
			           });
	 		out.reverse()
			
			lts = "" //list to send
			count_limit = 20;
			
			count = 0 
			for (var i in out)
			{	foo = out[i].replace(".py","")
				dater = fs.statSync(codebase + out[i]).ctime.toDateString()
				if (foo != "temper" && foo !=".git") lts += "<span class='leftin'><a href='/"+foo+"'>"+foo+ "</a></span><span class='rightin'> " + dater+"</span><br>";
				count +=1
				if (count > count_limit) break; 
			}

			base_case = 0
			lts += "<br>all code <a href='/code/'>here</a>"
			indexer = indexer.replace("##_newthings_##",lts)
			activefiles = out

			lts = "" //list to send
		
			count = 0 
			
			for (j in hist_dict)
			{	
				i = hist_dict[j]['fil']
				k = hist_dict[j]['hits']
			
				if (i != "temper") lts += "<span class='leftin'><a href='/"+i+"'>"+i+ "</a></span><span class='rightin'> " + k+" edits</span><br>";
				count +=1
				if (count > count_limit) break; 
			}

			base_case = "0"

			indexer = indexer.replace("##_changethings_##",lts)


			//New Files
			//get file list
			out = fs.readdirSync(filebase)
			//sort files (ht to http://stackoverflow.com/a/10559790)
			out.sort(function(a, b) {
			               return fs.statSync(filebase + a).ctime - 
			                      fs.statSync(filebase + b).ctime;
			           });
	 		out.reverse()
			lts = "" //list to send
		
			count_limit = 20;
			
			count = 0 
			for (var i in out)
			{	foo = out[i]//.replace(".py","")
				dater = fs.statSync(filebase + out[i]).ctime.toDateString()
				lts += "<span class='leftin'><a href='/files/"+foo+"'>"+foo+ "</a></span><span class='rightin'> " + dater+"</span><br>";
				count +=1
				if (count > count_limit) break; 
			}

			base_case = 0

			indexer = indexer.replace("##_popthings_##",lts)
			

			res.send(indexer)

		}

	}

	else if(req.params[0] == "files/" || req.params[0] == "files")
	{
		indexer = fs.readFileSync('static/filedex.html').toString()
		//get file list
		out = fs.readdirSync(filebase)
		//sort files (ht to http://stackoverflow.com/a/10559790)
		out.sort(function(a, b) {
		               return fs.statSync(filebase + a).ctime - 
		                      fs.statSync(filebase + b).ctime;
		           });
 		out.reverse()
		lts = "" //list to send
		for (i in out)
		{
			lts += "<a href='/"+filebase+out[i]+"'>"+out[i] + "</a> , " + fs.statSync(filebase + out[i]).ctime+"<br>";
		}
		indexer = indexer.replace("##_filesgohere_##",lts)
		res.send(indexer)
	}
	else if(req.params[0] == "code/" || req.params[0] == "code")
	{
		indexer = fs.readFileSync('static/filedex.html').toString()
		//get file list
		out = fs.readdirSync(codebase)
		//sort files (ht to http://stackoverflow.com/a/10559790)
		out.sort(function(a, b) {
		               return fs.statSync(codebase + a).ctime - 
		                      fs.statSync(codebase + b).ctime;
		           });
 		out.reverse()
		lts = "" //list to send
		for (i in out)
		{
			oo = out[i].replace(".py","")
			lts += "<a href='/"+oo+"'>"+oo + "</a> , " + fs.statSync(codebase + out[i]).ctime+"<br>";
		}
		indexer = indexer.replace("##_filesgohere_##",lts)
		res.send(indexer)
	}
	else
	{
		var actionfile = 'static/index.html'
		if (foldermode) actionfile = 'static/findex.html'

		indexer = fs.readFileSync(actionfile).toString()
		res.send(indexer)
	}
});

app.post("*/killer",function(req,res)
	{
		x = req.body.page_name;
		console.log(x)
		thispid = processes[x];
		
		console.log("trying to kill " + x)
		if (thispid != undefined)
		{
			console.log("killing in the name of "+thispid)
			exec("/usr/bin/python killer.py "+x,function(stdout,stderr)
			{
				outer = stdout+","+stderr
				console.log(outer)
				if (outer.search("No such process") == -1)
				{
					console.log(thispid)
					delete processes[x];
					timers[thispid] = false
				}
			})
		}
	res.json({success:true})	
})

app.post('*/run', function(req, res)
{
	x = req.body
	page_name = x['page_name'].replace("/","").split("/")[0]
	script_name = x['script_name']
	prepend = settings.prepend		
	out = ""
	image_list = []

	//Querer to prevent race condition
	send_list.push({'page_name':page_name,'data':{out:"waiting for output"}})
	time = new Date().getTime().toString()
	counter = 0
	data = x['value']
	for (b in settings.bad_words)
	{
		if (data.search(b) > -1)
		{
			out = "Found '"+b+"', this is a BAD WORD"
			res.json({'out':out,'images':image_list})
			break
		}
	}
	temp =""

	full_name = page_name+".py"
	
	checkcheck = "python static/tag_find.py "+page_name
	exec(checkcheck);
	
	
	try
	{
		temp = fs.readFileSync(codebase+full_name).toString()
	}
	catch (e)
	{
		temp = "dood"
	}

	if (temp != data || temp == "dood")
	{
		
		fs.writeFileSync(codebase+full_name,data);
		fs.writeFileSync(histbase+page_name+"_"+time,data);
		
		if (gitted)
		{
			gitter = "cd code; git add *.py; git commit -m 'auto commit; user:"+req.user+"'; git push"
			exec(gitter);
			console.log('user:'+req.user);
		}
	}

	res.json({success:true})	
	if (processes[page_name] == undefined) gofer = betterexec(page_name,x)
	console.log(gofer)
	processes[page_name] = gofer['name']
	console.log(processes)
	timers[processes[page_name]] = true
		
	
});

app.post('*/history', function(req, res)
{
	x = req.body;
	page_name = x['page_name']
	length = "_1314970891000".length //get length of timestamp
	structure = histbase+page_name+"*"
	thing_list = []

	fils  = fs.readdirSync(histbase)
	for (i in fils)
	{
		if (fils[i].search(page_name+"_") > -1) 
		{
			thing_list.push(fils[i])
		}
	}
		
	fils = thing_list
	fils.sort()
	fils.reverse()
	hist_list = []
	for (i in fils)
	{
		//time_part = parseInt(fils[i].split("_")[1])
		time_part = parseInt(fils[i].substr(fils[i].length - length+1))
		//console.log(time_part)
		date = new Date(time_part)
		hour = date.getHours()
		min = date.getMinutes()
		sec = date.getSeconds()
		day = date.getDate()
		month = date.getMonth()
		year = date.getYear()
		time_part = month+"/"+day+"/"+year+" "+hour+":"+min+":"+sec;
		hist_list.push([fils[i],date.toISOString()])
	}
		
	res.json({'out':hist_list})
});


app.post('*/markedresults', function(req, res)
{
	x = req.body;
	page_name = x['page_name']
	console.log(x)
	length = "_1314970891000".length //get length of timestamp
	structure = stored_resbase+page_name+"*"
	thing_list = []

	fils  = fs.readdirSync(stored_resbase)
	for (i in fils)
	{
		console.log(fils[i])
		console.log(page_name)
		if (fils[i].search(page_name+"_") > -1) 
		{
			thing_list.push(fils[i])
		}
	}
		
	fils = thing_list
	fils.sort()
	fils.reverse()
	console.log(fils);
	
	hist_list = []
	for (i in fils)
	{
		time_part = parseInt(fils[i].substr(fils[i].length - length+1))
		marked_name = JSON.parse(fs.readFileSync(stored_resbase+fils[i]))['name']
		hist_list.push([fils[i],marked_name])
	}
	console.log(hist_list);
		
	res.json({'out':hist_list})
});


app.post('*/read', function(req, res)
{
	
	x = req.body
	back_to_pith = {}
	out = base_template
	page_name = x['page_name'].replace("/","").split("/")[0]
	
	try{
	try
	{
		out = fs.readFileSync(codebase+page_name+".py").toString()
		
		
	}
	catch (e)
	{
		out = fs.readFileSync(histbase+page_name).toString()		
	}
	}
	catch (e)
	{
		out =  base_template
	}

	back_to_pith['script'] = out
	res.json(back_to_pith)
	
	try
	{
		resulters = fs.readFileSync(resbase+page_name).toString()
		resulters = JSON.parse(resulters)	
		if (!processes.hasOwnProperty(page_name)) send_list.push({'page_name':page_name,'data':resulters})

	}
	catch (e)
	{	
		console.log(e)
	}
	
});

app.post('*/readresults', function(req, res)
{
	
	x = req.body
	back_to_pith = {}
	out =  base_template
	page_name = x['page_name']
	try
	{
		out = fs.readFileSync(resbase+page_name).toString()		
	}
	catch (e)
	{
		//console.log(e)
		out =  base_template
	}
	
	//get cc
	cc = x['cc']
	if (cc == undefined)  cc = 0;
	res.json( JSON.parse(out.substring(cc)) )
	
});

app.post('*/copyto',function(req,res)
{
	x = req.body
	page_name = x['page_name'].replace("/","")
	script_name = x['script_name']
	data = x['value']
	full_name = script_name+".py"
	fs.writeFileSync(codebase+full_name,data);
	res.json({success:true,redirect:script_name})	

})

app.post('*/markresult',function(req,res)
{
	x = req.body
	page_name = x['page_name'].replace("/","")
	result_name = x['result_name']
	console.log(result_name)
	result_set = ""
	try
	{
		hacky_name = stored_resbase+page_name+"_"+parseInt(new Date().getTime())
		out = fs.readFileSync(resbase+page_name).toString()		
		result_set = JSON.parse(out)
		result_set['code'] = fs.readFileSync(codebase+page_name+".py").toString()
		result_set['name'] = result_name
		result_set['filename'] = hacky_name
		fs.writeFileSync(hacky_name,JSON.stringify(result_set))
	}
	catch (e)
	{
		//console.log(e)
		out =  base_template
	}
	
	console.log(result_set)
})



gitted = false;
for (var i = 0; i < process.argv.length;i++)
{
	if (process.argv[i] == "--gitted") gitted = true;
}



//Start It Up!
server.listen(process.argv[2]);
console.log('Listening on port '+process.argv[2]);

//----------Helper Functions----------------------------

times = {}
//big ups to http://stackoverflow.com/questions/13162136/node-js-is-there-a-way-for-the-callback-function-of-child-process-exec-to-ret/13166437#13166437
function betterexec(nameo,fff)
{
	parts = fff['page_name'].split("/")
	estring = "";
	for (var i=2; i < parts.length;i++) 
	{
		estring += parts[i]+" ";
	}
	
	essence = __dirname+"/"+codebase+nameo
	big_gulp = settings.python_path+" -u '"+essence+".py' "+estring
	fullcmd = "touch "+tempbase+parts[1] +"; " +big_gulp+" > '"+tempbase+nameo+"'"
	
	start_time = new Date().getTime()
	times[nameo] = start_time
	console.log(times)
	chill = exec(fullcmd,
	function (error, stdout, stderr) {
		this_pid = chill.pid
		console.log("this pid is " +this_pid)
		console.log(nameo+" is done")
		end_time = new Date().getTime()
		exec_time = end_time - times[nameo];
		
		foost = fs.readFileSync(tempbase+nameo).toString()
		big_out = {'out':stdout+foost,'outerr':stderr,'images':[],'exec_time':exec_time}
		send_list.push({'page_name':nameo,'data':big_out})
		
		if (stderr.search("Terminated") == -1) fs.writeFileSync(resbase+nameo,JSON.stringify(big_out))
		
		//Delete Processes
		delete processes[nameo];
		delete times[nameo];		
		timers[processes[nameo]] = false

		
	})

	return {'pid':chill.pid + os_offset,'name':essence}
}

//Makes random page
//cribbed from http://stackoverflow.com/a/1349426/565514
function makeid()
{
    var text = "";
    var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

    for( var i=0; i < 5; i++ )
        text += possible.charAt(Math.floor(Math.random() * possible.length));

    return text;
}

//Queue to prevent socket race conditions, fires a message from the buffer every x ms
//TODO: Figure out how to reduce interval time without buffer?

old_send = []
setInterval(function(){
	this_send = send_list.splice(0,1)[0]
	
	if (this_send != undefined) 
	{
			//console.log(send_list.length + " message(s) in queue")
			io.sockets.emit(this_send['page_name'],this_send['data'])
			old_send = this_send
		
	};
},100)




//Process Checker
setInterval(function() {
	for (p in processes)
	{
		bettertop(p)
	
	}
}, 1000);


//flush images
setInterval(function() {
	
	chill = exec("rm images/*",
		function (error, stdout, stderr) 
		{
			console.log(stdout)
			console.log("flushed images")
		}
)
	}, 6000000);
	

lastcheck = {}


//This checks in on the process and sends an update as to how long it's been working
function bettertop(p)
{
	try{
		//compare time to start time
		now = new Date().getTime();
		diff = now - times[p]
		filemtime = new Date(fs.statSync(tempbase+p)['mtime']).getTime()
		outer = fs.readFileSync(tempbase+p).toString() + "\n<i>been working for " + diff + " ms</i>" 
		send_list.push({'page_name':p,'data':{out:outer}})
		
	}
	catch(e){
		console.log(processes[p]);
		console.log(results)
		console.log(e)
	}
	
}
