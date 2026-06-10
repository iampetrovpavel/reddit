## Context

The extension currently stops after executing the `open` command — `window.location.href` navigates to the article page, destroying the content script's in-memory state (WebSocket, sessionId, scroll timers). The new article page loads a fresh content script instance with no knowledge of the ongoing session.

The server holds Claude conversation state keyed by `sessionId` in memory. The Claude session has context of all posts scrolled so far, including the one chosen to open. Reusing that session for comment generation preserves this conversational context.

Reddit's new shreddit UI renders posts as `<shreddit-post>` custom elements and comments as `<shreddit-comment>` custom elements with `depth` attributes. The comment composer is a `<shreddit-composer>` element backed by a Lexical rich-text editor (`data-lexical-editor="true"`).

## Goals / Non-Goals

**Goals:**
- Bridge session state across same-tab page navigation using `sessionStorage`
- Extract post + top 5 depth-0 comments from article page DOM
- Send full article payload to server; receive `{"comment":"..."}` JSON from Claude
- Fill Reddit's shreddit-composer and submit the comment
- Navigate back after 2 seconds

**Non-Goals:**
- Handling reply-to-comment (only top-level comments are posted)
- Error recovery if the comment fails to submit (e.g., rate limit, auth issue)
- Supporting article pages opened by means other than the `open` command

## Decisions

### 1. sessionStorage as the navigation bridge

`sessionStorage` survives same-tab navigation within the same origin (reddit.com) and is automatically scoped to the tab. A background script or `localStorage` would work too, but sessionStorage needs no cleanup on tab close and avoids cross-tab leakage.

**Key**: before `window.location.href = url`, write `JSON.stringify({ sessionId })` to `sessionStorage.getItem('redit_state')`. On the article page, the content script reads and immediately clears it.

**Alternative considered**: passing sessionId as a URL hash fragment. Rejected — Reddit's router may strip or interfere with fragments.

### 2. Article-mode detection in the single content script

Rather than a separate entrypoint, the existing `reddit.content.ts` detects mode at startup:
- `window.location.pathname.includes('/comments/')` → potential article mode
- `sessionStorage.getItem('redit_state')` present → confirmed comment mode

This avoids managing two entrypoints and keeps WXT config minimal.

### 3. New WebSocket connection on article page

The article page opens a fresh WS and sends `article_seen { sessionId, article }`. The server's `SessionManager` already maps sessionId → Claude state independently of the WS connection, so any WS can send to any session.

**Alternative considered**: keeping the WS alive across navigation via a background page/service worker proxy. Rejected — adds complexity; a new WS connection is cheap and the server is local.

### 4. Claude response format: `{"comment":"..."}` JSON

The server parses the response with the same regex approach used for post commands, but extracts `comment` instead of `command`. This keeps the Claude response handling uniform.

`max_tokens` raised to 300 for the article path — post commands need ~10 tokens; a comment needs 50–200.

### 5. Filling Lexical editor via `execCommand`

Reddit's composer uses Lexical (`data-lexical-editor="true"`). Setting `.textContent` directly bypasses Lexical's internal state and the submit button stays disabled. `document.execCommand('insertText', false, text)` on the focused `contenteditable` element triggers Lexical's input event handlers, enabling the submit button.

**Selector**: `shreddit-composer div[slot="rte"][contenteditable="true"]`  
**Submit**: `#comment-composer-submit-button`

### 6. `open` command navigates current tab (not new tab)

The existing spec says `window.open(..., '_blank')` but the implementation uses `window.location.href`. The sessionStorage bridge only works with same-tab navigation. This change codifies `window.location.href` as the correct behavior.

## Risks / Trade-offs

**Lexical editor API may change** → Mitigation: the `execCommand` path is widely used and stable; if it breaks, the fallback is dispatching a synthetic `input` event with `InputEvent({ inputType: 'insertText', data: text })`.

**Comment composer not yet rendered when content script runs** → Mitigation: add a small poll/wait (up to 3s) for `shreddit-composer` to appear before attempting to fill it. Reddit loads it asynchronously.

**sessionStorage cleared on comment mode entry** → If the user manually refreshes the article page, the state is gone and the script falls back to idle (no scroll loop, no crash). Acceptable.

**Claude comment quality depends on token budget** → 300 max_tokens supports ~200-word comments. Sufficient for Reddit-style engagement.

## Open Questions

- Should the bot wait for comments to lazy-load before extracting, or use whatever is immediately in the DOM? (Current plan: use what's available immediately, cap at 5.)
- Should comment submission failure (button not found, submit errors) cause `history.back()` anyway? (Recommended: yes, always go back to avoid getting stuck on article pages.)
