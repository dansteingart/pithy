/* eslint-env browser */

import * as Y from 'yjs'
import { WebsocketProvider } from 'y-websocket'
import { MonacoBinding } from 'y-monaco'
import * as monaco from 'monaco-editor'

// @ts-ignore
window.MonacoEnvironment = {
  getWorkerUrl: function (moduleId, label) {
    if (label === 'json') {
      return '/dist/json.worker.bundle.js'
    }
    if (label === 'css') {
      return '/dist/css.worker.bundle.js'
    }
    if (label === 'html') {
      return '/dist/html.worker.bundle.js'
    }
    if (label === 'typescript' || label === 'javascript') {
      return '/dist/ts.worker.bundle.js'
    }
    return '/dist/editor.worker.bundle.js'
  }
}

window.Y = Y;
window.WebsocketProvider = WebsocketProvider;
window.monaco = monaco;
window.MonacoBinding = MonacoBinding;
