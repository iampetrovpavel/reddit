## ADDED Requirements

### Requirement: Comment mode detection on article page
The content script SHALL enter comment mode when the current URL contains `/comments/` AND `sessionStorage` contains a `redit_state` entry with a `sessionId`. It SHALL immediately clear `sessionStorage` on entry to prevent re-triggering on manual refresh.

#### Scenario: Article page with session state enters comment mode
- **WHEN** the content script initialises on a URL containing `/comments/` and `sessionStorage.getItem('redit_state')` returns a JSON string with a `sessionId` field
- **THEN** the script enters comment mode, clears `sessionStorage`, and does NOT start the scroll loop

#### Scenario: Article page without session state stays idle
- **WHEN** the content script initialises on a URL containing `/comments/` and `sessionStorage.getItem('redit_state')` is null
- **THEN** the script neither enters comment mode nor starts the scroll loop

#### Scenario: List page is unaffected
- **WHEN** the content script initialises on a URL that does not contain `/comments/`
- **THEN** comment mode is not triggered regardless of sessionStorage contents

### Requirement: sessionStorage bridge written before navigation
The content script SHALL write `{ sessionId }` as JSON to `sessionStorage` under the key `redit_state` before executing `window.location.href` for the `open` command.

#### Scenario: State persists to article page
- **WHEN** the `open` command is received and the script sets `window.location.href` to the post URL
- **THEN** `sessionStorage.getItem('redit_state')` on the resulting article page contains the correct `sessionId`

### Requirement: Article payload sent to server
In comment mode, the content script SHALL open a WebSocket connection, wait for it to open, then send an `article_seen` message containing the `sessionId` and extracted `FullArticle` payload.

#### Scenario: article_seen sent on WS open
- **WHEN** the WebSocket connection opens in comment mode
- **THEN** the script sends `{ type: 'article_seen', sessionId, article }` where `article` contains title, body, author, and up to 5 depth-0 comments

### Requirement: Comment posted and page exited
After receiving a `{ type: 'comment', text }` message, the content script SHALL fill the comment composer, click submit, wait 2 seconds, then call `history.back()`. If the composer is not found within 3 seconds of page load, the script SHALL call `history.back()` without posting.

#### Scenario: Comment composed and submitted
- **WHEN** a `comment` server message is received and `shreddit-composer` is present in the DOM
- **THEN** the contenteditable div is focused, text is inserted via `execCommand('insertText')`, the submit button is clicked, and after 2 seconds `history.back()` is called

#### Scenario: Composer not found — back anyway
- **WHEN** 3 seconds elapse after page load and `shreddit-composer div[slot="rte"][contenteditable]` is not found in the DOM
- **THEN** `history.back()` is called without attempting to post
