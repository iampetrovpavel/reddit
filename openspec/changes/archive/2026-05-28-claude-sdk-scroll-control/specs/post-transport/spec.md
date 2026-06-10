## MODIFIED Requirements

### Requirement: WebSocket connection to server
The content script SHALL open a WebSocket connection to the server when scrolling starts.

#### Scenario: Connection opens on scroll start
- **WHEN** `START_SCROLL` message is received
- **THEN** a WebSocket connection is opened to `ws://localhost:<WS_PORT>`

#### Scenario: Server unreachable
- **WHEN** the WebSocket connection fails to open
- **THEN** the error is caught and logged to console; the scroll loop continues unaffected

### Requirement: Send post_seen messages
The content script SHALL send a `{ type: 'post_seen', post }` message over the WebSocket for each new post detected, and SHALL pause the scroll loop immediately after sending.

#### Scenario: Post sent and scroll paused
- **WHEN** a new post is detected and the WebSocket is open and a sessionId is active
- **THEN** a `post_seen` message is sent with the post's `postId`, `title`, `url`, and `imageUrl`; the scroll timer is cleared

#### Scenario: Post skipped when disconnected
- **WHEN** a new post is detected and the WebSocket is not open
- **THEN** the post is silently skipped (no crash)

#### Scenario: Post skipped when no session
- **WHEN** a new post is detected but no `sessionId` has been received yet
- **THEN** the post is silently discarded and scrolling continues

### Requirement: WebSocket closes on scroll stop
The content script SHALL close the WebSocket connection when scrolling stops.

#### Scenario: Connection closed on stop
- **WHEN** `STOP_SCROLL` message is received
- **THEN** the WebSocket is closed with a normal closure code

### Requirement: Server handles post_seen by calling Claude
The server SHALL handle `post_seen` messages by calling the Claude API and sending a `command` response.

#### Scenario: Post triggers Claude call and command response
- **WHEN** the server receives a `{ type: 'post_seen', post }` message
- **THEN** the server calls Claude with the post data and sends `{ type: 'command', command }` back over the WebSocket
