//NodeJS Imports to Make Everything Just Work
var http = require("http"); //HTTP Server
var fs = require('fs'); // Filesystem Access (writing files)
var express = require('express'); //App Framework (similar to web.py abstraction)
var bodyParser = require('body-parser')

var app = express();
var os = require("os")
var exec = require('child_process').exec;
var cors = require('cors');
server = http.createServer(app)

const host = process.env.HOST || '0.0.0.0'
const port = process.env.PORT || 8004
const pithy_bin = process.env.PITHY_BIN || "python3"

var styler = false;

function makecmd(to_run)
{
	var py_to_run = __dirname+"/code/"+to_run+".py"
	var code = fs.readFileSync(py_to_run).toString()
	//open file and see if first line has a shebang set to run.
	var bin = pithy_bin;
	try {
	  bin = code.match(/#!.*\n/g)[0].split("!")[1].trim()
	  console.log(`running ${codename} with python overidden to ${bin}`)
	}
	catch (err) {bin = pithy_bin}
  
	if (code.search("##style")> -1) styler = true;
	else styler = false;

	if (code.search("##shower")> -1) {return bin + " -u '" + py_to_run + "' "}
	else {return bin + ` -c 'print("I am not running this unless you say so.")'`}
	//else return "echo 'I'm not running this unless you say so right'";

}


function makestyledoutput(strang)
{
	template = fs.readFileSync("static/shower.html").toString()
	return template.replace("##SWAPME##",strang)
}


// dirs = ["interfaces","interfaces_backup"]
// for (d in dirs)
// {
//         dird = dirs[d].toString()
//         console.log(dird)
//         try
//         {
//                 fs.mkdirSync(dird);
//                 console.log(dird+" has been made")
//         }
//         catch (e)
//         {
//                 console.log(dird+" is in place")
//         }


//Set Static Directories
app.use(bodyParser.urlencoded({ extended: false }))
app.use(bodyParser.json())
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
server.listen(port);
console.log(`listening at ${host} on ${port}`);