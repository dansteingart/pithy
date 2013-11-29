//NodeJS Imports to Make Everything Just Work
var sharejs = require('share').server;

var http = require("http"); //HTTP Server
var url = require("url"); // URL Handling
var fs = require('fs'); // Filesystem Access (writing files)
var os = require("os"); //OS lib, used here for detecting which operating system we're using
var util = require("util");
var express = require('express'); //App Framework (similar to web.py abstraction)
var app = express();
var exec = require('child_process').exec,
  child;
var spawn = require('child_process').spawn,
	child;
var os = require("os")
var glob = require('glob')
var options = {db: {type: 'none'}};
 
server = http.createServer(app)
sharejs.attach(app, options);

io = require('socket.io')
io = io.listen(server); //Socket Creations
io.set('log level', 1)

//POC = process.argv[2]
POC = "" //trust me
console.log("reflecting changes oK!")
app.use(express.basicAuth(function(user, pass, callback) {
 
	raw = fs.readFileSync(__dirname + "/pass.json").toString();
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
		} 
	}
 	callback(null /* error */, result);

}));


//big hack to make killing working
var os_offset = 2
if (os.platform() == 'darwin') os_offset = 2

//make required directories
dirs = ['temp_results','code','code_stamped','results','images','files']
for (d in dirs)
{
	dird = dirs[d]+POC.toString()
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

codebase = __dirname + "/code"+POC+"/"
histbase = __dirname + "/code_stamped"+POC+"/"
tempbase = __dirname + "/temp_results"+POC+"/"
resbase = __dirname + "/results"+POC+"/"
imgbase = __dirname + "/images"+POC+"/"
filebase = __dirname + "/files"+POC+"/"


//create pithy.py lib if it doesn't already exist
try
{
	checkface = fs.readFileSync(codebase+'/pithy.py').toString()
	console.log("pithy.py is in place")
	
}
catch (e)
{
	console.log("making a pithy library")
	fs.writeFileSync(codebase+'/pithy.py',fs.readFileSync(__dirname + '/static/prepend.txt').toString())
}

//create pass.json file if it doesn't already exist
try
{
	checkface = fs.readFileSync(__dirname + '/pass'+POC+'.json').toString()
	console.log("pass.json is in place")
	
}
catch (e)
{
	console.log("making a password file")
	fs.writeFileSync(__dirname + '/pass'+POC+'.json',fs.readFileSync(__dirname + '/static/passmold').toString())
}

//Basic Settings
settings = {
	//"bad_words" : ["rm ","write","while True:","open "],
	"python_path" : "python",
	//'prepend' : "fs.readFileSync('static/prepend.txt').toString()"
	'prepend' : ""
	
}


//Clean Up Via: http://stackoverflow.com/a/9918524/565514
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

getBigHistory()

setInterval(
	function()
	{
		getBigHistory()
	},60000)


app.get('/*', function(req, res){

	if (req.params[0] == "") 
	{
		//res.redirect("/"+makeid());
		if (req.params[0] == "") 
		{
			indexer = fs.readFileSync(__dirname + '/static/homepage.html').toString()

			//New Files
			//get file list
			out = fs.readdirSync(codebase)
			//sort files (ht to http://stackoverflow.com/a/10559790)
			
			out.sort(function(a, b) {
			               return fs.statSync(codebase + a).ctime - 
			                      fs.statSync(codebase + b).ctime;
			           });
	 		out.reverse()
			
			lts = "" //list to send
			count_limit = 20;
			
			count = 0 
			for (var i in out)
			{	foo = out[i].replace(".py","")
				dater = fs.statSync(codebase + out[i]).ctime.toDateString()
				if (foo != "temper") lts += "<span class='leftin'><a href='/"+foo+"'>"+foo+ "</a></span><span class='rightin'> " + dater+"</span><br>";
				count +=1
				if (count > count_limit) break; 
			}

			base_case = 0

			indexer = indexer.replace("##_newthings_##",lts)
			activefiles = out
		
		
			//Hist Files
			//get file list
			
			
				
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
		indexer = fs.readFileSync(__dirname + '/static/filedex.html').toString()
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
	else
	{
		indexer = fs.readFileSync(__dirname + '/static/index.html').toString()
		res.send(indexer)
	}
  	//console.log(req.params)
});

app.post("*/killer",function(req,res)
	{
		
		x = req.body.page_name;
		console.log(x)
		thispid = processes[x].path;
		
		console.log("trying to kill " + x)
		if (thispid != undefined)
		{
			console.log("killing "+thispid)
			//exec("kill "+thispid,function(stdout,stderr)
			exec("/usr/bin/python killer.py "+thispid,function(stdout,stderr)
			
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
	//console.log(x)
	page_name = x['page_name'].replace("/","").split("/")[0]
	script_name = x['script_name']
	prepend = settings.prepend		
	out = ""
	image_list = []
	
	//Queuer to prevent race condition
	send_list.push({'page_name':page_name + '/clear'})
	send_list.push({'page_name':page_name,'data':{out:"waiting for output<br>"}})
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
	}

/*	
	data = prepend+data
	while (data.search("showme()")>-1)
	{
		data = data.replace("showme()","save_image('"+page_name+"_"+time+"')\n",1)
		counter ++;
	}
*/	
	
	fs.writeFileSync(codebase+"temper.py",data)
	res.json({success:true})	
	if (processes[page_name] == undefined) gofer = betterexec(page_name,x)
	console.log(gofer)
	//processes[page_name] = gofer['id']
	processes[page_name] = {path:gofer['name'], pos:0}
	//console.log(processes[page_name])
	console.log(processes)
	timers[processes[page_name].path] = true
	
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

app.post('*/read', function(req, res)
{
	
	x = req.body
	back_to_pith = {}
	out = "Fill Me Up"
	//page_name = x['page_name'].replace("/","")
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
		out = "fill me up"
	}

	back_to_pith['script'] = out
	
	
	try
	{
		//Don't send saved results if this script is running
		if(!processes.hasOwnProperty(page_name)){
			resulters = fs.readFileSync(resbase+page_name).toString()
			resulters = JSON.parse(resulters)	
			
			data = build_output(resulters, page_name)
			data['images']=resulters['images']
			data['exec_time']=resulters['exec_time']
			
		}else{
			try{
				resulters = fs.readFileSync(tempbase+page_name).toString()	
				data = {out:resulters}
				
			}catch(e){
				//no output yet, do nothing
				return	
			}
		}
		
		
		back_to_pith['data'] = data
		
		//console.log('read, processes has pagename?: ' + processes.hasOwnProperty(page_name) + ", " + page_name + ", " + Object.keys(processes).length)
		//send_list.push({'page_name':page_name+'/read','data':resulters})
		
		
	}
	catch (e)
	{	
		console.log(e)
	}
	
	res.json(back_to_pith)
	
});

app.post('*/readresults', function(req, res)
{
	
	x = req.body
	back_to_pith = {}
	out = "Fill Me Up"
	page_name = x['page_name']
	try
	{
		out = fs.readFileSync(resbase+page_name).toString()		
	}
	catch (e)
	{
		//console.log(e)
		out = "fill me up"
	}
	//console.log(out)
	res.json( JSON.parse(out) )
	
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


//Start It Up!
server.listen(process.argv[2]);
console.log('Listening on port '+process.argv[2]);

//----------Helper Functions----------------------------

times = {}
//big ups to http://stackoverflow.com/questions/13162136/node-js-is-there-a-way-for-the-callback-function-of-child-process-exec-to-ret/13166437#13166437
function betterexec(nameo,fff)
{
	//fullcmd = "touch temp_results/"+nameo +"; " +settings.python_path+" -u '"+__dirname+"/code/"+namemo+".py' > 'temp_results/"+nameo+"'"
	
	parts = fff['page_name'].split("/")
	estring = "";
	for (var i=2; i < parts.length;i++) 
	{
		estring += parts[i]+" ";
	}
	
	
	essence = codebase+nameo
	big_gulp = settings.python_path+" -u \""+essence+".py\" "+estring
	fullcmd = "touch \""+tempbase+parts[1] +"\" & " +big_gulp+" > \""+tempbase+nameo+"\""
	console.log(fullcmd)
	
	start_time = new Date().getTime()
	lastcheck[nameo] = start_time
	times[nameo] = start_time
	chill = exec(fullcmd,
	function (error, stdout, stderr) {
		this_pid = chill.pid
		console.log("this pid is " +this_pid)
		hacky_name = nameo
		timers[processes[hacky_name].path] = false
		console.log(hacky_name+" is done")
		end_time = new Date().getTime()
		
		pos = processes[nameo].pos
		
		stats = fs.statSync(tempbase+nameo)
		//error thrown if amount to read is 0
		exec_time = end_time - start_time;
		
		buffer = new Buffer(stats['size']-pos)
		if(pos<stats['size']){
			fd = fs.openSync(tempbase+nameo, 'r')
			
			bytesread = fs.readSync(fd, buffer, 0, buffer.length, pos	)
			processes[nameo].pos = pos+bytesread
			
			
		
		}
		delete processes[hacky_name];
		delete times[hacky_name];		
		//fils = fs.readdirSync("images")
		
		data = build_output({'out':buffer.toString(),'stdout': stdout, 'outerr':stderr}, nameo)
		data['images']=[]
		data['exec_time']=exec_time
		
		send_list.push({'page_name':hacky_name,'data':data})
		
		
		
		if (stderr.search("Terminated") == -1){
			foost = fs.readFileSync(tempbase+nameo).toString()
			big_out = {'out':stdout+foost,'outerr':stderr,'images':[],'exec_time':exec_time}
			fs.writeFileSync(resbase+hacky_name,JSON.stringify(big_out))
		 }
		
	})
	//console.log(big_gulp)
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
//TODO: Figure out how to reduce interval time without 
//buffer?
oldsend = ""
setInterval(function(){
	this_send = send_list.splice(0,1)[0]
	if (this_send != undefined) 
	{
			
			io.sockets.emit(this_send['page_name'],this_send['data'])
		
	};
},100)




//Process Checker
setInterval(function() {
	for (p in processes)
	{
		bettertop(p, processes[p].pos)
	
	}
}, 1000);


//flush images
setInterval(function() {
	
	chill = exec("rm images/*",
		function (error, stdout, stderr) 
		{
			console.log(stdout)
			console.log("flushed images")
		})
	}, 600000);
	

lastcheck = {}

function bettertop(p, pos)
{
	if(!pos) pos = 0
	try{
		//outer = execSync.stdout("top -b -n 1 -p "+processes[p]);
		now = new Date().getTime()
		diff = now - times[p]
		stats = fs.statSync(tempbase+p)
		filemtime = stats['mtime'].getTime()
		diff2 = filemtime - lastcheck[p]
		//if ((diff2) > 100)
		//{
			lastcheck[p] = now
			fd = fs.openSync(tempbase+p, 'r')
			buffer = new Buffer(stats['size']-pos)
			
			//error thrown if amount to read is 0
			if(pos<stats['size']){
				bytesread = fs.readSync(fd, buffer, 0, buffer.length, pos	)
				processes[p].pos = pos+bytesread
				
				data = build_output({'out':buffer.toString()}, p)
				data['work_time'] = diff
				data['pos'] = pos
		
				send_list.push({'page_name':p,'data':data})
			}
	//	}	
		
	}
	catch(e){
		console.log(processes[p]);
		console.log(results)
		console.log(e)
	}
	
}

last_stuff = {}
function build_output(data, page){
	
	
	//outputdata = ""
	outputdata = []
	boots = data['out']
	
	imlist = {}
	
	foots = boots.split("\n")
	flotz = false
	for (var i=0; i<foots.length; i++)
	{
		if(i==foots.length-1 && foots[i]=='') continue;
			
		if (foots[i].search("##_holder_##")>-1) 
		{
			outputdata[outputdata.length] = "<img src='"+foots[i].replace("##_holder_##:","")+"'><br>"
		}
		else if (foots[i].search("##_dynamic_##")>-1) 
		{
			things = foots[i].split(":")
			holder = things[1]
			timed = things[2]
			imloc = things[3]
			swap = outputdata.length;
			for (var o = 0; o < outputdata.length; o++)
			{
				if (outputdata[o].search(holder)>-1) 
				{ 
					swap = o;
					imlist[holder] = imloc
				}
			}
			
			
			outputdata[swap] = "<img id='"+holder+"' src='"+imloc+"'><br>"
		}
		else if (foots[i].search("##__json__##")==0)
		{ 
			flotz = true
			if (outputdata.search(flot_structure) == -1) outputdata = flot_structure + outputdata
			foo = foots[i].replace("##__json__##","")
			foo = JSON.parse(foo)
			s = []
			for (i in foo)
			{
				s[s.length] = foo[i]
			}
		}
		
		
		else 
		{
			outputdata[outputdata.length] = foots[i] + "<br>"
			
		}
		
	}

	
	if(data['stdout']){
		boots = data['stdout']
		if (boots == null) boots = ""
		boots = boots.replace(/\n/g,"<br>")
		outputdata[outputdata.length] = "<br><span style='color:blue'>"+boots+"</span>"
	}
	//Build python stderr
	if(data['outerr']){
		boots = data['outerr']
		if (boots == null) boots = ""
		boots = boots.replace(/\n/g,"<br>")
		outputdata[outputdata.length] = "<br><span style='color:red'>"+boots+"</span>"
	}		
	
	//console.log(thislen)
	this_stuff = outputdata.join("")
	to_send = {out:''}
	if (this_stuff != last_stuff[page])
	{
		

		last_stuff[page] = this_stuff
		to_send['out'] = this_stuff
		
		
	}
	if (flotz){if (s.length > 0) to_send['flotter']=s } 
	
	return to_send
}
