## ADDED Requirements

### Requirement: reply_seen client message
`ClientMessage` SHALL include a variant `{ type: 'reply_seen'; articleTitle: string; botComment: string; replierAuthor: string; replyText: string }`.

#### Scenario: reply_seen message compiles
- **WHEN** the content script constructs `{ type: 'reply_seen', articleTitle: 'x', botComment: 'y', replierAuthor: 'z', replyText: 'w' }` and assigns it to `ClientMessage`
- **THEN** TypeScript accepts the assignment without errors

### Requirement: reply_answer server message
`ServerMessage` SHALL include a variant `{ type: 'reply_answer'; text: string }`.

#### Scenario: reply_answer message compiles
- **WHEN** the server constructs `{ type: 'reply_answer', text: 'hello' }` and assigns it to `ServerMessage`
- **THEN** TypeScript accepts the assignment without errors
