
/**
 * @type {any}
 */
const WebSocket = require('ws')
const http = require('http')
const wss = new WebSocket.Server({ noServer: true })
const utils = require('./libs/utils.js');
const setupWSConnection = utils.setupWSConnection
const express = require('express');
const fs = require('fs')
const crypto = require('crypto')
const app = express();
const host = process.env.HOST || '0.0.0.0'
const port = process.env.PORT || 1234
const sk = process.env.OPENWEBUIAPI_KEY || undefined
const openwebuiserver = process.env.OPENWEBUISERVER || undefined

const pithy_bin = process.env.PITHY_BIN || "python3"
const pithy_timeout = process.env.PITHY_TIMEOUT || 0
const Y = require("yjs");
const { spawn } = require('child_process');
const server = http.createServer(app)
const sqlite3 = require("sqlite3").verbose()

const db  = new sqlite3.Database("runs.db")
const cdb = new sqlite3.Database("code.db")



cdb.serialize(() => {
  cdb.run(`CREATE TABLE IF NOT EXISTS code (
      name TEXT PRIMARY KEY,
      code TEXT,
      time integer);`);

  cdb.run(`CREATE TABLE IF NOT EXISTS history (
    time INTEGER PRIMARY KEY,
    name TEXT,
    code TEXT);`);

  cdb.run(`CREATE INDEX IF NOT EXISTS idx_hist_name ON history (name);`);
});

db.run(`CREATE TABLE IF NOT EXISTS runs(id INTEGER PRIMARY KEY,
                          code TEXT NOT NULL,
                          user TEXT NOT NULL,
                          run_time INTEGER,
                          exit_code INTEGER,
                          exit_type TEXT)`)




function steaksauce(ask)
{
  console.log(sk)
  const url = `${openwebuiserver}/api/chat/completions`;
  const headers = {
      'Authorization': `Bearer ${sk}`,
      'Content-Type': 'application/json'
  };
  const data = {
      model: "gpt-4o-mini",
      messages: [
          {
              role: "user",
              content: `(only return python code and commented lines as this is going directly into a code editor, do not escape with a markdown code block) ${ask}`
          }
      ]
  };

  return fetch(url, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(data)
  })
  .then(response => response.json())
  .then(foo => {
      let clean = foo.choices[0].message.content;
      clean = clean.replace(/plt\.show\(\)/g,"showme()")
      return clean;
  })
  .catch(err => {
      console.error("Error:", err);
      throw err;
  });
}




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


function getPassData() {
  return JSON.parse(fs.readFileSync("assets/pass.json").toString())
}

// Resolve auth header to username, or null if invalid
function resolveAuth(req) {
  const authheader = req.headers.authorization;
  if (!authheader) return null;
  const passData = getPassData();

  // Bearer token (API key)
  if (authheader.startsWith('Bearer ')) {
    const token = authheader.slice(7);
    const apiKeys = passData._api_keys || {};
    if (apiKeys[token]) return apiKeys[token] + "_bot";
    return null;
  }

  // Basic auth
  if (authheader.startsWith('Basic ')) {
    const auth = Buffer.from(authheader.split(' ')[1],'base64').toString().split(':');
    const user = auth[0];
    const pass = auth[1];
    if (passData.hasOwnProperty(user) && passData[user] == pass) return user;
  }

  return null;
}

function authentication(req, res, next) {
  const user = resolveAuth(req);
  if (user) {
    req.authUser = user;
    next();
  } else {
    const err = new Error('You are not authenticated!');
    res.setHeader('WWW-Authenticate', 'Basic');
    err.status = 401;
    return next(err);
  }
}

//folders
const codebase = "code/"
const histbase = "code_stamped/"
const tempbase = "temp_results/"
const resbase = "results/"
const imgbase = "images/"
const filebase = "files/"
const assetbase = "assets/"

const dirs = [tempbase,codebase,histbase,resbase,imgbase,filebase,assetbase]
for (const d in dirs)
{
	const dird = dirs[d].toString()
	try
	{ fs.mkdirSync(dird); DEBUG.log(dird+" has been made");}
	catch (e){DEBUG.log(dird+" is in place")}
}

DEBUG.log(`timeout set to ${pithy_timeout}`)
DEBUG.log(`python set to ${pithy_bin}`)

//if first run make password file
if (!fs.existsSync("assets/pass.json")){fs.writeFileSync("assets/pass.json",`{"user":"pass"}`)}

//if first run make password file
const basics = ["pithy3.py","python3_basics.py"]
for (i in basics)
{
  if (!fs.existsSync(`code/${basics[i]}`)){fs.copyFileSync(`static/examples/${basics[i]}`,`code/${basics[i]}`)}
}

app.use('/dist',express.static('dist'));
app.use('/static',express.static('static'));
app.use('/images',express.static('images'));
app.use('/node_modules',express.static('node_modules'));

app.use(express.urlencoded({ extended: false }))
app.use(express.json())
app.use(authentication)

const ps = {}
const ts = {}
const os = {}
const ks = {}
const tss = {}

//Helper Functions

app.post("/code_list/",(req,res)=>{

  const data = req.body;

  let files = fs.readdirSync("code")
    .filter(f => f.endsWith(".py"))
    .map(f => {
      const fullPath = "code/" + f;
      return [fullPath, fs.statSync(fullPath).mtime.getTime()];
    });

if (data['count'] != undefined) files = files.slice(0,data['count']);

res.send({'files':files})

})

// DataTables server-side processing endpoint
app.post("/code_list_dt/",(req,res)=>{
  const data = req.body;
  const draw = parseInt(data.draw) || 1;
  const start = parseInt(data.start) || 0;
  const length = parseInt(data.length) || 100;
  const searchVal = (data.search && data.search.value) ? data.search.value.toLowerCase() : "";

  // column sort: 0=name, 1=date
  let sortCol = 1;
  let sortDir = "desc";
  if (data.order && data.order[0]) {
    sortCol = parseInt(data.order[0].column) || 1;
    sortDir = data.order[0].dir === "asc" ? "asc" : "desc";
  }

  let files = fs.readdirSync("code")
    .filter(f => f.endsWith(".py"))
    .map(f => {
      const core = f.replace(".py","");
      const mtime = fs.statSync("code/" + f).mtime.getTime();
      return [core, mtime];
    });

  const recordsTotal = files.length;

  // filter by search
  if (searchVal) {
    files = files.filter(f => f[0].toLowerCase().includes(searchVal));
  }
  const recordsFiltered = files.length;

  // sort
  const dir = sortDir === "asc" ? 1 : -1;
  files.sort((a,b) => (a[sortCol] > b[sortCol] ? dir : a[sortCol] < b[sortCol] ? -dir : 0));

  // paginate
  const page = files.slice(start, start + length);

  // format for DataTables: each row is an array of display values
  const tableData = page.map(f => {
    const link = `<a attr='code' href="${f[0]}">${f[0]}</a>`;
    const ts = new Date(f[1]).toISOString().slice(0,19).replace('T',' ');
    return [link, ts];
  });

  res.json({
    draw: draw,
    recordsTotal: recordsTotal,
    recordsFiltered: recordsFiltered,
    data: tableData
  });
})

app.post("/check_status/",(req,res)=>{
  data = req.body;
  res.send(utils.getYDoc(data['code']).getText('output').toString());
 });


app.post("/check_exists/",(req,res)=>{
  const data = req.body;
  const codename = data['code'];
  let action = "none"
  //first, see if we've got anything in memory/peristence
  const foo = utils.getYDoc(codename).getText('codemirror').toString();
    if (foo.length == 0){
      DEBUG.log(`cannot find ${codename}.py in persistence, looking in code`);
      //if not, try to open up file from code and inject into codemirror
      if (fs.existsSync(`code/${codename}.py`))
      {
        DEBUG.log(`inserting from code/${codename}.py`);
        const bits = fs.readFileSync(`code/${codename}.py`).toString();
        const mem = utils.getYDoc(codename).getText('codemirror')
        mem.delete(0,mem.length);
        mem.insert(0,bits);
        action = "pulled from code"
      }
      //if nothing, send template
      else
      {
        DEBUG.log(`doesn't seem to exist, inserting template`);
        const bits = fs.readFileSync(`static/template.txt`).toString()
        const mem = utils.getYDoc(codename).getText('codemirror')
        mem.delete(0,mem.length);
        mem.insert(0,bits);
        action = "inserted template"
      }
    }
    else { DEBUG.log(`found ${codename} in persistence`) }
  res.send({'action':action})
})

 
app.post("/check_running/",(req,res)=>{
  const data = req.body;
  const out = {'running':true}
  if (ps[data['code']]==undefined) out['running'] = false
  else if (ps[data['code']]['exitCode']!= null) out['running'] = false
  else if (ps[data['code']]['killed']) out['running'] = false

  if (out['running']) out['ps'] = ps[data['code']]
  if (out['running']==false) clearInterval(ts[data['code']])


  res.send(out)

 });

 app.post("/steaksauce/",(req,res)=>
  {
    const data = req.body;
    const ask = data['ask']
    steaksauce(ask).then((code)=>
    {
      res.send({'code':code})
    })
  })


app.post('/history/', function(req, res)
 {
   const data = req.body;
   const codename = data['code']

   cdb.all(`SELECT time FROM history WHERE name = ? ORDER BY time DESC`, [codename], (err, rows) => {
     if (err) { res.json({'history':[]}); return; }
     const hist_list = rows.map(r => [r.time, new Date(r.time).toISOString()])
     res.json({'history':hist_list})
   });
 });

app.post('/get_history/',function(req,res)
{
  const data = req.body;
  const codename = data['code']
  const histval  = data['history']

  cdb.get(`SELECT code FROM history WHERE time = ? AND name = ?`, [histval, codename], (err, row) => {
    if (row) {
      const ycm = utils.getYDoc(codename).getText('codemirror')
      ycm.delete(0,ycm.length);
      ycm.insert(0,row.code);
      res.send({'reverted':histval})
    } else {
      // fallback for old filesystem-based history
      try {
        let old_code = fs.readFileSync(`${histbase}${codename}_${histval}`).toString();
        try {old_code = JSON.parse(old_code)['code']} catch {}
        const ycm = utils.getYDoc(codename).getText('codemirror')
        ycm.delete(0,ycm.length);
        ycm.insert(0,old_code);
        res.send({'reverted':histval})
      } catch {
        res.status(404).send({'error':'history not found'})
      }
    }
  });
})

// ============================================================
// API Key management
// ============================================================

// Generate (or regenerate) an API key for the authenticated user
app.post('/api/generate_key', (req, res) => {
  const user = req.authUser;
  const passData = getPassData();
  if (!passData._api_keys) passData._api_keys = {};

  // Remove any existing key for this user
  for (const [key, val] of Object.entries(passData._api_keys)) {
    if (val === user) delete passData._api_keys[key];
  }

  // Generate new key
  const apiKey = "pk_" + crypto.randomBytes(24).toString('hex');
  passData._api_keys[apiKey] = user;
  fs.writeFileSync("assets/pass.json", JSON.stringify(passData, null, 2));

  res.json({ user: user, api_key: apiKey });
});

// List API key for current user (shows masked key)
app.get('/api/key', (req, res) => {
  const user = req.authUser;
  const passData = getPassData();
  const apiKeys = passData._api_keys || {};
  for (const [key, val] of Object.entries(apiKeys)) {
    if (val === user) {
      return res.json({ user: user, api_key: key.slice(0,7) + "..." + key.slice(-4) });
    }
  }
  res.json({ user: user, api_key: null });
});

// ============================================================
// Agent/AI API — interact with code, output, and history
// ============================================================

// Agent onboarding — returns instructions for an AI to learn the API
app.get('/api/agent', (req, res) => {
  const baseUrl = `${req.protocol}://${req.headers.host}`;
  res.json({
    name: "Pithy",
    description: "A collaborative, real-time Python code editor. You are a co-user — your edits appear live in the browser for human collaborators. Use this API to read, write, run, and debug Python code together.",
    auth: {
      type: "Bearer (API key) or Basic",
      note: "All endpoints require auth. Use 'Authorization: Bearer <api_key>' (preferred for agents) or HTTP Basic Auth. Generate an API key via POST /api/generate_key with Basic auth."
    },
    workflow: {
      summary: "Read → Edit → Run → Check Output → Iterate",
      steps: [
        "1. GET /api/codes to see available files",
        "2. GET /api/:name/code to read the current code (ALWAYS read before writing — the human may have edited)",
        "3. PUT /api/:name/code to replace code, or PATCH to make surgical edits",
        "4. POST /api/:name/run to execute",
        "5. GET /api/:name/status to check if it finished (poll until running=false)",
        "6. GET /api/:name/output to read results",
        "7. If errors, go back to step 2 and fix"
      ],
      important: [
        "Your writes go through a real-time CRDT — the human sees changes instantly in their editor.",
        "ALWAYS read before writing. Never overwrite the human's live edits with stale code.",
        "The output pane renders HTML. Plots from matplotlib are base64-encoded images.",
        "Any .py file can import any other .py file by name (e.g. 'from pithy3 import *')."
      ]
    },
    libraries: {
      pithy3: {
        import: "from pithy3 import *",
        provides: [
          "numpy (as np and star-imported: array, linspace, sin, cos, etc.)",
          "matplotlib/pylab (plot, figure, title, xlabel, ylabel, legend, grid, clf, etc.)",
          "showme() — renders the current matplotlib figure to the output pane. Call after building a plot.",
          "showimg(pil_image) — renders a PIL image to the output pane.",
          "smooth(array, window_len=11) — moving average smoothing.",
          "go(cmd) — runs a shell command and returns output (subprocess.getoutput).",
          "glob(pattern) — file globbing."
        ],
        example: [
          "from pithy3 import *",
          "x = linspace(0, 10, 100)",
          "plot(x, sin(x), label='sin')",
          "legend(); grid(True)",
          "showme()  # REQUIRED to display"
        ]
      },
      note: "Any .py file in the code/ directory can be imported by name. Use GET /api/codes to discover them."
    },
    endpoints: [
      {
        method: "GET",
        path: "/api/agent",
        description: "This endpoint. Returns API documentation for AI agents."
      },
      {
        method: "GET",
        path: "/api/codes",
        description: "List all code files with modification times.",
        response: "{ codes: [{ name, modified }] }"
      },
      {
        method: "GET",
        path: "/api/:name/code",
        description: "Read the current live code from the editor. This is the real-time CRDT state, not the file on disk.",
        response: "{ name, code, length }"
      },
      {
        method: "PUT",
        path: "/api/:name/code",
        description: "Replace the entire code. Appears instantly in the human's editor.",
        body: "{ code: \"...\" }",
        response: "{ name, length }"
      },
      {
        method: "PATCH",
        path: "/api/:name/code",
        description: "Surgical code edits. Supports find/replace or positional insert/delete.",
        variants: [
          { body: "{ find: \"old text\", replace: \"new text\" }", note: "Find first occurrence and replace" },
          { body: "{ position: 0, insert: \"# header\\n\" }", note: "Insert text at position" },
          { body: "{ position: 10, delete: 5 }", note: "Delete 5 chars starting at position 10" },
          { body: "{ position: 10, delete: 3, insert: \"new\" }", note: "Replace 3 chars at position 10" }
        ]
      },
      {
        method: "POST",
        path: "/api/:name/run",
        description: "Execute the code. Returns immediately — use /status or /output/stream to track progress.",
        response: "{ name, status: 'started' }"
      },
      {
        method: "POST",
        path: "/api/:name/kill",
        description: "Kill a running process.",
        response: "{ name, status: 'killed' }"
      },
      {
        method: "GET",
        path: "/api/:name/status",
        description: "Check execution state. Poll this after /run until running=false.",
        response: "{ name, running, runtime, exit_code, killed }"
      },
      {
        method: "GET",
        path: "/api/:name/output",
        description: "Read the current output. May contain HTML (plots are <img> tags with base64 src).",
        response: "{ name, output }"
      },
      {
        method: "GET",
        path: "/api/:name/output/stream",
        description: "Server-Sent Events stream. Pushes real-time output deltas and status changes as they happen. Best for watching long-running code.",
        events: [
          "{ type: 'snapshot', output: '...' } — full output on connect",
          "{ type: 'delta', output: '...' } — updated output",
          "{ type: 'status', running, runtime, exit_code } — execution state change"
        ]
      },
      {
        method: "GET",
        path: "/api/:name/history",
        description: "List saved code history. History is saved each time code runs.",
        query: "?limit=50",
        response: "{ name, history: [{ time, date }] }"
      },
      {
        method: "GET",
        path: "/api/:name/history/:time",
        description: "Get a specific history snapshot by timestamp.",
        response: "{ name, time, date, code }"
      },
      {
        method: "POST",
        path: "/api/:name/history/:time/revert",
        description: "Revert the live editor to a history snapshot. The human will see the change instantly.",
        response: "{ name, reverted_to }"
      }
    ],
    tips: [
      "Use PATCH with find/replace for small edits — it's less disruptive than replacing the whole file.",
      "If exit_code is 124, the code hit the timeout limit.",
      "Set a custom timeout in code with: ##pithytimeout=30 (seconds).",
      "Set a custom python binary with a shebang: #!/usr/bin/python3.11",
      "clf() clears the matplotlib figure between plots.",
      "showme() must be called to render each plot. Multiple calls = multiple images in output.",
      "The output pane renders HTML, so you can print('<b>bold</b>') and it will render.",
      "Errors appear wrapped in <div class='error'>...</div> in the output."
    ],
    quickstart: {
      description: "Copy-paste example: create a file, write code, run it, get output",
      example_curl: [
        `curl -u user:pass ${baseUrl}/api/agent`,
        `curl -u user:pass ${baseUrl}/api/codes`,
        `curl -u user:pass ${baseUrl}/api/myfile/code`,
        `curl -u user:pass -X PUT -H 'Content-Type: application/json' -d '{"code":"from pithy3 import *\\nplot([1,2,3],[1,4,9])\\nshowme()"}' ${baseUrl}/api/myfile/code`,
        `curl -u user:pass -X POST ${baseUrl}/api/myfile/run`,
        `curl -u user:pass ${baseUrl}/api/myfile/status`,
        `curl -u user:pass ${baseUrl}/api/myfile/output`
      ]
    }
  });
});

// List all code files
app.get('/api/codes', (req, res) => {
  const files = fs.readdirSync("code")
    .filter(f => f.endsWith(".py"))
    .map(f => {
      const st = fs.statSync("code/" + f);
      return { name: f.replace(".py",""), modified: st.mtime.getTime() };
    });
  files.sort((a,b) => b.modified - a.modified);
  res.json({ codes: files });
});

// Read current code (live from Yjs doc)
app.get('/api/:codename/code', (req, res) => {
  const codename = req.params.codename;
  const code = utils.getYDoc(codename).getText('codemirror').toString();
  res.json({ name: codename, code: code, length: code.length });
});

// Write/replace entire code (appears in real-time to connected editors)
app.put('/api/:codename/code', (req, res) => {
  const codename = req.params.codename;
  const newCode = req.body.code;
  if (typeof newCode !== 'string') return res.status(400).json({ error: 'code field required' });
  const ycm = utils.getYDoc(codename).getText('codemirror');
  ycm.delete(0, ycm.length);
  ycm.insert(0, newCode);
  res.json({ name: codename, length: newCode.length });
});

// Patch code — insert, delete, or replace at position
app.patch('/api/:codename/code', (req, res) => {
  const codename = req.params.codename;
  const ycm = utils.getYDoc(codename).getText('codemirror');
  const { insert, delete: del, position, find, replace } = req.body;

  // find and replace
  if (typeof find === 'string' && typeof replace === 'string') {
    const current = ycm.toString();
    const idx = current.indexOf(find);
    if (idx === -1) return res.status(404).json({ error: 'find string not found' });
    ycm.delete(idx, find.length);
    ycm.insert(idx, replace);
    return res.json({ position: idx, deleted: find.length, inserted: replace.length });
  }

  // positional insert/delete
  const pos = typeof position === 'number' ? position : ycm.length;
  if (typeof del === 'number' && del > 0) ycm.delete(pos, del);
  if (typeof insert === 'string') ycm.insert(pos, insert);
  res.json({ position: pos, length: ycm.length });
});

// Read current output
app.get('/api/:codename/output', (req, res) => {
  const codename = req.params.codename;
  const output = utils.getYDoc(codename).getText(codename + '_output').toString();
  res.json({ name: codename, output: output });
});

// Stream output via Server-Sent Events (real-time)
app.get('/api/:codename/output/stream', (req, res) => {
  const codename = req.params.codename;
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive'
  });

  const yO = utils.getYDoc(codename).getText(codename + '_output');
  // send current output first
  res.write(`data: ${JSON.stringify({ type: 'snapshot', output: yO.toString() })}\n\n`);

  const observer = (event) => {
    res.write(`data: ${JSON.stringify({ type: 'delta', output: yO.toString() })}\n\n`);
  };
  yO.observe(observer);

  const ykeys = utils.getYDoc(codename).getMap(codename + '_keys');
  const keysObserver = (event) => {
    const state = {
      type: 'status',
      running: ykeys.get('running') || false,
      runtime: ykeys.get('runtime') || 0,
      exit_code: ykeys.get('exit_code')
    };
    res.write(`data: ${JSON.stringify(state)}\n\n`);
  };
  ykeys.observe(keysObserver);

  req.on('close', () => {
    yO.unobserve(observer);
    ykeys.unobserve(keysObserver);
  });
});

// Check run status
app.get('/api/:codename/status', (req, res) => {
  const codename = req.params.codename;
  const ykeys = utils.getYDoc(codename).getMap(codename + '_keys');
  res.json({
    name: codename,
    running: ykeys.get('running') || false,
    runtime: ykeys.get('runtime') || 0,
    exit_code: ykeys.get('exit_code'),
    killed: ykeys.get('killed') || false
  });
});

// Run code
app.post('/api/:codename/run', (req, res) => {
  const codename = req.params.codename;
  const user = req.authUser;
  runner(codename, user);
  res.json({ name: codename, status: 'started' });
});

// Kill running code
app.post('/api/:codename/kill', (req, res) => {
  const codename = req.params.codename;
  if (ps[codename]) {
    ps[codename].kill();
    res.json({ name: codename, status: 'killed' });
  } else {
    res.status(404).json({ name: codename, error: 'not running' });
  }
});

// List history
app.get('/api/:codename/history', (req, res) => {
  const codename = req.params.codename;
  const limit = parseInt(req.query.limit) || 50;
  cdb.all(`SELECT time, name FROM history WHERE name = ? ORDER BY time DESC LIMIT ?`, [codename, limit], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ name: codename, history: rows.map(r => ({ time: r.time, date: new Date(r.time).toISOString() })) });
  });
});

// Get a specific history entry
app.get('/api/:codename/history/:time', (req, res) => {
  const codename = req.params.codename;
  const time = parseInt(req.params.time);
  cdb.get(`SELECT time, code FROM history WHERE time = ? AND name = ?`, [time, codename], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!row) return res.status(404).json({ error: 'not found' });
    res.json({ name: codename, time: row.time, date: new Date(row.time).toISOString(), code: row.code });
  });
});

// Revert to a history entry (updates live editor)
app.post('/api/:codename/history/:time/revert', (req, res) => {
  const codename = req.params.codename;
  const time = parseInt(req.params.time);
  cdb.get(`SELECT code FROM history WHERE time = ? AND name = ?`, [time, codename], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!row) return res.status(404).json({ error: 'not found' });
    const ycm = utils.getYDoc(codename).getText('codemirror');
    ycm.delete(0, ycm.length);
    ycm.insert(0, row.code);
    res.json({ name: codename, reverted_to: time });
  });
});

// ============================================================

app.get('/*', (req, res) => {
    if (req.params[0] == "") res.sendFile('homepage.html', { root: __dirname+"/static" })
    else res.sendFile('index.html', { root: __dirname+"/static" });
  });


app.post("/get_user/",(req,res) =>{
  res.send({'user': req.authUser})
})


app.post("/copy_code/",(req,res)=>{
  const data = req.body;
  const codename = data['code']
  const copyto = data['copy_to']
  const nfn = `code/${copyto}.py`
  if (fs.existsSync(nfn)){res.send({'status':'aborted, file already exists'})}
  else
  {
    const code = utils.getYDoc(codename).getText('codemirror').toString();
    fs.writeFileSync(nfn,code)
    res.send({'status':'success','new_code':copyto})
  }
})
//Running Functions

app.post("/run/",(req,res) => {
  const data = req.body
  const user = req.authUser
  const getme = runner(data['code'],user)
  res.send({'state':getme});
});

// logger
function newrow(ti,codename,user)
{
  db.run(`INSERT INTO runs (id,code,user) VALUES (?,?,?)`, [ti, codename, user])
}

function editrow(ti,rt,ec,et)
{
  db.run(`UPDATE runs SET run_time = ?, exit_code = ?, exit_type = ? WHERE id = ?`, [rt, ec, et, ti])
}



function runner(codename,user="user"){

  const code = utils.getYDoc(codename).getText('codemirror').toString();
  let have;
  try { have = fs.readFileSync("code/"+codename+".py").toString();}
  catch(e) {have = ""}
  if (code != have) {
        const tts = new Date().getTime()
        fs.writeFileSync("code/"+codename+".py",code);
        cdb.run(`INSERT INTO history (time,name,code) VALUES (?,?,?)`, [tts, codename, code]);
  }

  //Look for timeout in code
  let to = pithy_timeout;
  let ft = ""
  try {
    to = parseInt(code.match(/##pithytimeout=[\d*].*(\r\n|\r|\n)/g)[0].split("=")[1].trim())
    ft = `with a timeout after ${to} seconds`
  }
  catch {to = pithy_timeout;}

  //Look for different python version in code
  let bin = pithy_bin;
  try {
    bin = code.match(/#!.*(\r\n|\r|\n)/g)[0].split("!")[1].trim()
  }
  catch (err) {bin = pithy_bin}

  DEBUG.log(`running ${codename} using ${bin} ${ft}`)

  ks[codename] = utils.getYDoc(codename).getMap(codename+"_keys");
  ks[codename].set("running",true);
  os[codename] = utils.getYDoc(codename).getText(codename+'_output')
  os[codename].delete(0,os[codename].length);
  tss[codename] = new Date().getTime();
  ts[codename] = setInterval(function(){ks[codename].set('runtime',new Date().getTime()-tss[codename])},10);
  ps[codename] = spawn("timeout",[to,bin,`-u`,`code/${codename}.py`]);

  newrow(tss[codename],codename,user)

  ps[codename].stdout.on('data',(d) => {os[codename].insert(os[codename].length,`${d}`)})
  ps[codename].stderr.on('data',(err) => {os[codename].insert(os[codename].length,`<div class='error'>${err}</div>`)})
  ps[codename].on('error',(err) => {os[codename].insert(os[codename].length,`<div class='error'>${err}</div>`)})
  ps[codename].on('exit',(exit_code)=> {
    ks[codename].set("running",false);
    ks[codename].set("exit_code",exit_code);
    ks[codename].set("killed",ps[codename]['killed']);
    let eco = ""
    if (ps[codename]['killed']) eco = `was killed`
    else eco = `finished with code ${exit_code}`
    const rt = new Date().getTime()-tss[codename];
    DEBUG.log(`${codename} ${eco} after ${rt} ms`)
    editrow(tss[codename],rt,exit_code,eco);
    clearInterval(ts[codename]);})
  return ps[codename]
}

 app.post("/kill/", (req,res)=>
 {
    const data = req.body;
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
DEBUG.log(`running at '${host}' on port ${port}`)
