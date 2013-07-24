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


var options = {db: {type: 'none'}};
 
server = http.createServer(app)
sharejs.attach(app, options);

io = require('socket.io')
io = io.listen(server); //Socket Creations
io.set('log level', 1)


app.use(express.basicAuth(function(user, pass, callback) {
 
	raw = fs.readFileSync("pass.json").toString();
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
dirs = ['temp_results','code','code_stamped','results','images']
for (d in dirs)
{
	try
	{
		fs.mkdirSync(dirs[d]); 
		console.log(dirs[d]+" has been made")
		
	}
	catch (e) 
	{
		console.log(dirs[d]+" is in place")
	}
}


//create pithy.py lib if it doesn't already exist
try
{
	checkface = fs.readFileSync('code/pithy.py').toString()
	console.log("pithy.py is in place")
	
}
catch (e)
{
	console.log("making a pithy library")
	fs.writeFileSync('code/pithy.py',fs.readFileSync('static/prepend.txt').toString())
}

//create pass.json file if it doesn't already exist
try
{
	checkface = fs.readFileSync('pass.json').toString()
	console.log("pass.json is in place")
	
}
catch (e)
{
	console.log("making a password file")
	fs.writeFileSync('pass.json',fs.readFileSync('static/passmold').toString())
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


app.get('/*', function(req, res){

	if (req.params[0] == "") 
	{
		res.redirect("/"+makeid());

	}

	else if(req.params[0].search("shower/") > -1 )
	{
		//console.log("fooo!")
		sindexer = fs.readFileSync('static/shower.html').toString()
		res.send(sindexer)
	}
	else
	{
		indexer = fs.readFileSync('static/index.html').toString()
		res.send(indexer)
	}
  	//console.log(req.params)
});

app.post("*/killer",function(req,res)
	{
		thispid = processes[page_name];
		x = req.body;
		if (thispid != undefined)
		{
			console.log("killing "+thispid)
			exec("kill "+thispid,function(stdout,stderr)
			{
				outer = stdout+","+stderr
				console.log(outer)
				if (outer.search("No such process") == -1)
				{
					page_name = x['page_name'].replace("/","");
					console.log(thispid)
					delete processes[page_name];
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
	//io.sockets.emit(page_name,{'out':"waiting for output"}) 
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
	
	try
	{
		temp = fs.readFileSync("code/"+full_name).toString()
	}
	catch (e)
	{
		temp = "dood"
	}

	if (temp != data || temp == "dood")
	{
		
		fs.writeFileSync("code/"+full_name,data);
		fs.writeFileSync("code_stamped/"+page_name+"_"+time,data);
	}

/*	
	data = prepend+data
	while (data.search("showme()")>-1)
	{
		data = data.replace("showme()","save_image('"+page_name+"_"+time+"')\n",1)
		counter ++;
	}
*/	
	fs.writeFileSync("code/temper.py",data)
	res.json({success:true})	
	processes[page_name] = betterexec(page_name,x)
	console.log(processes[page_name])
	timers[processes[page_name]] = true
	
});

app.post('*/history', function(req, res)
{
	x = req.body;
	page_name = x['page_name']
	length = "_1314970891000".length //get length of timestamp
	structure = "code_stamped/"+page_name+"*"
	thing_list = []

	fils  = fs.readdirSync("code_stamped")
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
		out = fs.readFileSync("code/"+page_name+".py").toString()
		
		
	}
	catch (e)
	{
		out = fs.readFileSync("code_stamped/"+page_name).toString()		
	}
	}
	catch (e)
	{
		out = "fill me up"
	}

	back_to_pith['script'] = out
	res.json(back_to_pith)
	
	try
	{
		resulters = fs.readFileSync("results/"+page_name).toString()
		resulters = JSON.parse(resulters)	
		//setTimeout(function()
		//{
		//Don't send saved results if this script is running
		if (!processes.hasOwnProperty(page_name)) send_list.push({'page_name':page_name,'data':resulters})
		//},1000);
		
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
	out = "Fill Me Up"
	page_name = x['page_name']
	try
	{
		out = fs.readFileSync("results/"+page_name).toString()		
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
	fs.writeFileSync("code/"+full_name,data);
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
	console.log(parts)
	console.log(estring)
	fullcmd = "touch temp_results/"+parts[1] +"; " +settings.python_path+" -u '"+__dirname+"/code/"+nameo+".py' "+estring+" > 'temp_results/"+nameo+"'"
	
	start_time = new Date().getTime()
	lastcheck[nameo] = start_time
	times[nameo] = start_time
	chill = exec(fullcmd,
	function (error, stdout, stderr) {
		this_pid = chill.pid
		console.log("this pid is " +this_pid)
		hacky_name = nameo
		timers[processes[hacky_name]] = false
		console.log(hacky_name+" is done")
		end_time = new Date().getTime()
		delete processes[hacky_name];
		delete times[hacky_name];		
		//fils = fs.readdirSync("images")
		exec_time = end_time - start_time;
		foost = fs.readFileSync('temp_results/'+nameo).toString()
		big_out = {'out':stdout+foost,'outerr':stderr,'images':[],'exec_time':exec_time}
		send_list.push({'page_name':hacky_name,'data':big_out})
		if (stderr.search("Terminated") == -1) fs.writeFileSync("results/"+hacky_name,JSON.stringify(big_out))
		
	})
	return chill.pid + os_offset
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
setInterval(function(){
	this_send = send_list.splice(0,1)[0]
	if (this_send != undefined) 
	{
		
		//console.log(send_list.length + " message(s) in queue")
		io.sockets.emit(this_send['page_name'],this_send['data'])
	};
},200)




//Process Checker
setInterval(function() {
	for (p in processes)
	{
		bettertop(p)
	
	}
}, 100);


//flush images
setInterval(function() {
	
	chill = exec("rm images/*",
		function (error, stdout, stderr) 
		{
			console.log(stdout)
			console.log("flushed imamges")
		})
	}, 600000);
	

lastcheck = {}

function bettertop(p)
{
	try{
		//outer = execSync.stdout("top -b -n 1 -p "+processes[p]);
		now = new Date().getTime()
		diff = now - times[p]
		filemtime = new Date(fs.statSync('temp_results/'+p)['mtime']).getTime()
		diff2 = filemtime - lastcheck[p]
		//if ((diff2) > 100)
		//{
			lastcheck[p] = now
			outer = fs.readFileSync('temp_results/'+p).toString() + "<br><i>been working for " + diff + " ms</i>" 
			send_list.push({'page_name':p,'data':{out:outer}})
	//	}	
		
	}
	catch(e){
		console.log(processes[p]);
		console.log(results)
		console.log(e)
	}
	
}
