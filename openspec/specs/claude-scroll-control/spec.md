# Spec: claude-scroll-control

## Requirement: post_seen triggers Claude evaluation
When the server receives a `post_seen` message, it SHALL forward the post data to Claude as a JSON user message and wait for a response.

### Scenario: Post forwarded to Claude
- **WHEN** the server receives `{ type: 'post_seen', post }` for an active session
- **THEN** `provider.sendMessage(sessionId, JSON.stringify(post))` is called

## Requirement: Claude command sent back to extension
After Claude responds, the server SHALL parse the JSON response and send a `command` ServerMessage to the extension over the same WebSocket.

### Scenario: Valid command returned
- **WHEN** Claude responds with `{"command":"scroll"}`
- **THEN** the server sends `{ type: 'command', command: 'scroll' }` to the extension

### Scenario: Malformed JSON from Claude
- **WHEN** Claude returns text that is not valid JSON or lacks a `command` field
- **THEN** the server sends `{ type: 'command', command: 'scroll' }` as a safe fallback and logs a warning

## Requirement: post_seen requires active session
The server SHALL only process `post_seen` if a session exists for the message's implied session context; otherwise it SHALL log an error and send no command.

### Scenario: No active session
- **WHEN** `post_seen` is received but no session is active
- **THEN** an error is logged and no `command` message is sent to the extension
