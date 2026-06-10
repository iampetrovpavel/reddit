# Spec: command-handler

## Requirement: Content script receives command messages
The content script SHALL listen on `ws.onmessage` and parse incoming `ServerMessage` payloads.

### Scenario: Command message received
- **WHEN** the server sends `{ type: 'command', command: 'scroll' }` over the WebSocket
- **THEN** the content script parses it and dispatches to the appropriate handler

## Requirement: scroll command resumes the scroll loop
On receiving `command: 'scroll'`, the content script SHALL call `scheduleNext()` to resume autonomous scrolling.

### Scenario: Scroll resumed after Claude decision
- **WHEN** `{ type: 'command', command: 'scroll' }` is received
- **THEN** `scheduleNext()` is called and the scroll timer restarts

## Requirement: like command clicks the upvote button
On receiving `command: 'like'`, the content script SHALL find the upvote button within the current article element and click it, then resume scrolling.

### Scenario: Upvote button found and clicked
- **WHEN** `{ type: 'command', command: 'like' }` is received and the upvote button exists in the current article
- **THEN** the upvote button is clicked and `scheduleNext()` is called

### Scenario: Upvote button not found
- **WHEN** `{ type: 'command', command: 'like' }` is received but no upvote button is found
- **THEN** a warning is logged and `scheduleNext()` is still called (session continues)

## Requirement: open command navigates current tab
On receiving `command: 'open'`, the content script SHALL save the current `sessionId` to `sessionStorage` under the key `redit_state` as `JSON.stringify({ sessionId })`, then navigate the current tab to the post URL via `window.location.href`. It SHALL NOT resume the scroll loop after navigating.

### Scenario: sessionStorage written before navigation
- **WHEN** `{ type: 'command', command: 'open' }` is received and `currentPost` has a URL
- **THEN** `sessionStorage.getItem('redit_state')` contains `{ sessionId }` and `window.location.href` is set to the post URL

### Scenario: Scroll loop not resumed after open
- **WHEN** `{ type: 'command', command: 'open' }` is received
- **THEN** `scheduleNext()` is NOT called

## Requirement: Scroll pauses after sending a post
After sending a `post_seen` message, the content script SHALL clear the scroll timer and not scroll again until a command is received.

### Scenario: Scroll timer cleared on post send
- **WHEN** a post is sent via `ws.send({ type: 'post_seen', ... })`
- **THEN** `clearTimeout(timerId)` is called and `timerId` is set to null

## Requirement: Session started on WebSocket open
On `ws.onopen`, the content script SHALL send `{ type: 'new_session', systemPromptPath: 'default' }` and store the `sessionId` from the resulting `session_created` response.

### Scenario: Session created on connect
- **WHEN** the WebSocket connection opens
- **THEN** `new_session` is sent and the content script stores the returned `sessionId`

### Scenario: Post received before session ready
- **WHEN** a post enters the viewport before `session_created` is received
- **THEN** the post is discarded and the scroll continues (no crash, no hang)

## Requirement: Content script handles comment server message
The content script SHALL handle `{ type: 'comment', text }` messages received on the WebSocket in comment mode.

### Scenario: Non-empty comment text triggers post flow
- **WHEN** `{ type: 'comment', text: 'some comment' }` is received in comment mode
- **THEN** the content script attempts to fill and submit the composer, waits 2 seconds, then calls `history.back()`

### Scenario: Empty comment text triggers back only
- **WHEN** `{ type: 'comment', text: '' }` is received in comment mode
- **THEN** the content script calls `history.back()` without attempting to fill the composer
