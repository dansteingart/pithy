
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
const sk = process.env.OPENWEBUIAPI_KEY || undefined
const openwebuiserver = process.env.OPENWEBUISERVER || undefined

const pithy_bin = process.env.PITHY_BIN || "python3"
const pithy_timeout = process.env.PITHY_TIMEOUT || 0
const claude_api_key = process.env.CLAUDE_API_KEY || undefined
var Y = require("yjs");
const { spawn } = require('child_process');
var glob = require("glob");
const { time } = require('console');
const server = http.createServer(app)
const sqlite3 = require("sqlite3").verbose()

db  = new sqlite3.Database("runs.db")
cdb = new sqlite3.Database("code.db")



cdb.run(`CREATE TABLE IF NOT EXISTS code (
    name TEXT PRIMARY KEY,
    code TEXT,
    time integer);`);

cdb.run(`CREATE TABLE IF NOT EXISTS history (
  time INTEGER PRIMARY KEY,
  name TEXT,
  code TEXT);`);
  

cdb.run(`CREATE INDEX IF NOT EXISTS idx_hist_name ON history (name);`);

// Claude chat history table
cdb.run(`CREATE TABLE IF NOT EXISTS chat_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    page_name TEXT NOT NULL,
    role TEXT NOT NULL,
    content TEXT NOT NULL,
    timestamp INTEGER NOT NULL
);`);

cdb.run(`CREATE INDEX IF NOT EXISTS idx_chat_page ON chat_history (page_name);`);
  
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
      var clean = foo.choices[0].message.content;
      clean = clean.replace(/plt\.show\(\)/g,"showme()")
      return clean;
  })
  .catch(err => {
      console.error("Error:", err);
      throw err;
  });
}

function claudeChat(ask, currentCode = '', selectedModel = 'claude')
{
  console.log("Chat request:", ask, "Model:", selectedModel);
  
  // Route to different models based on selection
  if (selectedModel.startsWith('ollama:')) {
    const modelName = selectedModel.replace('ollama:', '');
    return ollamaChat(ask, currentCode, modelName);
  } else {
    // Default Claude behavior
    if (claude_api_key) {
      return claudeApiDirect(ask, currentCode);
    } else if (sk && openwebuiserver) {
      return claudeApiOpenWebUI(ask);
    } else {
      return Promise.resolve("Claude API is not configured. Please set CLAUDE_API_KEY environment variable for direct Claude API access, or set OPENWEBUIAPI_KEY and OPENWEBUISERVER for OpenWebUI integration.");
    }
  }
}

function claudeApiDirect(ask, currentCode = '', isStreaming = false)
{
  console.log("Using direct Claude API", isStreaming ? "(streaming)" : "");
  
  const url = 'https://api.anthropic.com/v1/messages';
  const headers = {
      'x-api-key': claude_api_key,
      'Content-Type': 'application/json',
      'anthropic-version': '2023-06-01'
  };
  
  const systemPrompt = `You are Claude, an AI assistant integrated into Pithy, a collaborative Python coding environment. 

Your capabilities include:
1. **Code Analysis** - Understand, explain, and debug Python code
2. **Code Modification** - Make specific changes to improve code
3. **Code Generation** - Create new code sections or complete programs

**AVAILABLE LIBRARIES IN PITHY:**
- **pithy3**: A custom library available via "from pithy3 import *" that includes:
  - showme(): Display plots (use instead of plt.show())
  - smooth(): Data smoothing function
  - imager64(): Base64 image encoding
  - showimg(), himg(): Image display utilities
  - Pre-configured matplotlib with Helvetica fonts and better defaults
  - All numpy/matplotlib functions available through pithy3

**CODING CONVENTIONS:**
- Always use "from pithy3 import *" for data visualization
- Use showme() instead of plt.show() to display plots
- Available: numpy, matplotlib (via pithy3), time, io, urllib, base64, json
- Code runs in a collaborative environment with real-time sharing

When users ask you to modify code, you can respond in two ways:
1. **EXPLANATION ONLY** - Just explain what should be changed and why
2. **DIRECT CODE EDIT** - Provide the exact code changes in a special format

For DIRECT CODE EDITS, use this format:
\`\`\`edit
<FULL_NEW_CODE_CONTENT>
\`\`\`

The edit block should contain the COMPLETE new version of the code file. This will replace the entire file content.

Current code context:
\`\`\`python
${currentCode}
\`\`\`

Be helpful, concise, and focus on improving the code quality and functionality using Pithy's available libraries.`;

  const data = {
      model: "claude-3-5-sonnet-20241022",
      max_tokens: 4000,
      messages: [
          {
              role: "user",
              content: ask
          }
      ],
      system: systemPrompt,
      stream: isStreaming
  };

  if (isStreaming) {
    // Return the fetch response directly for streaming
    return fetch(url, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(data)
    });
  } else {
    // Original non-streaming behavior
    return fetch(url, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(data)
    })
    .then(response => {
        if (!response.ok) {
            throw new Error(`Claude API error! status: ${response.status}`);
        }
        return response.json();
    })
    .then(response => {
        if (!response.content || !response.content[0] || !response.content[0].text) {
            throw new Error("Invalid response format from Claude API");
        }
        return response.content[0].text;
    })
    .catch(err => {
        console.error("Claude API error:", err);
        throw err;
    });
  }
}

function claudeApiOpenWebUI(ask)
{
  console.log("Using OpenWebUI fallback");
  
  const url = `${openwebuiserver}/api/chat/completions`;
  const headers = {
      'Authorization': `Bearer ${sk}`,
      'Content-Type': 'application/json'
  };
  const data = {
      model: "gpt-4o-mini",
      messages: [
          {
              role: "system",
              content: "You are Claude, an AI assistant integrated into a collaborative Python coding environment called Pithy. Help users understand, debug, optimize, and improve their Python code. Be concise but thorough in your explanations. When suggesting code changes, explain why they would be beneficial."
          },
          {
              role: "user",
              content: ask
          }
      ]
  };

  return fetch(url, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(data)
  })
  .then(response => {
      if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response.json();
  })
  .then(foo => {
      if (!foo.choices || !foo.choices[0] || !foo.choices[0].message) {
          throw new Error("Invalid response format from AI service");
      }
      return foo.choices[0].message.content;
  })
  .catch(err => {
      console.error("OpenWebUI error:", err);
      throw err;
  });
}

function ollamaChat(ask, currentCode = '', modelName = 'qwen2.5-coder:1.5b-base')
{
  console.log(`Using Ollama model: ${modelName}`);
  
  const systemPrompt = `You are an AI coding assistant integrated into Pithy, a collaborative Python coding environment.

**IMPORTANT: When suggesting code changes, you MUST use the edit format shown below.**

Your capabilities include:
1. **Code Analysis** - Understand, explain, and debug Python code
2. **Code Modification** - Make specific changes to improve code
3. **Code Generation** - Create new code sections or complete programs

**AVAILABLE LIBRARIES IN PITHY:**
- **pithy3**: A custom library available via "from pithy3 import *" that includes:
  - showme(): Display plots (use instead of plt.show())
  - smooth(): Data smoothing function
  - All numpy/matplotlib functions available through pithy3

**CODING CONVENTIONS:**
- Always use "from pithy3 import *" for data visualization
- Use showme() instead of plt.show() to display plots

**CRITICAL: For ANY code changes or suggestions, you MUST format them like this:**

\`\`\`edit
# Complete new code here - this will replace the entire file
from pithy3 import *

# Your improved/modified code goes here
\`\`\`

**EXAMPLES:**
- If asked to "add a plot", respond with explanation + \`\`\`edit block containing full code
- If asked to "fix this function", respond with explanation + \`\`\`edit block with corrected code
- If asked to "optimize this", respond with explanation + \`\`\`edit block with optimized code

Current code context:
\`\`\`python
${currentCode}
\`\`\`

Always provide the complete file content in the edit block, not just the changes.`;

  const data = {
      model: modelName,
      messages: [
          {
              role: "system",
              content: systemPrompt
          },
          {
              role: "user", 
              content: ask
          }
      ],
      stream: false
  };

  return fetch('http://localhost:11434/api/chat', {
      method: 'POST',
      headers: {
          'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
  })
  .then(response => {
      if (!response.ok) {
          throw new Error(`Ollama error! status: ${response.status}`);
      }
      return response.json();
  })
  .then(response => {
      if (!response.message || !response.message.content) {
          throw new Error("Invalid response format from Ollama");
      }
      return response.message.content;
  })
  .catch(err => {
      console.error("Ollama error:", err);
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

function saveChatMessage(pageName, role, content) {
  const timestamp = new Date().getTime();
  const sql = 'INSERT INTO chat_history (page_name, role, content, timestamp) VALUES (?, ?, ?, ?)';
  cdb.run(sql, [pageName, role, content, timestamp], function(err) {
    if (err) {
      console.error('Error saving chat message:', err);
    }
  });
}

function getChatHistory(pageName, callback) {
  const sql = 'SELECT role, content, timestamp FROM chat_history WHERE page_name = ? ORDER BY timestamp ASC';
  cdb.all(sql, [pageName], function(err, rows) {
    if (err) {
      console.error('Error loading chat history:', err);
      callback([]);
    } else {
      callback(rows || []);
    }
  });
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

  data = req.body;

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

 app.post("/steaksauce/",(req,res)=>
  {
    data = req.body;
    ask = data['ask']
    steaksauce(ask).then((code)=>
    {
      res.send({'code':code})
    })
  })

 app.post("/claude_chat/",(req,res)=>
  {
    data = req.body;
    ask = data['ask'];
    pageName = data['page_name'] || 'default';
    currentCode = data['current_code'] || '';
    selectedModel = data['selected_model'] || 'claude';
    
    // Save user message to database
    saveChatMessage(pageName, 'user', ask);
    
    claudeChat(ask, currentCode, selectedModel).then((response)=>
    {
      // Check if response contains code edit
      const editMatch = response.match(/```edit\n([\s\S]*?)\n```/);
      let hasCodeEdit = false;
      let codeEdit = '';
      
      if (editMatch) {
        hasCodeEdit = true;
        codeEdit = editMatch[1];
        console.log("Code edit detected for page:", pageName);
      }
      
      // Save Claude's response to database
      saveChatMessage(pageName, 'assistant', response);
      
      res.send({
        'response': response,
        'has_code_edit': hasCodeEdit,
        'code_edit': codeEdit
      });
    }).catch((error) => {
      console.error("Claude chat error:", error);
      res.status(500).send({'error': 'Failed to get response from Claude'})
    })
  })

 app.post("/get_chat_history/",(req,res)=>
  {
    data = req.body;
    pageName = data['page_name'] || 'default';
    
    getChatHistory(pageName, (history) => {
      res.send({'history': history});
    });
  })

 app.post("/claude_chat_stream/",(req,res)=>
  {
    data = req.body;
    ask = data['ask'];
    pageName = data['page_name'] || 'default';
    currentCode = data['current_code'] || '';
    selectedModel = data['selected_model'] || 'claude';
    
    // Set up Server-Sent Events
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Cache-Control'
    });

    // Save user message to database
    saveChatMessage(pageName, 'user', ask);

    // Route to different models based on selection
    if (selectedModel.startsWith('ollama:')) {
      const modelName = selectedModel.replace('ollama:', '');
      
      // For Ollama models, we need to handle streaming differently since they don't support SSE
      ollamaChat(ask, currentCode, modelName).then(response => {
        let fullResponse = response;
        
        // Send the complete response as chunks to simulate streaming
        const words = fullResponse.split(' ');
        let currentText = '';
        
        function sendChunk(index) {
          if (index < words.length) {
            currentText += (index > 0 ? ' ' : '') + words[index];
            res.write(`data: ${JSON.stringify({
              type: 'chunk',
              text: (index > 0 ? ' ' : '') + words[index]
            })}\n\n`);
            setTimeout(() => sendChunk(index + 1), 50);
          } else {
            // Check for code edits and save to database
            const editMatch = fullResponse.match(/```edit\n([\s\S]*?)\n```/);
            let hasCodeEdit = false;
            let codeEdit = '';
            
            if (editMatch) {
              hasCodeEdit = true;
              codeEdit = editMatch[1];
            }

            // Save complete response to database
            saveChatMessage(pageName, 'assistant', fullResponse);

            // Send final event with code edit info
            res.write(`data: ${JSON.stringify({
              type: 'complete',
              has_code_edit: hasCodeEdit,
              code_edit: codeEdit
            })}\n\n`);
            res.end();
          }
        }
        
        sendChunk(0);
      }).catch(error => {
        console.error("Ollama streaming error:", error);
        res.write(`data: ${JSON.stringify({error: 'Failed to get response from Ollama'})}\n\n`);
        res.end();
      });
      
      return;
    }

    // Default Claude streaming behavior
    if (!claude_api_key) {
      res.write(`data: ${JSON.stringify({error: 'Claude API key not configured'})}\n\n`);
      res.end();
      return;
    }

    claudeApiDirect(ask, currentCode, true).then(response => {
      if (!response.ok) {
        res.write(`data: ${JSON.stringify({error: `API error: ${response.status}`})}\n\n`);
        res.end();
        return;
      }

      let fullResponse = '';
      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      function readStream() {
        reader.read().then(({ done, value }) => {
          if (done) {
            // Stream finished - check for code edits and save to database
            const editMatch = fullResponse.match(/```edit\n([\s\S]*?)\n```/);
            let hasCodeEdit = false;
            let codeEdit = '';
            
            if (editMatch) {
              hasCodeEdit = true;
              codeEdit = editMatch[1];
            }

            // Save complete response to database
            saveChatMessage(pageName, 'assistant', fullResponse);

            // Send final event with code edit info
            res.write(`data: ${JSON.stringify({
              type: 'complete',
              has_code_edit: hasCodeEdit,
              code_edit: codeEdit
            })}\n\n`);
            res.end();
            return;
          }

          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split('\n');

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const eventData = JSON.parse(line.slice(6));
                if (eventData.type === 'content_block_delta' && eventData.delta && eventData.delta.text) {
                  const text = eventData.delta.text;
                  fullResponse += text;
                  
                  // Send the text chunk to client
                  res.write(`data: ${JSON.stringify({
                    type: 'chunk',
                    text: text
                  })}\n\n`);
                }
              } catch (e) {
                // Skip malformed JSON
              }
            }
          }

          readStream();
        }).catch(err => {
          console.error('Stream reading error:', err);
          res.write(`data: ${JSON.stringify({error: 'Stream reading error'})}\n\n`);
          res.end();
        });
      }

      readStream();
    }).catch(error => {
      console.error("Claude streaming error:", error);
      res.write(`data: ${JSON.stringify({error: 'Failed to get response from Claude'})}\n\n`);
      res.end();
    });
  })

 app.post("/clear_chat_history/",(req,res)=>
  {
    data = req.body;
    pageName = data['page_name'] || 'default';
    
    const sql = 'DELETE FROM chat_history WHERE page_name = ?';
    cdb.run(sql, [pageName], function(err) {
      if (err) {
        console.error('Error clearing chat history:', err);
        res.status(500).send({'error': 'Failed to clear chat history'});
      } else {
        res.send({'success': true, 'cleared': this.changes});
      }
    });
  })

 app.post("/ollama_models/",(req,res)=>
  {
    // Check what Ollama models are available
    fetch('http://localhost:11434/api/tags')
    .then(response => response.json())
    .then(data => {
      const models = data.models ? data.models.map(m => m.name) : [];
      res.send({'models': models});
    })
    .catch(error => {
      console.error('Ollama connection error:', error);
      res.send({'models': [], 'error': 'Ollama not available'});
    });
  })

 app.post("/claude_complete/",(req,res)=>
  {
    data = req.body;
    textBeforeCursor = data['text_before_cursor'] || '';
    fullCode = data['full_code'] || '';
    
    if (!claude_api_key) {
      res.status(500).send({'error': 'Claude API key not configured'});
      return;
    }
    
    // Determine if this is a dot completion
    const isDotCompletion = textBeforeCursor.endsWith('.');
    
    let completionPrompt;
    if (isDotCompletion) {
      // Extract the variable name before the dot
      const varMatch = textBeforeCursor.match(/(\w+)\.$/);
      const varName = varMatch ? varMatch[1] : 'unknown';
      
      // Enhanced prompt for multiple attribute/method suggestions
      completionPrompt = `Analyze this Python variable and provide 6-8 relevant method/attribute suggestions.

Variable: ${varName}
Line: "${textBeforeCursor}"
Full code context:
\`\`\`python
${fullCode}
\`\`\`

ANALYSIS STEPS:
1. Look at how "${varName}" is defined/assigned in the code
2. Determine its likely type (string, list, dict, numpy array, pandas DataFrame, etc.)
3. Return appropriate methods/attributes for that type

RESPONSE FORMAT: Return ONLY a JSON array like ["method1()", "method2()", "attribute1"]

TYPE-SPECIFIC SUGGESTIONS:
- String variables: ["split()", "replace()", "upper()", "lower()", "strip()", "find()", "startswith()", "endswith()"]
- List variables: ["append()", "extend()", "pop()", "remove()", "sort()", "reverse()", "index()", "count()"]
- Dict variables: ["keys()", "values()", "items()", "get()", "pop()", "update()", "clear()"]
- Numpy arrays: ["shape", "dtype", "mean()", "sum()", "max()", "min()", "reshape()", "transpose()"]
- Pandas DataFrame: ["head()", "tail()", "describe()", "info()", "groupby()", "drop()", "columns", "index"]
- Matplotlib figures: ["savefig()", "tight_layout()", "add_subplot()", "suptitle()"]
- File objects: ["read()", "write()", "close()", "readline()", "readlines()"]

JSON array:`;
    } else {
      // Regular completion prompt
      completionPrompt = `Complete this Python line (only return the completion text):
Line: "${textBeforeCursor}"

IMPORTANT: When suggesting matplotlib/plotting code, use pithy3 functions:
- Use showme() instead of plt.show()
- Use "from pithy3 import *" for plotting imports
- Otherwise, suggest normal Python completions

Return only the text needed to complete the line:`;
    }
    
    claudeApiDirect(completionPrompt, '', false).then((response) => {
      // Clean up the response to get just the completion
      let completion = response.replace(/```python\n?/g, '').replace(/```\n?/g, '').trim();
      
      // Remove any leading text that matches what's already typed
      if (completion.startsWith(textBeforeCursor)) {
        completion = completion.substring(textBeforeCursor.length);
      }
      
      // Handle different completion types
      if (isDotCompletion) {
        try {
          // Try to parse as JSON array
          let suggestions = JSON.parse(completion);
          if (Array.isArray(suggestions)) {
            res.send({'suggestions': suggestions, 'is_dot_completion': isDotCompletion});
          } else {
            // Fallback to single completion
            completion = completion.split(/[\s\n\(\)]/)[0];
            res.send({'completion': completion, 'is_dot_completion': isDotCompletion});
          }
        } catch (e) {
          // If JSON parsing fails, treat as single completion
          completion = completion.split(/[\s\n\(\)]/)[0];
          res.send({'completion': completion, 'is_dot_completion': isDotCompletion});
        }
      } else {
        // Remove any explanatory text - just get the code
        const lines = completion.split('\n');
        if (lines[0] && !lines[0].startsWith('#')) {
          completion = lines[0];
        }
        res.send({'completion': completion, 'is_dot_completion': isDotCompletion});
      }
    }).catch((error) => {
      console.error("Claude completion error:", error);
      res.status(500).send({'error': 'Failed to get completion from Claude'});
    });
  })


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

app.get('/*', (req, res) => {
    if (req.params[0] == "") res.sendFile('homepage.html', { root: __dirname+"/static" })
    else res.sendFile('index.html', { root: __dirname+"/static" });
  });


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
    var eco = ""
    if (ps[codename]['killed']) eco = `was killed`
    else eco = `finished with code ${exit_code}`
    var rt = new Date().getTime()-tss[codename];
    DEBUG.log(`${codename} ${eco} after ${rt} ms`)
    editrow(tss[codename],rt,exit_code,eco);
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
DEBUG.log(`running at '${host}' on port ${port}`)
