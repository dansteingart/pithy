//NodeJS Imports to Make Everything Just Work
var http = require("http"); //HTTP Server
var url = require("url"); // URL Handling
var fs = require('fs'); // Filesystem Access (writing files)
var os = require("os"); //OS lib, used here for detecting which operating system we're using
var util = require("util");
var express = require('express'); //App Framework (similar to web.py abstraction)
var app = express();
var os = require("os")
var exec = require('child_process').exec;
//var sh = require('execSync');
var cors = require('cors');
server = http.createServer(app)

//Basic Settings
settings = {
	"python_path" : "python",
	'prepend' : ""	
}


dirs = ["interfaces","interfaces_backup"]
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



//Set Static Directories
app.use(express.bodyParser());
app.use(cors());
app.use("/static", express.static(__dirname + '/static'));
app.use("/images", express.static(__dirname + '/images'));


exec("mkdir post_payload/")

app.post('/run',function(req,res)
{

	if (req.params[0] == "") 
	{
		res.send("try harder");
	}

	else
	{
		
		//here's were we do a lot of fun stuff
		try
		{
			nameo = req.url
			parts = nameo.split("/");
			estring = "";
			console.log(req.body)
			to_run = req.body['page_name']
			fn = "post_payload/"+to_run+".json"
			payload = req.body['payload']
			
			fs.writeFileSync(fn,JSON.stringify(req.body))

			
			fullcmd = settings.python_path+" -u '"+__dirname+"/code/"+to_run+".py' " + fn
			
			exec(fullcmd, {maxBuffer: 1024 * 10000},
					function(error, stdout, stderr)
					{
						res.send(stdout+stderr);
					}
				)
		}
		catch (err)
		{
			console.log(err)
		}
		
	}
});

app.post('/*',function(req,res)
{

	if (req.params[0] == "") 
	{
		res.send("try harder");
	}

	else
	{
		
		//here's were we do a lot of fun stuff
		try
		{
			nameo = req.url
			parts = nameo.split("/");
			
			estring = "";
			console.log(req.body)
			to_run = parts[1]
			payload = req.body['payload']
                        fn = "post_payload/"+to_run+".json"
			
			fs.writeFileSync(fn,JSON.stringify(req.body))
			
			fullcmd = settings.python_path+" -u '"+__dirname+"/code/"+to_run+".py' " + fn
			
			exec(fullcmd,{maxBuffer: 1024 * 10000},
					function(error, stdout, stderr)
					{
						res.send(stdout+stderr);
					}
				)
		}
		catch (err)
		{
			console.log(err)
		}
		
	}
});

app.get('/*', function(req, res)
{

	if (req.params[0] == "") 
	{
		res.send("try harder");
	}

	else
	{
		
		//here's were we do a lot of fun stuff
		try
		{
			nameo = req.url
			nameo = nameo.replace("?","/").replace(/&/g,"/")
			console.log(nameo);
			parts = nameo.split("/");
			console.log(parts)
			estring = "";
			for (var i=2; i < parts.length;i++) 
			{
				estring += parts[i]+" ";
			}
			console.log(estring)
			fullcmd = settings.python_path+" -u '"+__dirname+"/code/"+parts[1]+".py' "+estring
			exec(fullcmd,{maxBuffer: 1024 * 10000},
					function(error, stdout, stderr)
					{
						res.send(stdout);
					}
				)
		}
		catch (err)
		{
			console.log(err)
		}
		
	}
});


//Start It Up!
server.listen(process.argv[2]);
console.log('Listening on port '+process.argv[2]);

