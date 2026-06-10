## ADDED Requirements

### Requirement: Session starts with system prompt
The `ClaudeProvider` SHALL start a session by reading the system prompt file from disk and storing both the prompt text and an empty `messages[]` array keyed by session ID.

#### Scenario: Session created successfully
- **WHEN** `startSession('default')` is called
- **THEN** the server resolves `persona.md` to an absolute path, reads its contents, stores the session state, and returns a `Session` with a unique `sessionId`

### Requirement: Messages accumulate across posts
Each call to `sendMessage` SHALL append the user message and the assistant response to the session's `messages[]` array so Claude retains context across posts in a session.

#### Scenario: Second post sees first post in history
- **WHEN** `sendMessage` is called twice on the same session
- **THEN** the second API call includes both the first user+assistant turn and the second user message in `messages`

### Requirement: sendMessage returns parsed command
`sendMessage` SHALL call the Anthropic API with the accumulated messages and system prompt, and return the text content of the first response block.

#### Scenario: Claude returns valid JSON command
- **WHEN** Claude responds with `{"command":"scroll"}`
- **THEN** `sendMessage` resolves to the string `'{"command":"scroll"}'`

### Requirement: Session teardown removes state
`endSession` SHALL remove the session's state from the in-process map.

#### Scenario: Session cleaned up on end
- **WHEN** `endSession(sessionId)` is called
- **THEN** the session's messages and system prompt are removed from memory
