## ADDED Requirements

### Requirement: WebSocket connection to server
The content script SHALL open a WebSocket connection to the server when scrolling starts.

#### Scenario: Connection opens on scroll start
- **WHEN** `START_SCROLL` message is received
- **THEN** a WebSocket connection is opened to `ws://localhost:<WS_PORT>`

#### Scenario: Server unreachable
- **WHEN** the WebSocket connection fails to open
- **THEN** the error is caught and logged to console; the scroll loop continues unaffected

### Requirement: Send post_seen messages
The content script SHALL send a `{ type: 'post_seen', post }` message over the WebSocket for each new post detected.

#### Scenario: Post sent when connected
- **WHEN** a new post is detected and the WebSocket is open
- **THEN** a `post_seen` message is sent with the post's `postId`, `title`, and `url`

#### Scenario: Post skipped when disconnected
- **WHEN** a new post is detected and the WebSocket is not open
- **THEN** the post is silently skipped (no crash)

### Requirement: WebSocket closes on scroll stop
The content script SHALL close the WebSocket connection when scrolling stops.

#### Scenario: Connection closed on stop
- **WHEN** `STOP_SCROLL` message is received
- **THEN** the WebSocket is closed with a normal closure code

### Requirement: Server handles post_seen messages
The server SHALL handle `post_seen` messages by logging the post to console.

#### Scenario: Post logged
- **WHEN** the server receives a `{ type: 'post_seen', post }` message
- **THEN** the post data is output to the server console

#### Scenario: Unknown message type ignored
- **WHEN** the server receives a message with an unrecognised type
- **THEN** it is silently ignored with no crash
