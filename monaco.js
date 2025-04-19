/* eslint-env browser */

import * as Y from 'yjs'
import { WebsocketProvider } from 'y-websocket'
import { MonacoBinding } from 'y-monaco'
//import * as monaco from 'monaco-editor'
import * as monaco from 'monaco-editor/esm/vs/editor/editor.api'
import normalizeUrl from 'normalize-url'
import ReconnectingWebSocket from 'reconnecting-websocket'
import * as rpc from 'vscode-ws-jsonrpc'
import { MonacoLanguageClient, CloseAction, ErrorAction, createMessageConnection } from 'monaco-languageclient'

window.Y = Y
window.WebsocketProvider = WebsocketProvider
window.MonacoBinding = MonacoBinding
window.monaco = monaco
window.normalizeUrl = normalizeUrl
// window.MonacoLanguageClient = MonacoLanguageClient
// window.rpc = rpc
// window.ReconnectingWebSocket = ReconnectingWebSocket
// window.CloseAction = CloseAction
// window.ErrorAction = ErrorAction
// window.createMessageConnection = createMessageConnection

