## ADDED Requirements

### Requirement: Bun WebSocket server
The server SHALL start a Bun HTTP server with WebSocket upgrade support on a configurable port (default `3000`, overridable via `PORT` env var). The server SHALL accept WebSocket connections from the extension sidebar.

#### Scenario: Server starts on default port
- **WHEN** the server is started without a `PORT` env var
- **THEN** it listens on port 3000 and logs the port to stdout

#### Scenario: Server starts on custom port
- **WHEN** the server is started with `PORT=4000`
- **THEN** it listens on port 4000

#### Scenario: WebSocket connection accepted
- **WHEN** a client opens a WebSocket connection to the server
- **THEN** the connection is accepted and the server is ready to receive messages

### Requirement: AIProvider interface
The server SHALL define an `AIProvider` TypeScript interface with three methods: `startSession`, `sendMessage` (returning `AsyncIterable<string>`), and `endSession`. All provider implementations SHALL conform to this interface. `SessionManager` SHALL depend only on `AIProvider`, not on any concrete implementation.

#### Scenario: Provider is swappable
- **WHEN** a different `AIProvider` implementation is passed to `SessionManager`
- **THEN** session behavior is governed by the new provider without changes to `SessionManager` or the WebSocket layer

### Requirement: SessionManager
The server SHALL include a `SessionManager` class that maps `sessionId` strings to active `AIProvider` sessions. It SHALL handle `new_session`, `send`, and `end_session` message types and delegate to the injected `AIProvider`.

#### Scenario: New session creation
- **WHEN** the server receives `{ type: 'new_session', systemPromptPath }` from a client
- **THEN** `SessionManager` calls `provider.startSession(systemPromptPath)`, stores the session, and sends `{ type: 'session_created', sessionId }` back to the client

#### Scenario: Message forwarding
- **WHEN** the server receives `{ type: 'send', sessionId, content }` from a client
- **THEN** `SessionManager` calls `provider.sendMessage(sessionId, content)`, streams each chunk as `{ type: 'chunk', sessionId, content }`, and sends `{ type: 'done', sessionId }` when the iterable is exhausted

#### Scenario: Session teardown
- **WHEN** the server receives `{ type: 'end_session', sessionId }` from a client
- **THEN** `SessionManager` calls `provider.endSession(sessionId)` and removes the session from its map

#### Scenario: Unknown session error
- **WHEN** the server receives a `send` or `end_session` message with an unrecognized `sessionId`
- **THEN** the server sends `{ type: 'error', sessionId, message: 'session not found' }` and does not crash

### Requirement: StubProvider scaffold
The server SHALL include a `StubProvider` that implements `AIProvider` without spawning any subprocess. `startSession` SHALL resolve immediately, `sendMessage` SHALL echo the input content back as a single chunk, and `endSession` SHALL resolve immediately. `StubProvider` SHALL be the default provider used when the server starts.

#### Scenario: Echo response
- **WHEN** the extension sends `{ type: 'send', content: 'hello' }` and `StubProvider` is active
- **THEN** the server streams `{ type: 'chunk', content: 'hello' }` followed by `{ type: 'done' }`

### Requirement: ClaudeProvider scaffold
The server SHALL include a `ClaudeProvider` class that implements `AIProvider`. In the scaffold, the spawn call SHALL be a no-op (the class exists but does not actually invoke the `claude` binary). The interface implementation SHALL be complete so real subprocess logic can be filled in later without interface changes.

#### Scenario: ClaudeProvider implements AIProvider
- **WHEN** `ClaudeProvider` is instantiated and passed to `SessionManager`
- **THEN** TypeScript compiles without errors (interface satisfied)
