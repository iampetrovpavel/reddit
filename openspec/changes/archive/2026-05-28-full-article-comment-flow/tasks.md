## 1. Shared Types

- [x] 1.1 Add `Comment` type (`author: string`, `text: string`) to `packages/shared/src/types.ts`
- [x] 1.2 Add `FullArticle` type (`title`, `body`, `author`, `comments: Comment[]`) to `packages/shared/src/types.ts`
- [x] 1.3 Add `article_seen` variant to `ClientMessage` union (`{ type: 'article_seen'; sessionId: string; article: FullArticle }`)
- [x] 1.4 Add `comment` variant to `ServerMessage` union (`{ type: 'comment'; text: string }`)

## 2. Server — Article Processing

- [x] 2.1 Add `processArticle` method to `SessionManager` that calls `provider.sendMessage` and parses `{"comment":"..."}` JSON from the response
- [x] 2.2 Add `case 'article_seen'` to `SessionManager.handle()` that dispatches to `processArticle` and sends `{ type: 'comment', text }` response
- [x] 2.3 Add a `max_tokens` parameter to `AIProvider.sendMessage` (or a separate method) and pass 300 for the article path in `ClaudeProvider`

## 3. Content Script — sessionStorage Bridge

- [x] 3.1 In `handleCommand`, before `window.location.href = post.url` for `open`, write `sessionStorage.setItem('redit_state', JSON.stringify({ sessionId }))` and remove the `scheduleNext()` call

## 4. Content Script — Article Extraction

- [x] 4.1 Implement `extractArticle(): FullArticle` function that queries `shreddit-post h1[slot="title"]`, `shreddit-post-text-body div[id*="post-rtjson-content"] p`, `shreddit-post[author]`, and up to 5 `shreddit-comment[depth="0"]` elements

## 5. Content Script — Comment Mode

- [x] 5.1 At script startup, detect comment mode: URL contains `/comments/` AND `sessionStorage.getItem('redit_state')` is non-null; parse and clear sessionStorage immediately
- [x] 5.2 In comment mode, open a WebSocket and on open send `{ type: 'article_seen', sessionId, article: extractArticle() }`
- [x] 5.3 Handle `{ type: 'comment', text }` on `ws.onmessage`: if `text` is non-empty, run the composer fill + submit flow; always call `history.back()` after 2 seconds
- [x] 5.4 Implement composer fill: poll up to 3s for `shreddit-composer div[slot="rte"][contenteditable="true"]`, then focus + `document.execCommand('insertText', false, text)` + click `#comment-composer-submit-button`
- [x] 5.5 Add 3-second composer-not-found timeout that calls `history.back()` without posting
