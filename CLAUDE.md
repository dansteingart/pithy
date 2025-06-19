# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## About Pithy

Pithy is a collaborative web-based Python execution environment inspired by Aaron Swartz's minimal-friction approach to content creation. It features a split-screen interface with code on the left and output on the right, real-time collaboration via WebSocket connections, and instant shareable URLs.

## Commands and Development

### Starting the Application
```bash
bash start.sh
```
This starts both the main server (port 8080) and the shower server (port 8081) with a 60-second timeout for Python execution.

### Building Assets
```bash
npx webpack
```
Builds the Monaco editor bundle and other frontend assets to the `dist/` directory.

### Manual Server Control
- Main server: `PORT=8080 PITHY_TIMEOUT=60 node server.js`
- Shower server: `PORT=8081 node shower.js`

## Architecture Overview

### Core Components

**server.js** - Main application server handling:
- Real-time collaborative editing via Y.js/WebSocket
- Python code execution with configurable timeouts and interpreters
- SQLite databases for code storage and execution history
- Basic HTTP authentication
- AI code generation integration (steaksauce function)

**shower.js** - Secondary server for standalone code execution:
- Executes Python files marked with `##shower` directive
- Handles POST requests with code payloads
- Supports styled output via `##style` directive

**monaco.js** - Frontend Monaco editor integration:
- Y.js WebSocket provider for real-time collaboration
- Monaco editor binding with Python syntax highlighting
- Collaborative cursor awareness

### Data Storage

- **runs.db** - SQLite database storing execution history (runtime, exit codes, users)
- **code.db** - SQLite database for code persistence, versioning, and chat history
  - `code` table - Current code files with timestamps
  - `history` table - Code version history
  - `chat_history` table - Claude chat conversations per page
- **code/** - Directory containing saved Python files
- **code_stamped/** - Historical versions with timestamps
- **persist/** - Y.js document persistence (if enabled)

### Real-time Collaboration

The application uses Y.js for operational transformation:
- WebSocket connections managed through `libs/utils.js`
- Shared documents with collaborative text editing
- Awareness protocol for showing other users' cursors
- Automatic persistence and conflict resolution

### Python Execution Features

- Configurable Python interpreter via shebang (`#!/usr/bin/python3`) in code
- Timeout control via `##pithytimeout=N` comment directive
- Output streaming to collaborative view
- Process management with kill capability
- History tracking with rollback functionality

### AI Integration Features

**Claude Chat Interface:**
- `Cmd/Ctrl + K` - Open Claude chat in popup window
- `Cmd/Ctrl + Shift + E` - Explain selected code
- `Cmd/Ctrl + Shift + D` - Debug code
- `Cmd/Ctrl + Shift + O` - Optimize code
- **Popup window design** - Chat opens in separate window for better multitasking
- **Real-time streaming** - Responses appear as Claude types them
- **Direct code editing** - Claude can modify your code through chat
- **Persistent chat history** - Each page/file has its own saved conversation
- **Smart positioning** - Window appears on right side of screen
- **Context-aware** - Automatically includes selected or full code context
- **Clear history** button for fresh starts

**Code Editing Features:**
- **Smart code modifications** - Ask Claude to "fix this bug", "add error handling", "optimize this function"
- **Side-by-side preview** - Review changes before applying
- **Safe application** - Easy undo with Cmd/Ctrl+Z
- **Full context** - Claude sees your entire code file for better suggestions

**Steaksauce (Code Generation):**
- `F4` - Generate code from selected text/prompt
- Integrates with existing OpenWebUI API endpoint

### Authentication

- Basic HTTP authentication using `assets/pass.json`
- Default credentials: user/pass (should be changed in production)
- All routes protected except static assets

## File Structure Patterns

- `static/` - Frontend assets (HTML, CSS, JS, themes)
- `libs/` - Shared utilities (Y.js WebSocket handling, callbacks)
- `fonts/` - Typography assets
- `dist/` - Built webpack bundles
- Temporary directories created automatically: `temp_results/`, `results/`, `images/`, `files/`, `assets/`

## Environment Variables

- `HOST` - Server bind address (default: 0.0.0.0)  
- `PORT` - Main server port (default: 1234)
- `PITHY_BIN` - Python interpreter path (default: python3)
- `PITHY_TIMEOUT` - Execution timeout in seconds (default: 0 = no limit)
- `CLAUDE_API_KEY` - **Direct Claude API key (recommended)**
- `OPENWEBUIAPI_KEY` - API key for AI code generation (fallback)
- `OPENWEBUISERVER` - AI service endpoint URL (fallback)

## Development Notes

### Y.js Integration
The application uses Y.js for real-time collaboration. To avoid constructor conflicts:
- Y.js is loaded via `yball.js` and exposed globally as `window.Y`
- Monaco bundle uses external Y.js reference instead of bundling it
- Webpack config: `externals: { 'yjs': 'Y' }` prevents double imports

### Building Assets
Run `npx webpack` to rebuild Monaco editor bundles after changes. The build:
- Excludes Y.js to prevent the "Y.js imported multiple times" error
- Builds web workers (editor.worker, json.worker, css.worker, html.worker, ts.worker) for proper Monaco functionality
- Requires style-loader, css-loader, and file-loader dev dependencies

### Claude API Setup
To enable direct Claude API integration with code editing capabilities:

1. **Get Claude API Key**: Visit [console.anthropic.com](https://console.anthropic.com)
2. **Set Environment Variable**: 
   ```bash
   export CLAUDE_API_KEY="your-api-key-here"
   ```
3. **Restart Pithy**: The server will automatically detect and use the Claude API

**Features unlocked with Claude API:**
- Direct code modifications through chat
- Advanced context understanding
- Better code analysis and suggestions
- Uses Claude 3.5 Sonnet model for optimal performance

## Security Considerations

This application executes arbitrary Python code and should only be run in sandboxed environments. The README emphasizes running on disposable servers with proper backups and network isolation.