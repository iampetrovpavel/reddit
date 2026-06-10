## 1. Shared Types

- [x] 1.1 Add `Post` type `{ postId: string; title: string; url: string; imageUrl: string | null }` to `packages/shared/src/types.ts`
- [x] 1.2 Add `{ type: 'post_seen'; post: Post }` variant to `ClientMessage` union in `packages/shared/src/types.ts`

## 2. Server Handler

- [x] 2.1 Add `case 'post_seen'` to `SessionManager.handle()` in `apps/server/src/session-manager.ts` that calls `console.log('[post]', msg.post)`

## 3. Content Script — Post Observer

- [x] 3.1 Add `seenPostIds: Set<string>` and `observer: MutationObserver | null` variables to the content script module scope
- [x] 3.2 Implement `extractPost(article: Element): Post` — reads `data-post-id`, `aria-label`, `window.location.href`, and image via `article.querySelector('[slot="post-media-container"] img, [data-testid="post-thumbnail"] img')?.src ?? null`
- [x] 3.3 Implement `startObserver(ws: WebSocket)` — finds `shreddit-feed`, creates a `MutationObserver` watching `childList`, for each added `<article>` node: extract post, check deduplication, send `post_seen` over ws
- [x] 3.4 Implement `stopObserver()` — disconnects the observer, clears `seenPostIds`

## 4. Content Script — WebSocket Transport

- [x] 4.1 Add `ws: WebSocket | null` variable to module scope
- [x] 4.2 Implement `openWs(): WebSocket` — connects to `ws://localhost:${WS_PORT}`, attaches `onerror` logging, returns the socket
- [x] 4.3 Implement `closeWs()` — closes the socket if open, sets `ws = null`

## 5. Content Script — Wire Up Lifecycle

- [x] 5.1 In the `START_SCROLL` message handler: call `openWs()`, then `startObserver(ws)` after socket opens (`ws.onopen`)
- [x] 5.2 In the `STOP_SCROLL` message handler: call `stopObserver()`, then `closeWs()`
