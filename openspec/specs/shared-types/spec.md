# Spec: shared-types

## Requirement: WebSocket message protocol types
The `packages/shared` package SHALL export TypeScript discriminated union types for all WebSocket messages exchanged between the extension and server. Client-to-server messages SHALL be `ClientMessage`. Server-to-client messages SHALL be `ServerMessage`. All message types defined in the design SHALL be covered.

### Scenario: Client message types compile
- **WHEN** the extension imports `ClientMessage` from `@redit/shared` and constructs a `{ type: 'send', sessionId, content }` object
- **THEN** TypeScript accepts the assignment without type errors

### Scenario: Server message types compile
- **WHEN** the server imports `ServerMessage` from `@redit/shared` and sends a `{ type: 'chunk', sessionId, content }` object
- **THEN** TypeScript accepts the assignment without type errors

### Scenario: Invalid message type rejected
- **WHEN** code constructs a message with an unknown `type` field and assigns it to `ClientMessage` or `ServerMessage`
- **THEN** TypeScript emits a compile-time error

### Requirement: Session type
The `packages/shared` package SHALL export a `Session` type representing an active AI session, containing at minimum `sessionId: string` and `systemPromptPath: string`.

### Scenario: Session type is usable
- **WHEN** `SessionManager` imports `Session` from `@redit/shared` and uses it to type its internal map
- **THEN** TypeScript compiles without errors

### Requirement: No runtime dependencies
`packages/shared` SHALL have zero runtime dependencies. It SHALL be a types-only package. Its `package.json` SHALL declare no `dependencies` (only `devDependencies` for TypeScript tooling if needed).

### Scenario: Shared package has no runtime deps
- **WHEN** `packages/shared/package.json` is inspected
- **THEN** the `dependencies` field is absent or empty

### Requirement: Workspace package naming
The shared package SHALL be named `@redit/shared` in its `package.json`. Both `apps/extension` and `apps/server` SHALL declare it as a dependency using the pnpm workspace protocol (`workspace:*`).

### Scenario: Extension resolves shared types
- **WHEN** `apps/extension` imports from `@redit/shared`
- **THEN** TypeScript resolves the import to `packages/shared/src/index.ts` without errors

## Requirement: FullArticle and Comment types
`packages/shared` SHALL export a `Comment` type with `author: string` and `text: string`, and a `FullArticle` type with `title: string`, `body: string`, `author: string`, and `comments: Comment[]`.

### Scenario: FullArticle type is usable in content script
- **WHEN** the content script imports `FullArticle` and `Comment` from `@redit/shared` and constructs an object matching the shape
- **THEN** TypeScript compiles without errors

## Requirement: article_seen client message
`ClientMessage` SHALL include a variant `{ type: 'article_seen'; sessionId: string; article: FullArticle }`.

### Scenario: article_seen message compiles
- **WHEN** code constructs `{ type: 'article_seen', sessionId: 's', article: {...} }` and assigns it to `ClientMessage`
- **THEN** TypeScript accepts the assignment without errors

## Requirement: comment server message
`ServerMessage` SHALL include a variant `{ type: 'comment'; text: string }`.

### Scenario: comment message compiles
- **WHEN** the server constructs `{ type: 'comment', text: 'hello' }` and assigns it to `ServerMessage`
- **THEN** TypeScript accepts the assignment without errors
