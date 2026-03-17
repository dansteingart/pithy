# pithy is

```
1. concise and forcefully expressive, or
2. containing much pith
```

Code should be 1, not 2.

Sometimes you want to share code and see what it does on the same page. Sometimes you want to do this for python with scientific computing. Enter pithy.

Pithy has code on the left, and output on the right. All changes are saved, and the URL is freely shareable. Real-time collaboration with multiple cursors, version history, and a REST API for AI agents to join as co-editors.

Pithy has been tested against sophomores and juniors in chemical and mechanical engineering classes successfully since 2011.

![pithy_show](https://user-images.githubusercontent.com/152047/120088467-bd77db00-c0be-11eb-81ee-bb2410544fd5.gif)

## You might say

Pithy is just like [jupyter notebook](http://jupyter.org/), or `<insert your favorite web ide here>`, and I'd be flattered. But it's got differences, and the best way to understand them is this:

The incomparable [Aaron Swartz](https://en.wikipedia.org/wiki/Aaron_Swartz) made a couple of web page/wiki/blog/information engines that are awesome and (imho) radically under-appreciated. They are [jottit](https://www.jottit.com/) and [infogami](https://github.com/infogami/infogami). The beauty of these programs is the expansiveness of what they can do coupled with the minimal overhead of what you need to get something done.

Here's why they're great:

You go to a URL.
If the URL exists, you can read what's there.
          You might be able to add to it.
If the URL doesn't exist, then within 5 seconds you can make it exist.

Minimal (if any) logging in, and close to zero friction between you and new content. No laborious wizards nor setup queues. No "file menu". No "really?". Just writing. If you needed to go back, you could.

I learned python because Aaron spoke highly of it, and pithy is inspired by Aaron's approach to adding content to the web, but rather than verbally expressive content this is intended for quantitative analyses.

This is pithy. It does that.

## Big warning

Pithy runs arbitrary python on your machine and sends the output back to the browser. This is convenient, this is also potentially SUPER DANGEROUS. Pithy should be run on a server:

1. That is routinely backed up
2. Has nothing you don't want the world to see unencrypted
3. That can suffer some downtime if someone does something stupid

The [Raspberry Pi](http://www.raspberrypi.org/) is an awesome server for this very thing.

Because pithy just runs from a directory, standard HTTP authentication can be applied to make stuff safe(r) — herein we use basic auth.

## Getting started

### Requirements

- Node.js >= 18
- Python 3 with numpy, scipy, matplotlib

### Install and run

```bash
git clone https://github.com/dansteingart/pithy
cd pithy
npm install
npx webpack
bash start.sh
```

The editor runs on port 8080 by default. Go to `http://localhost:8080/hello` to create your first page.

### Docker

```bash
docker run -dit -e UPDATE=true -p 8080:8080 -p 8081:8081 \
--name pithy_trial \
steingart/pithy
```

Add `-v [YOUR HOST DIR]:/pithy` to persist code on the host.

### Environment variables

| Variable | Default | Description |
|---|---|---|
| `PORT` | `1234` | Server port |
| `HOST` | `0.0.0.0` | Bind address |
| `PITHY_BIN` | `python3` | Python binary |
| `PITHY_TIMEOUT` | `0` (none) | Default execution timeout in seconds |

You can also set per-file overrides in the code itself:
- `#!/path/to/python` — custom python binary
- `##pithytimeout=30` — custom timeout in seconds

## How it works

- **Monaco Editor** (VS Code's editor) for code editing
- **Yjs** CRDT for real-time collaboration over WebSocket
- **SQLite** for run history and code snapshots
- **Express** serves the app, manages process execution, and provides the API
- Code runs as a subprocess; stdout/stderr stream to the output pane via Yjs

### pithy3 library

For plotting and scientific computing, start your code with:

```python
from pithy3 import *
```

This gives you numpy, matplotlib/pylab, and the key helper:

- `showme()` — renders the current matplotlib figure to the output pane (call after building a plot)
- `showimg(pil_image)` — renders a PIL image
- `smooth(array, window_len)` — moving average smoothing
- `clf()` — clear figure between plots

Any `.py` file can import any other `.py` file by name.

## Keyboard shortcuts

| Shortcut | Action |
|---|---|
| `Cmd+Enter` | Run code |
| `Shift+Cmd+Enter` | Kill running code |
| `F10` | Toggle layout (50/50, all code, all output) |
| `F9` | Pop out output window |
| `F2` | Toggle word-based autocomplete |

## Agent API

Pithy has a REST API that lets AI agents collaborate as co-users. All edits go through the real-time CRDT, so changes appear instantly in the browser.

**Get started:** `GET /api/agent` returns full self-documenting instructions for any AI to learn the API.

### Endpoints

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/agent` | Self-documenting API guide for AI agents |
| `GET` | `/api/codes` | List all code files |
| `GET` | `/api/:name/code` | Read live code from editor |
| `PUT` | `/api/:name/code` | Replace entire code |
| `PATCH` | `/api/:name/code` | Surgical edit (find/replace or positional) |
| `POST` | `/api/:name/run` | Execute code |
| `POST` | `/api/:name/kill` | Kill running process |
| `GET` | `/api/:name/status` | Check execution state |
| `GET` | `/api/:name/output` | Read output |
| `GET` | `/api/:name/output/stream` | SSE stream for real-time output |
| `GET` | `/api/:name/history` | List version history |
| `GET` | `/api/:name/history/:time` | Get a history snapshot |
| `POST` | `/api/:name/history/:time/revert` | Revert to a snapshot |

All endpoints use HTTP Basic Auth (same credentials as the web UI).

### Example: AI writes and runs code

```bash
# Read current code
curl -u user:pass http://localhost:8080/api/myfile/code

# Write new code (appears live in browser)
curl -u user:pass -X PUT -H 'Content-Type: application/json' \
  -d '{"code":"from pithy3 import *\nplot([1,2,3],[1,4,9])\nshowme()"}' \
  http://localhost:8080/api/myfile/code

# Run it
curl -u user:pass -X POST http://localhost:8080/api/myfile/run

# Check output
curl -u user:pass http://localhost:8080/api/myfile/output
```

## More details

[Here](https://www.notion.so/ceecnyc/pithy-f6f3546b84634327b7e623c9e1f3d767).
