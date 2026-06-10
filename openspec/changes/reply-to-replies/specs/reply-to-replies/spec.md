## ADDED Requirements

### Requirement: Find bot comment on page
The content script SHALL locate the first `shreddit-comment` element with `author="Right-Programmer6076"` and `depth="0"` in the current document when a `REPLY_TO_REPLIES` message is received.

#### Scenario: Bot comment found
- **WHEN** the page contains a `shreddit-comment[author="Right-Programmer6076"][depth="0"]`
- **THEN** the content script retrieves its `thingid` attribute and extracts its text content

#### Scenario: No bot comment on page
- **WHEN** no `shreddit-comment[author="Right-Programmer6076"]` exists in the document
- **THEN** the content script sends `{ type: 'REPLY_STATUS', status: 'no-bot-comment' }` back to the sidebar and aborts

### Requirement: Find first reply to bot comment
The content script SHALL locate the first `shreddit-comment` element whose `parentid` attribute matches the bot comment's `thingid`.

#### Scenario: Reply found
- **WHEN** a `shreddit-comment[parentid="<botThingId>"]` exists
- **THEN** the content script retrieves its `thingid`, `author`, and text content

#### Scenario: No replies yet
- **WHEN** no `shreddit-comment` has `parentid` matching the bot's `thingid`
- **THEN** the content script sends `{ type: 'REPLY_STATUS', status: 'no-replies' }` back to the sidebar and aborts

### Requirement: Send reply context to server
The content script SHALL open a WebSocket connection to the server and send a `reply_seen` message containing the article title, bot's comment text, replier's author, and replier's comment text.

#### Scenario: reply_seen message sent
- **WHEN** both the bot comment and a reply are found
- **THEN** the content script sends `{ type: 'reply_seen', articleTitle, botComment, replierAuthor, replyText }` over the WebSocket

### Requirement: Post reply using composer
Upon receiving a `reply_answer` message, the content script SHALL unhide `comment-composer-host[parent-id="<replyThingId>"]`, wait for the contenteditable area to appear, type the reply text via injected `<script>` using `execCommand('insertText')`, and click `#comment-composer-submit-button`.

#### Scenario: Reply typed and submitted
- **WHEN** the content script receives `{ type: 'reply_answer', text: '...' }`
- **THEN** the reply text appears in the composer scoped to the reply comment and the submit button is clicked

#### Scenario: Composer not found within timeout
- **WHEN** `comment-composer-host[parent-id="<replyThingId>"]` does not produce a visible contenteditable within 10 seconds
- **THEN** the content script sends `{ type: 'REPLY_STATUS', status: 'composer-timeout' }` and aborts

### Requirement: Reply-persona Claude prompt
The server SHALL use a dedicated `reply-persona.md` system prompt when processing `reply_seen` messages. The prompt SHALL instruct Claude to respond as Jason to a person who replied to his Reddit comment. Input shape: `{ articleTitle, botComment, replierAuthor, replyText }`. Output shape: `{"reply":"..."}`. The same ASCII-only, 1-2 sentence, casual style rules from the main persona SHALL apply.

#### Scenario: Reply generated in persona
- **WHEN** `processReply` sends the context JSON to Claude with `reply-persona.md`
- **THEN** the response is a valid JSON object with a `reply` string field containing only ASCII characters
