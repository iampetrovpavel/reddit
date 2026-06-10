## 1. Shared Types

- [x] 1.1 Add `{ type: 'reply_seen'; articleTitle: string; botComment: string; replierAuthor: string; replyText: string }` to `ClientMessage` union in `packages/shared/src/types.ts`
- [x] 1.2 Add `{ type: 'reply_answer'; text: string }` to `ServerMessage` union in `packages/shared/src/types.ts`

## 2. Server — Reply Persona

- [x] 2.1 Create `apps/server/src/reply-persona.md` — same Jason identity and ASCII/style rules, Mode: reply to a Reddit comment reply. Input shape: `{ articleTitle, botComment, replierAuthor, replyText }`. Output: `{"reply":"..."}`. 1-2 sentences max, casual tone.

## 3. Server — Session Manager

- [x] 3.1 Add `reply_seen` case to the `switch` in `SessionManager.handle()` that calls `this.processReply(msg, send)`
- [x] 3.2 Implement `processReply` method: start a one-shot session with `reply-persona.md`, call `this.provider.sendMessage` with the context JSON, parse `{"reply":"..."}`, apply `toAscii`, send `{ type: 'reply_answer', text }`, end the session

## 4. Content Script — REPLY_TO_REPLIES Handler

- [x] 4.1 Add `REPLY_TO_REPLIES` branch inside the `browser.runtime.onMessage.addListener` callback
- [x] 4.2 Extract article title (`shreddit-post h1[slot="title"]`), bot comment element (`shreddit-comment[author="Right-Programmer6076"]`), and bot's comment text (same `div[id*="post-rtjson-content"] p` pattern as `extractArticle`)
- [x] 4.3 Find first reply: `shreddit-comment[parentid="${botThingId}"]` — get `author`, `thingid`, and text; send `REPLY_STATUS` error and return early if bot comment or reply not found
- [x] 4.4 Open WebSocket, send `reply_seen` message with extracted context
- [x] 4.5 On `reply_answer`: unhide `comment-composer-host[parent-id="${replyThingId}"]` using the same manipulation steps as `postAndBack` (remove `nd:hidden`, set `display:block`, strip `slot` from inner `faceplate-form[slot="ready"]`, force-show shreddit-composer shadow elements)
- [x] 4.6 Call `waitForComposer` scoped to the reply's composer host; send `REPLY_STATUS` error and abort if it times out
- [x] 4.7 Inject `<script>` that scopes the contenteditable query to `comment-composer-host[parent-id="${replyThingId}"] div[slot="rte"][contenteditable="true"]` and types text character-by-character via `execCommand('insertText')`
- [x] 4.8 Click `#comment-composer-submit-button` after typing; send `{ type: 'REPLY_STATUS', status: 'done' }` back to sidebar via `browser.tabs.sendMessage`

## 5. ParseView — Button and Status

- [x] 5.1 Add `isReplying` state and `replyStatus` string state to `ParseView`
- [x] 5.2 Implement `handleReply` async function: set `isReplying = true`, send `REPLY_TO_REPLIES` to active tab, listen for `REPLY_STATUS` message back, update `replyStatus`, set `isReplying = false`
- [x] 5.3 Render "Reply to Replies" button (disabled when `isReplying`) and a status paragraph below it
