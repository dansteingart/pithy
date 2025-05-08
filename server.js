/**
 * @type {any}
 */
const WebSocket = require('ws')
const http = require('http')
const wss = new WebSocket.Server({ noServer: true })
const utils = require('./utils.js');
const setupWSConnection = utils.setupWSConnection
var express = require('express');
const basicAuth = require('express-basic-auth')
var bodyParser = require('body-parser')
var fs = require('fs')
const app = express();
const host = process.env.HOST || '0.0.0.0'
const port = process.env.PORT || 1234
const sk = process.env.OPENWEBUIAPI_KEY || undefined
const openwebuiserver = process.env.OPENWEBUISERVER || undefined
const pithy_bin = process.env.PITHY_BIN || "python3"
const pithy_timeout = process.env.PITHY_TIMEOUT || 0
//var Y = require("yjs");
const { spawn } = require('child_process');
var glob = require("glob");
const { time } = require('console');
const server = http.createServer(app)
const sqlite3 = require("sqlite3").verbose()
const fetch = require('node-fetch');

db  = new sqlite3.Database("runs.db")
cdb = new sqlite3.Database("code.db")

console.log(sk)


cdb.run(`CREATE TABLE IF NOT EXISTS code (
    name TEXT PRIMARY KEY,
    code TEXT,
    time integer);`);

cdb.run(`CREATE TABLE IF NOT EXISTS history (
  time INTEGER PRIMARY KEY,
  name TEXT,
  code TEXT);`);
  

cdb.run(`CREATE INDEX IF NOT EXISTS idx_hist_name ON history (name);`);
  
db.run(`CREATE TABLE IF NOT EXISTS runs(id INTEGER PRIMARY KEY, 
                          code TEXT NOT NULL, 
                          user TEXT NOT NULL, 
                          run_time INTEGER, 
                          exit_code INTEGER, 
                          exit_type TEXT)`)




var DEBUG = (function(){
  var timestamp = function(){};
  timestamp.toString = function(){
      return "[" + (new Date).toISOString() + "]";    
  };

  return {
      log: console.log.bind(console, '%s', timestamp)
  }
})();

function writecdb(name,code)
{
  var tti = new Date().getTime();
  var sql = 'INSERT OR REPLACE INTO code (name,code,time) VALUES (?,?,?)';
  cdb.run(sql,[name,code,tti]);
}

function writecdbhist(name,code)
{
  var tti = new Date().getTime();
  var sql = 'INSERT INTO history (time,name,code) VALUES (?,?,?)';
  cdb.run(sql,[tti,name,code]);
}


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
	{ fs.mkdirSync(dird); DEBUG.log(dird+" has been made");}
	catch (e){DEBUG.log(dird+" is in place")}
}

DEBUG.log(`timeout set to ${pithy_timeout}`)
DEBUG.log(`python set to ${pithy_bin}`)

//if first run make password file
if (!fs.existsSync("assets/pass.json")){fs.writeFileSync("assets/pass.json",`{"user":"pass"}`)}

//if first run make password file
basics = ["pithy3.py","python3_basics.py"]
for (i in basics)
{
  if (!fs.existsSync(`code/${basics[i]}`)){fs.copyFileSync(`static/examples/${basics[i]}`,`code/${basics[i]}`)}
}

app.use('/dist',express.static('dist'));
app.use('/static',express.static('static'));
app.use('/images',express.static('images'));
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

  data = req;

  files = glob.sync("code/*.py")
  
  files = files.map(function (fileName) {
      return {
        name: fileName,
        time: fs.statSync(fileName).mtime.getTime()
      };
    }).map(function (v) {
      return [v.name,v.time]; });  
  

if (data['count'] != undefined) files = files.slice(0,data['count']);

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

  ks[codename] = utils.getYDoc(codename).getMap(codename+"_keys");

  //first, see if we've got anything in memory/peristence
  foo = utils.getYDoc(codename).getText('codemirror').toString();
    if (foo.length == 0){
      DEBUG.log(`cannot find ${codename}.py in persistence, looking in code`);
      //if not, try to open up file from code and inject into codemirror 
      if (fs.existsSync(`code/${codename}.py`))
      {
        DEBUG.log(`inserting from code/${codename}.py`);
        bits = fs.readFileSync(`code/${codename}.py`).toString();
        mem = utils.getYDoc(codename).getText('codemirror')
        mem.delete(0,mem.length);
        mem.insert(0,bits);
        action = "pulled from code"
      }
      //if nothing, send template
      else
      {
        DEBUG.log(`doesn't seem to exist, inserting template`);
        bits = fs.readFileSync(`static/template.txt`).toString()
        mem = utils.getYDoc(codename).getText('codemirror')
        mem.delete(0,mem.length);
        mem.insert(0,bits);
        action = "inserted template"
      }
    }
    else { DEBUG.log(`found ${codename} in persistence`) }
  res.send({'action':action})
})


app.post("/check_running/",(req,res)=>{
  data = req.body;
  out = {'running':true}
  if (ps[data['code']]==undefined) out['running'] = false
  else if (ps[data['code']]['exitCode']!= null) out['running'] = false
  else if (ps[data['code']]['killed']) out['running'] = false

  if (out['running']) out['ps'] = ps[data['code']]
  if (out['running']==false) clearInterval(ts[data['code']])


  res.send(out)

 });


app.post('/history/', function(req, res)
 {
  console.log("hist debug")
  var t1 = new Date().getTime();
  console.log(new Date().getTime() - t1);

   data = req.body;
   codename = data['code']
   length = "_1314970891000".length //get length of timestamp
   structure = `${histbase + codename}*`
   thing_list = []
 

   console.log(new Date().getTime() - t1);

   //fils  = fs.readdirSync(histbase)
   fs.promises.readdir(histbase).then( fils =>
    {
      for (i in fils)
      {
        if (fils[i].search(`${codename}_`) > -1)
        {
          thing_list.push(fils[i])
        }
      }
   console.log(new Date().getTime() - t1);

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
 

   console.log(new Date().getTime() - t1);


   res.json({'history':hist_list})
  });

 });

app.post('/get_history/',function(req,res)
{
  data = req.body;
  codename = data['code']
  histval  = data['history']
  old_code = fs.readFileSync(`${histbase+histval}`).toString();
  //new history format with sensible stuff
  try {old_code = JSON.parse(old_code)['code']}
  catch {old_code = old_code}
  ycm = utils.getYDoc(codename).getText('codemirror')
  ycm.delete(0,ycm.length);
  ycm.insert(0,old_code);
  res.send({'reverted':histval})
})



app.post("/get_user/",(req,res) =>{
  foo = new Buffer.from(req.headers.authorization.split(' ')[1],'base64').toString().split(':')
  res.send({'user':foo[0]})
}
)


app.post("/copy_code/",(req,res)=>{
  data = req.body;
  codename = data['code']
  copyto = data['copy_to']
  nfn = `code/${copyto}.py`
  if (fs.existsSync(nfn)){res.send({'status':'aborted, file already exists'})}
  else
  {
    code = utils.getYDoc(codename).getText('codemirror').toString();
    fs.writeFileSync(nfn,code)
    //writecdb(nfn,code);
    res.send({'status':'success','new_code':copyto})
  }
})
//Running Functions

app.post("/run/",(req,res) => {
  data = req.body
  user = new Buffer.from(req.headers.authorization.split(' ')[1],'base64').toString().split(':')[0]
  getme = runner(data['code'],user)
  res.send({'state':getme});
});

// logger
function newrow(ti,codename,user)
{
  db.run(`INSERT INTO runs (id,code,user)
          VALUES (${ti},'${codename}','${user}')`)
}

function editrow(ti,rt,ec,et)
{
      db.run(`UPDATE runs
              SET run_time = ${rt},
                  exit_code = ${ec},
                  exit_type = '${et}'
              WHERE
                  id =  ${ti}`)
}



function runner(codename,user="user"){

  code = utils.getYDoc(codename).getText('codemirror').toString();
  try { have = fs.readFileSync("code/"+codename+".py").toString();}
  catch(e) {have = ""}
  if (code != have) {
        tts = new Date().getTime().toString()
        fs.writeFileSync("code/"+codename+".py",code);
       //writecdb(codename+".py",code);
        out = {}
        out['code'] = code;
        out['user'] = user;
        out['time'] = tts;
        fs.writeFileSync(`${histbase}${codename}_${tts}`,JSON.stringify(out));
        //writecdbhist(codename+".py",JSON.stringify(out));


  }
  
  //Look for timeout in code
  var to  = pithy_timeout;
  var ft = ""
  try {
    to = parseInt(code.match(/##pithytimeout=[\d*].*(\r\n|\r|\n)/g)[0].split("=")[1].trim())
    ft = `with a timeout after ${to} seconds`
  }
  catch {to = pithy_timeout;}


  //Look for different python version in code 
  var bin = pithy_bin;
  try {
    bin = code.match(/#!.*(\r\n|\r|\n)/g)[0].split("!")[1].trim()
  }
  catch (err) {bin = pithy_bin}
  
  
  DEBUG.log(`running ${codename} using ${bin} ${ft}`)

  var delay = 10;
  function updateTime()
  {
    ks[codename].set('runtime',new Date().getTime()-tss[codename])
    if (ks[codename].get('running')) setTimeout(updateTime, delay);
  }

 //ks[codename] = utils.getYDoc(codename).getMap(codename+"_keys");
  ks[codename].set("running",true);
  os[codename] = utils.getYDoc(codename).getText(codename+'_output')
  os[codename].delete(0,os[codename].length);
  tss[codename] = new Date().getTime();
  //ts[codename] = setInterval(function(){ks[codename].set('runtime',new Date().getTime()-tss[codename])},100);
  ts[codename] = setTimeout(updateTime, delay);
  ps[codename] = spawn("timeout",[to,bin,`-u`,`code/${codename}.py`]);
	
  newrow(tss[codename],codename,user)

  ps[codename].stdout.on('data',(d) => {os[codename].insert(os[codename].length,`${d}`)})
  ps[codename].stderr.on('data',(err) => {os[codename].insert(os[codename].length,`<div class='error'>${err}</div>`)})
  ps[codename].on('error',(err) => {os[codename].insert(os[codename].length,`<div class='error'>${err}</div>`)})
  ps[codename].on('exit',(exit_code)=> {
    ks[codename].set("running",false);
    ks[codename].set("exit_code",exit_code);
    ks[codename].set("killed",ps[codename]['killed']);
    var eco = ""
    if (ps[codename]['killed']) eco = `was killed`
    else eco = `finished with code ${exit_code}`
    var rt = new Date().getTime()-tss[codename];
    DEBUG.log(`${codename} ${eco} after ${rt} ms`)
    editrow(tss[codename],rt,exit_code,eco);
    //clearInterval(ts[codename]);})
    clearTimeout(ts[codename]);})
    return ps[codename]
}

 app.post("/kill/", (req,res)=>
 {
    data = req.body;
    ps[data['code']].kill();
    res.send({'state':ps[data['code']]});
 });
 


 app.post("/steaksauce/",(req,res)=>
  {
    data = req.body;
    console.log(data)
    ask = data['ask']
    page = data['page']
    position = data['position']
    steaksauce(ask,page,position).then((code)=> { res.send({'code':code}) })

  })


//all else needs that SPLAT
 app.get('/*splat', (req, res) => {

  DEBUG.log(`splat ${req.params[0]}`);
  if (req.params[0] == "") res.sendFile('homepage.html', { root: __dirname+"/static" })
  else res.sendFile('index.html', { root: __dirname+"/static" });
});

app.get('/', (req, res) => {
  res.sendFile('homepage.html', { root: __dirname+"/static" })
});



 //fire up server
wss.on('connection', setupWSConnection)
server.on('upgrade', (request, socket, head) => {
   const handleAuth = ws => { wss.emit('connection', ws, request)}
   wss.handleUpgrade(request, socket, head, handleAuth)
 })
server.listen({ host, port })
DEBUG.log(`running at '${host}' on port ${port}`)


function steaksauce(ask,page,position) {
  const url = `${openwebuiserver}/api/chat/completions`;
  const headers = {
    'Authorization': `Bearer ${sk}`,
    'Content-Type': 'application/json'
  };
  const data = {
    model: "gpt-4o-mini",
    stream: true,
    messages: [
      {
        role: "user",
        content: `(only return python code and commented lines as this is going directly into a code editor, do not escape with a markdown code block) ${ask}`
      }
    ]
  };
  food = ""
  ks[page].set("steaksauce",true);
  ks[page].set("steaksauce_pos",parseInt(position));

  total = ""
  return fetch(url, {
    method: 'POST',
    headers: headers,
    body: JSON.stringify(data)
  })
    .then(response => {
      return new Promise((resolve, reject) => {
        response.body.on('data', (chunk) => {
          // Print each chunk of the streaming JSON data
          try {
            food = JSON.parse(chunk.toString().replace("data: ","").trim())
            if (food.choices[0].delta.content != undefined)
            {
            //ks[page].set("sauceitdownyoudotoomuch",food);
            pos = ks[page].get("steaksauce_pos");
            ycm = utils.getYDoc(codename).getText('codemirror')
            ycm.insert(pos,food.choices[0].delta.content);
            ks[page].set("steaksauce_pos",pos+food.choices[0].delta.content.length);
            total += food.choices[0].delta.content          
            }
          }
          catch (e) {}
 
          
        });
        response.body.on('end', () => {
          ks[page].set("steaksauce",false);
          ks[page].set("fullsauce",total);
          resolve(total);

        });
        response.body.on('error', (err) => {
          reject(err);
        });
      });
    })
    .catch(err => {
      console.error("Error:", err);
      throw err;
    });
}
