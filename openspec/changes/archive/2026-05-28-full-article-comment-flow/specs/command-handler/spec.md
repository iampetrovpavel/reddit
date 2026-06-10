## MODIFIED Requirements

### Requirement: open command navigates current tab
On receiving `command: 'open'`, the content script SHALL save the current `sessionId` to `sessionStorage` under the key `redit_state` as `JSON.stringify({ sessionId })`, then navigate the current tab to the post URL via `window.location.href`. It SHALL NOT resume the scroll loop after navigating.

#### Scenario: sessionStorage written before navigation
- **WHEN** `{ type: 'command', command: 'open' }` is received and `currentPost` has a URL
- **THEN** `sessionStorage.getItem('redit_state')` contains `{ sessionId }` and `window.location.href` is set to the post URL

#### Scenario: Scroll loop not resumed after open
- **WHEN** `{ type: 'command', command: 'open' }` is received
- **THEN** `scheduleNext()` is NOT called

## ADDED Requirements

### Requirement: Content script handles comment server message
The content script SHALL handle `{ type: 'comment', text }` messages received on the WebSocket in comment mode.

#### Scenario: Non-empty comment text triggers post flow
- **WHEN** `{ type: 'comment', text: 'some comment' }` is received in comment mode
- **THEN** the content script attempts to fill and submit the composer, waits 2 seconds, then calls `history.back()`

#### Scenario: Empty comment text triggers back only
- **WHEN** `{ type: 'comment', text: '' }` is received in comment mode
- **THEN** the content script calls `history.back()` without attempting to fill the composer
