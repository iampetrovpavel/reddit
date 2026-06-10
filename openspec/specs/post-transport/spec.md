# Spec: post-transport

## Requirement: WebSocket connection to server
The content script SHALL open a WebSocket connection to the server when scrolling starts.

### Scenario: Connection opens on scroll start
- **WHEN** `START_SCROLL` message is received
- **THEN** a WebSocket connection is opened to `ws://localhost:<WS_PORT>`

### Scenario: Server unreachable
- **WHEN** the WebSocket connection fails to open
- **THEN** the error is caught and logged to console; the scroll loop continues unaffected

## Requirement: Send post_seen messages
The content script SHALL send a `{ type: 'post_seen', post }` message over the WebSocket for each new post detected, and SHALL pause the scroll loop immediately after sending.

### Scenario: Post sent and scroll paused
- **WHEN** a new post is detected and the WebSocket is open and a sessionId is active
- **THEN** a `post_seen` message is sent with the post's `postId`, `title`, `url`, and `imageUrl`; the scroll timer is cleared

### Scenario: Post skipped when disconnected
- **WHEN** a new post is detected and the WebSocket is not open
- **THEN** the post is silently skipped (no crash)

### Scenario: Post skipped when no session
- **WHEN** a new post is detected but no `sessionId` has been received yet
- **THEN** the post is silently discarded and scrolling continues

## Requirement: WebSocket closes on scroll stop
The content script SHALL close the WebSocket connection when scrolling stops.

### Scenario: Connection closed on stop
- **WHEN** `STOP_SCROLL` message is received
- **THEN** the WebSocket is closed with a normal closure code

## Requirement: Server handles post_seen by calling Claude
The server SHALL handle `post_seen` messages by calling the Claude API and sending a `command` response.

### Scenario: Post triggers Claude call and command response
- **WHEN** the server receives a `{ type: 'post_seen', post }` message
- **THEN** the server calls Claude with the post data and sends `{ type: 'command', command }` back over the WebSocket

## Requirement: Server handles article_seen by generating a comment
The server SHALL handle `article_seen` messages by calling Claude with the full article payload and sending a `{ type: 'comment', text }` response when Claude returns `{"comment":"..."}` JSON.

### Scenario: article_seen triggers comment generation and response
- **WHEN** the server receives `{ type: 'article_seen', sessionId, article }` over the WebSocket
- **THEN** the server calls `provider.sendMessage` with the serialized article, parses `{"comment":"..."}` from the response, and sends `{ type: 'comment', text }` back

### Scenario: Unparseable Claude response falls back to history.back signal
- **WHEN** Claude's response cannot be parsed as `{"comment":"..."}` JSON
- **THEN** the server logs a warning and sends `{ type: 'comment', text: '' }` (empty text triggers the back-only path in the content script)

## Requirement: Claude max_tokens increased for article path
The server SHALL use a `max_tokens` of at least 300 when calling Claude for `article_seen` processing, independently of the 64-token limit used for `post_seen` commands.

### Scenario: Article response allows longer output
- **WHEN** Claude is called during `article_seen` processing
- **THEN** the API call is made with `max_tokens >= 300`
