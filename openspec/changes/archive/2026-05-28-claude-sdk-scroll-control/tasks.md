## 1. Shared Types

- [x] 1.1 Add `{ type: 'command'; command: 'scroll' | 'like' | 'open' }` variant to `ServerMessage` union in `packages/shared/src/types.ts`

## 2. Server — Anthropic SDK Integration

- [x] 2.1 Add `@anthropic-ai/sdk` to `apps/server/package.json` dependencies
- [x] 2.2 Define `SessionState = { systemPrompt: string; messages: MessageParam[] }` type in `apps/server/src/providers/claude.ts`
- [x] 2.3 Implement `ClaudeProvider.startSession('default')` — resolve `persona.md` absolute path using `import.meta.dir`, read file, store `SessionState` in a `Map<string, SessionState>`, return `Session`
- [x] 2.4 Implement `ClaudeProvider.sendMessage(sessionId, content)` — append user message to `messages`, call `client.messages.create({ model, system, messages })`, append assistant response, yield the response text
- [x] 2.5 Implement `ClaudeProvider.endSession(sessionId)` — delete session state from the map
- [x] 2.6 Switch `apps/server/src/index.ts` from `StubProvider` to `ClaudeProvider`

## 3. Server — post_seen Orchestration

- [x] 3.1 Add `sessionId: string | null` tracking to `SessionManager` (single active session for now)
- [x] 3.2 Update `case 'session_created'` equivalent — store `sessionId` when `new_session` creates a session
- [x] 3.3 Update `case 'post_seen'` in `SessionManager.handle()` — call `provider.sendMessage(sessionId, JSON.stringify(msg.post))`, collect full response, parse JSON, send `{ type: 'command', command }` via `send()`
- [x] 3.4 Add fallback in `post_seen` handler — if JSON parse fails or `command` field missing, log warning and send `{ type: 'command', command: 'scroll' }`

## 4. Content Script — Session Lifecycle

- [x] 4.1 Add `sessionId: string | null = null` variable to content script module scope
- [x] 4.2 In `ws.onopen`: send `{ type: 'new_session', systemPromptPath: 'default' }` over the WebSocket
- [x] 4.3 In `ws.onmessage`: parse incoming `ServerMessage`; handle `session_created` by storing `sessionId` and calling `scheduleNext()` to start first scroll

## 5. Content Script — Pause/Resume Scroll

- [x] 5.1 Add `currentArticle: Element | null = null` variable to content script module scope
- [x] 5.2 In `sendPost()`: set `currentArticle = article`, clear scroll timer (`clearTimeout(timerId); timerId = null`) after sending `post_seen`
- [x] 5.3 Remove the automatic `scheduleNext()` call from `START_SCROLL` handler (scroll now starts only after `session_created` is received)

## 6. Content Script — Command Handler

- [x] 6.1 In `ws.onmessage`: handle `command` message type — dispatch to `handleCommand(msg.command)`
- [x] 6.2 Implement `handleCommand(command)`:
  - `'scroll'` → call `scheduleNext()`
  - `'like'` → query `currentArticle` for upvote button (`[aria-label*="upvote" i], button[id*="upvote"]`), click if found (log warning if not), then call `scheduleNext()`
  - `'open'` → call `window.open(currentArticle's post url, '_blank')`, then call `scheduleNext()`
- [x] 6.3 After handling any command, set `currentArticle = null`

## 7. Content Script — Stop Scroll Cleanup

- [x] 7.1 In `STOP_SCROLL` handler: reset `sessionId = null` and `currentArticle = null` in addition to existing teardown
