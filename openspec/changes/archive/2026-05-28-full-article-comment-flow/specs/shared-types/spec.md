## ADDED Requirements

### Requirement: FullArticle and Comment types
`packages/shared` SHALL export a `Comment` type with `author: string` and `text: string`, and a `FullArticle` type with `title: string`, `body: string`, `author: string`, and `comments: Comment[]`.

#### Scenario: FullArticle type is usable in content script
- **WHEN** the content script imports `FullArticle` and `Comment` from `@redit/shared` and constructs an object matching the shape
- **THEN** TypeScript compiles without errors

### Requirement: article_seen client message
`ClientMessage` SHALL include a variant `{ type: 'article_seen'; sessionId: string; article: FullArticle }`.

#### Scenario: article_seen message compiles
- **WHEN** code constructs `{ type: 'article_seen', sessionId: 's', article: {...} }` and assigns it to `ClientMessage`
- **THEN** TypeScript accepts the assignment without errors

### Requirement: comment server message
`ServerMessage` SHALL include a variant `{ type: 'comment'; text: string }`.

#### Scenario: comment message compiles
- **WHEN** the server constructs `{ type: 'comment', text: 'hello' }` and assigns it to `ServerMessage`
- **THEN** TypeScript accepts the assignment without errors
