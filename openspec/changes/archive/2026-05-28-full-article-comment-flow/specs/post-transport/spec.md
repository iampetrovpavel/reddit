## ADDED Requirements

### Requirement: Server handles article_seen by generating a comment
The server SHALL handle `article_seen` messages by calling Claude with the full article payload and sending a `{ type: 'comment', text }` response when Claude returns `{"comment":"..."}` JSON.

#### Scenario: article_seen triggers comment generation and response
- **WHEN** the server receives `{ type: 'article_seen', sessionId, article }` over the WebSocket
- **THEN** the server calls `provider.sendMessage` with the serialized article, parses `{"comment":"..."}` from the response, and sends `{ type: 'comment', text }` back

#### Scenario: Unparseable Claude response falls back to history.back signal
- **WHEN** Claude's response cannot be parsed as `{"comment":"..."}` JSON
- **THEN** the server logs a warning and sends `{ type: 'comment', text: '' }` (empty text triggers the back-only path in the content script)

### Requirement: Claude max_tokens increased for article path
The server SHALL use a `max_tokens` of at least 300 when calling Claude for `article_seen` processing, independently of the 64-token limit used for `post_seen` commands.

#### Scenario: Article response allows longer output
- **WHEN** Claude is called during `article_seen` processing
- **THEN** the API call is made with `max_tokens >= 300`
