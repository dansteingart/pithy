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

var styler = false;

function makecmd(to_run)
{
	py_to_run = __dirname+"/code/"+to_run+".py"
	pyscript = fs.readFileSync(py_to_run).toString()
	//open file and see if first line has a shebang set to run.
	try {pybin = pyscript.split("\n")[0].replace("#!","")}
	catch(err){console.log(err);pybin = "ls "}
	if (pybin.search("python") == -1) pybin = settings.python_path

	if (pyscript.search("##style")> -1) styler = true;
	else styler = false;


	if (pyscript.search("##shower")> -1) {return pybin + " -u '" + py_to_run + "' "}
	else {return pybin + " -u 'dontshow.py' "}
	//else return "echo 'I'm not running this unless you say so right'";

}


function makestyledoutput(strang)
{
	template = fs.readFileSync("static/shower.html").toString()
	return template.replace("##SWAPME##",strang)
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
			console.log("foo foo foo")
			console.log(req.body)
			fn = "post_payload/"+to_run+".json"
			payload = req.body['payload']

			fs.writeFileSync(fn,JSON.stringify(req.body))

			fullcmd = makecmd(req.body['page_name'])
			fullcmd = fullcmd + fn

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
			console.log("foo foo foo")
			to_run = parts[1]

			console.log(req.body)

			payload = req.body['payload']
     		 fn = "post_payload/"+to_run+".json"

			fs.writeFileSync(fn,JSON.stringify(req.body))

			fullcmd = makecmd(parts[1])
			fullcmd = fullcmd + fn

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

	else if (req.url == "/favicon.ico")
	{
		res.send("nothing to see here");
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
			//console.log(parts)

			estring = "";
			for (var i=2; i < parts.length;i++)
			{
				estring += parts[i]+" ";
			}
			//console.log(estring)

			fullcmd = makecmd(parts[1])
			console.log(fullcmd)

			fullcmd = fullcmd + estring

			if (fullcmd.search("python")> -1)
			{
				exec(fullcmd,{maxBuffer: 1024 * 10000},function(error, stdout, stderr){

					var out;
					if (styler) out = makestyledoutput(stdout);
					else out = stdout;
					res.send(out);

				})}
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
