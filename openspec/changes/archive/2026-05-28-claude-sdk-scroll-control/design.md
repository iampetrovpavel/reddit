## Context

The extension can already detect posts and send them to the server over WebSocket. The server has a `ClaudeProvider` stub and a `SessionManager` that logs `post_seen` and does nothing else. The Anthropic SDK is not yet a dependency of the server. The scroll loop in the content script runs autonomously on a timer without waiting for any external signal.

The goal is to wire these pieces together so Claude drives the session: evaluating each post and deciding what to do next.

## Goals / Non-Goals

**Goals:**
- Implement `ClaudeProvider` with the Anthropic SDK — stateful per-session conversation history
- Route `post_seen` through Claude and send the resulting command back to the extension
- Pause the scroll loop in the content script while waiting for a command
- Handle `scroll`, `like`, and `open` commands in the content script

**Non-Goals:**
- `comment` and `back` commands (deferred)
- Persisting posts or commands to a database
- Sidepanel UI for displaying Claude decisions
- Rate limiting or cost controls on Claude API calls

## Decisions

### 1. Anthropic SDK over Claude CLI subprocess

**Decision**: Use `@anthropic-ai/sdk` in the server process directly.

**Why**: The Claude CLI is built for interactive human use. Reliable machine-to-machine piping over stdin/stdout requires process management, output parsing, and error handling that adds fragility for no benefit. The SDK gives a clean async API, predictable streaming, and native TypeScript types.

**Alternative considered**: Spawn `claude --system persona.md`, pipe JSON messages. Rejected because process lifecycle management and stdout parsing are brittle at the boundary.

### 2. Conversation history held in-process per session

**Decision**: `ClaudeProvider` stores a `messages: MessageParam[]` array per session ID in a `Map`. Each `sendMessage` call appends the user message, calls the API, appends the assistant response, and returns the text.

**Why**: Claude needs context of what it already evaluated in this session to avoid repeating decisions. In-process storage is trivial for a single-user local tool. No external state store needed.

**Alternative considered**: Stateless per-request (no history). Rejected because Claude would have no memory of earlier posts and could make inconsistent decisions.

### 3. System prompt loaded once at session start

**Decision**: `startSession(systemPromptPath)` reads the file at path and stores the text in session state. All `sendMessage` calls pass it as the `system` parameter.

**Why**: The Anthropic SDK accepts `system` as a top-level string per request, not stored server-side. Reading the file once per session avoids repeated disk I/O on every post.

### 4. Content script starts the session on ws.onopen

**Decision**: The content script sends `{ type: 'new_session', systemPromptPath: '<absolute path to persona.md>' }` in `ws.onopen`, receives `session_created` with a `sessionId`, stores it, and uses it for subsequent `post_seen` messages.

**Why**: The scroll session and the Claude session have the same lifecycle — start together, end together. Keeping both in the content script avoids sidepanel coordination. The system prompt path is a server-side concern; the server knows where `persona.md` lives.

**Alternative considered**: Hardcode system prompt path in server (no `systemPromptPath` from client). Viable but less flexible — kept the existing `new_session` protocol unchanged.

### 5. Scroll loop pauses on post send, resumes on command

**Decision**: After `sendPost()` sends a `post_seen` message, the content script clears the scroll timer (`clearTimeout(timerId); timerId = null`). The `ws.onmessage` handler calls `scheduleNext()` when `command === 'scroll'` or after acting on `like`/`open`.

**Why**: The loop must wait for Claude. Letting the timer fire again before a response arrives would send the next post before Claude has decided on the current one, causing out-of-order decisions.

### 6. Like action targets the upvote button within the current article

**Decision**: The content script tracks `currentArticle: Element | null` — set when a post is sent, cleared after the command is handled. For `like`, it runs `currentArticle.querySelector('[aria-label*="upvote" i], button[id*="upvote"]')?.click()`.

**Why**: The upvote button is inside the article element already held in memory. A DOM query scoped to the article is reliable and avoids selecting unrelated buttons.

### 7. Open action uses window.open in the content script

**Decision**: For `open`, the content script calls `window.open(post.url, '_blank')`.

**Why**: The content script has direct access to `window`. No background script messaging needed.

## Risks / Trade-offs

- **Claude API latency (~0.5–2s per post)** → Scroll is paused during this time. Acceptable for an autonomous agent; the user is not manually scrolling.
- **Claude returns malformed JSON** → Parse defensively; on failure, default to `scroll` to keep the session moving rather than hanging.
- **`session_created` arrives after first post is detected** → The content script must wait for `session_created` before sending `post_seen`. Track a `sessionId: string | null` and buffer or discard posts seen before session is ready.
- **Upvote selector breaks if Reddit changes DOM** → Gracefully no-op if selector returns null; log a warning. Does not crash the session.
- **`new_session` path hardcoded on client** → Server resolves an absolute path at runtime using `import.meta.dir`; the client sends a sentinel string `'default'` and the server resolves it. Simpler than the client knowing the server's filesystem layout.
