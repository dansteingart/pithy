var url = require("url"); // URL Handling
var fs = require('fs'); // Filesystem Access (writing files)
var os = require("os"); //OS lib, used here for detecting which operating system we're using
var util = require("util");
var express = require('express'); //App Framework (similar to web.py abstraction)
var app = express();
var exec = require('child_process').exec,
    child;

var glob


var sharejs = require('share').server;
var options = {db: {type: 'none'}}; 

sharejs.attach(app, options);


//Make Dirs if they don't exist
fs.mkdir("code")
fs.mkdir("code_stamped")
fs.mkdir("images")


app.use(express.bodyParser());
app.use("/static", express.static(__dirname + '/static'));
app.use("/images", express.static(__dirname + '/images'));

//cribbed from http://stackoverflow.com/a/1349426/565514
function makeid()
{
    var text = "";
    var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

    for( var i=0; i < 5; i++ )
        text += possible.charAt(Math.floor(Math.random() * possible.length));

    return text;
}


settings = 
{
	//"bad_words" : ["rm ","write","while True:","open "],
	"python_path" : "python",
	'prepend' : fs.readFileSync('static/prepend.txt').toString()
	
}

app.get('/*', function(req, res){
	indexer = fs.readFileSync('static/index.html').toString()
	if (req.params[0] == "") 
	{
		res.redirect("/"+makeid());
	}
	else
	{
		res.send(indexer)
	}
  	//console.log(req.params)
});

app.post('*/run', function(req, res)
{
	//console.log(req.body)
	x = req.body
	page_name = x['page_name']
	script_name = x['script_name']
	prepend = settings.prepend		
	out = ""
	image_list = []
	
	time = new Date().getTime().toString()
	counter = 0
	data = x['value']

	for (b in settings.bad_words)
	{
		if (data.search(b) > -1)
		{
			//console.log(b)
			//console.log(settings.bad_words)	
			out = "Found '"+b+"', this is a BAD WORD"
			res.json({'out':out,'images':image_list})
			break
		}
	}
	temp =""

	full_name = page_name
	
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
		
		fs.writeFileSync("code/"+page_name,data);
		fs.writeFileSync("code_stamped/"+page_name+"_"+time,data);
	}
	
	data = prepend+data
	
	while (data.search("showme()")>-1)
	{
		data = data.replace("showme()","save_image('"+page_name+"_"+time+"')\n",1)
		counter ++;
	}
	
	fs.writeFileSync("code/temper.py",data)
	
	fullcmd = settings.python_path+" '"+__dirname+"/code/temper.py' "
	
	start_time = new Date().getTime()
	
	child = exec(fullcmd,
	  function (error, stdout, stderr) {

		end_time = new Date().getTime()
		
		fils = fs.readdirSync("images")
		for (i in fils)
		{
			if (fils[i].search(page_name+"_"+time) > -1) image_list.push("images/"+fils[i])
		}
		exec_time = end_time - start_time;
		res.json({'out':stdout,'outerr':stderr,'images':image_list,'exec_time':exec_time})
		
	});
	
	
});

app.post('*/history', function(req, res)
{
	x = req.body;
	page_name = x['page_name'].replace("/","")
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
		time_part = parseInt(fils[i].split("_")[1])
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
	page_name = x['page_name']
	try{
	try
	{
		out = fs.readFileSync("code/"+page_name).toString()		
	}
	catch (e)
	{
		out = fs.readFileSync("code_stamped/"+page_name.split("/")[2]).toString()		
	}
	}
	catch (e)
	{
		out = "fill me up"
	}

	back_to_pith['script'] = out
	res.json(back_to_pith)
	
});


app.listen(process.argv[2]);
console.log('Listening on port '+process.argv[2]);

