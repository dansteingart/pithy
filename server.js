
/**
 * @type {any}
 */
const WebSocket = require('ws')
const http = require('http')
const wss = new WebSocket.Server({ noServer: true })
const utils = require('./libs/utils.js');
const setupWSConnection = utils.setupWSConnection
var express = require('express');
const basicAuth = require('express-basic-auth')
var bodyParser = require('body-parser')
var fs = require('fs')
const app = express();
const host = process.env.HOST || '0.0.0.0'
const port = process.env.PORT || 1234
var Y = require("yjs");
const { spawn } = require('child_process');
var glob = require("glob")

const server = http.createServer(app)


function authentication(req, res, next) {
  users = JSON.parse(fs.readFileSync("assets/pass.json").toString())
  var authheader = req.headers.authorization;
  if (!authheader) {
      var err = new Error('You are not authenticated!');
      res.setHeader('WWW-Authenticate', 'Basic');
      err.status = 401;
      return next(err)
  }
  var auth = new Buffer.from(authheader.split(' ')[1],'base64').toString().split(':');
  var user = auth[0];
  var pass = auth[1];
  //if (user == 'admin' && pass == 'password') {next();} 
  if(users.hasOwnProperty(user) && users[user]==pass){next();}

  else {
      var err = new Error('You are not authenticated!');
      res.setHeader('WWW-Authenticate', 'Basic');
      err.status = 401;
      return next(err);
  }

}

//folders
codebase = "code/"
histbase = "code_stamped/"
tempbase = "temp_results/"
resbase = "results/"
imgbase = "images/"
filebase = "files/"
assetbase = "assets/"

dirs = [tempbase,codebase,histbase,resbase,imgbase,filebase,assetbase]
for (d in dirs)
{
	dird = dirs[d].toString()
	try
	{ fs.mkdirSync(dird); console.log(dird+" has been made");}
	catch (e){console.log(dird+" is in place")}
}

//if first run make password file
if (!fs.existsSync("assets/pass.json")){fs.writeFileSync("assets/pass.json",`{"user":"pass"}`)}

app.use('/dist',express.static('dist'));
app.use('/static',express.static('static'));
app.use('/node_modules',express.static('node_modules'));

app.use(bodyParser.urlencoded({ extended: false }))
app.use(bodyParser.json())
app.use(authentication)

ps = {}
ts = {}
os = {}
ks = {}
tss = {}

//Helper Functions

app.post("/code_list/",(req,res)=>{

  data = req.body;
  if (data['count'] == undefined) data['count'] = 10

  files = glob.sync("code/*.py")
  
  files = files.map(function (fileName) {
      return {
        name: fileName,
        time: fs.statSync(fileName).mtime.getTime()
      };
    })
    .sort(function (a, b) {
      return b.time - a.time; })
    .map(function (v) {
      return [v.name,v.time]; });  
  
res.send({'files':files})

})

app.post("/check_status/",(req,res)=>{
  data = req.body;
  res.send(utils.getYDoc(data['code']).getText('output').toString());
 });


app.post("/check_exists/",(req,res)=>{
  data = req.body;
  codename = data['code'];
  action = "none"
  //first, see if we've got anything in memory/peristence
  foo = utils.getYDoc(codename).getText('codemirror').toString();
    if (foo.length == 0){
      console.log(`Cannot find ${codename}.py in memory, looking in code`);
      //if not, try to open up file from code and inject into codemirror 
      if (fs.existsSync(`code/${codename}.py`))
      {
        console.log(`Inserting from code/${codename}.py`);
        bits = fs.readFileSync(`code/${codename}.py`).toString();
        mem = utils.getYDoc(codename).getText('codemirror')
        mem.delete(0,mem.length);
        mem.insert(0,bits);
        action = "pulled from code"
      }
      //if nothing, send template
      else
      {
        console.log(`Doesn't seem to exist, inserting template`);
        bits = fs.readFileSync(`static/template.txt`).toString()
        mem = utils.getYDoc(codename).getText('codemirror')
        mem.delete(0,mem.length);
        mem.insert(0,bits);
        action = "inserted template"
      }
    }
    else { console.log(`Found ${codename} in memory`) }
  res.send({'action':action})
})

 
app.post("/check_running/",(req,res)=>{
  data = req.body;
  out = {'running':true}
  if (ps[data['code']]==undefined) out['running'] = false
  else if (ps[data['code']]['exitCode']!= null) out['running'] = false
  else if (ps[data['code']]['killed']) out['running'] = false

  if (out['running']) out['ps'] = ps[data['code']]
  
  res.send(out)

 });


app.post('/history/', function(req, res)
 {
   data = req.body;
   codename = data['code']
   length = "_1314970891000".length //get length of timestamp
   structure = `${histbase + codename}*`
   thing_list = []
 
   fils  = fs.readdirSync(histbase)
   for (i in fils)
   {
     if (fils[i].search(`${codename}_`) > -1)
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
     time_part = parseInt(fils[i].substr(fils[i].length - length+1))
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
 
   res.json({'history':hist_list})
 });

app.post('/get_history/',function(req,res)
{
  data = req.body;
  codename = data['code']
  histval  = data['history']
  old_code = fs.readFileSync(`${histbase+histval}`).toString();
  ycm = utils.getYDoc(codename).getText('codemirror')
  ycm.delete(0,ycm.length);
  ycm.insert(0,old_code);
  res.send({'reverted':histval})
})

app.get('/*', (req, res) => {
    if (req.params[0] == "") res.sendFile('homepage.html', { root: __dirname+"/static" })
    else res.sendFile('index.html', { root: __dirname+"/static" });
  });


app.post("/get_user/",(req,res) =>{
  foo = new Buffer.from(req.headers.authorization.split(' ')[1],'base64').toString().split(':')
  res.send({'user':foo[0]})
}
)

//Running Functions

app.post("/run/",(req,res) => {
  data = req.body
  getme = runner(data['code'])
  res.send({'state':getme});
});

function runner(codename){

  code = utils.getYDoc(codename).getText('codemirror').toString();
  try { have = fs.readFileSync("code/"+codename+".py").toString();}
  catch(e) {have = ""}
  if (code != have) {
        time = new Date().getTime().toString()
        fs.writeFileSync(`${histbase}${codename}_${time}`,code);
  }
  fs.writeFileSync("code/"+codename+".py",code)

  ks[codename] = utils.getYDoc(codename).getMap(codename+"_keys");
  ks[codename].set("running",true);
  os[codename] = utils.getYDoc(codename).getText(codename+'_output')
  os[codename].delete(0,os[codename].length);
  tss[codename] = new Date().getTime();
  ts[codename] = setInterval(function(){ks[codename].set('runtime',new Date().getTime()-tss[codename])},10);
  ps[codename] = spawn("python3",[`-u`,`code/${codename}.py`]);
  ps[codename].stdout.on('data',(d) => {os[codename].insert(os[codename].length,`${d}`)})
  ps[codename].stderr.on('data',(err) => {os[codename].insert(os[codename].length,`<div class='error'>${err}</div>`)})
  ps[codename].on('error',(err) => {os[codename].insert(os[codename].length,`<div class='error'>${err}</div>`)})
  ps[codename].on('exit',(exit_code)=> {
  ks[codename].set("running",false);
  ks[codename].set("exit_code",exit_code);
  ks[codename].set("killed",ps[codename]['killed']);
  clearInterval(ts[codename]);})

  return ps[codename]
}

 app.post("/kill/", (req,res)=>
 {
    data = req.body;
    ps[data['code']].kill();
    res.send({'state':ps[data['code']]});
 });
 
 //fire up server
wss.on('connection', setupWSConnection)
server.on('upgrade', (request, socket, head) => {
   const handleAuth = ws => { wss.emit('connection', ws, request)}
   wss.handleUpgrade(request, socket, head, handleAuth)
 })
server.listen({ host, port })
console.log(`running at '${host}' on port ${port}`)