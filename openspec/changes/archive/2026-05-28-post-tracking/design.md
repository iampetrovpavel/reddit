## Context

The extension is a Firefox MV2 sidepanel + content script pair built with WXT. The server is a Bun WebSocket server that currently handles AI session messages. The shared `@redit/shared` package defines the message contract between extension and server.

Reddit's new `shreddit` layout appends `<article>` nodes to `<shreddit-feed>` as the user scrolls — these are the "new posts" to detect. The content script already manages the scroll loop; post observation runs alongside it.

## Goals / Non-Goals

**Goals:**
- Detect newly appended posts in the Reddit feed without polling
- Send minimal post data (`postId`, `title`, `url`) to the server per new post
- Extend the existing WebSocket protocol with a `post_seen` message — no new connection or endpoint
- Log received posts on the server console

**Non-Goals:**
- Capturing posts visible at page load before scrolling starts
- Tracking post engagement (clicks, votes)
- Persisting posts anywhere (database, file)
- Sending posts to a Claude session (next step, not this change)

## Decisions

### 1. MutationObserver over IntersectionObserver

**Decision**: Watch `shreddit-feed` for `childList` mutations to detect newly appended `<article>` nodes.

**Why**: Reddit's infinite scroll adds new posts to the DOM as the user nears the bottom. MutationObserver fires on DOM insertion — exactly "new post appeared." IntersectionObserver fires when an element enters the viewport, which would catch already-loaded posts scrolled into view and require attaching observers to every existing article on load.

### 2. WebSocket lifecycle tied to scroll session

**Decision**: Open the WebSocket in the content script when `START_SCROLL` is received; close it on `STOP_SCROLL`.

**Why**: The post observer is only meaningful when the user is actively scrolling with the extension running. Opening on page load would create a persistent connection even when the extension isn't in use. Tying to the scroll session keeps the connection intentional and bounded.

### 3. Extend existing `ClientMessage` union — no new endpoint

**Decision**: Add `{ type: 'post_seen', post: Post }` to the shared `ClientMessage` type. Handle it in `SessionManager.handle()`.

**Why**: The server already speaks one WebSocket protocol. Adding a new message type costs one `case` branch. A separate HTTP endpoint or second WebSocket would add infrastructure complexity for no benefit at this stage.

### 4. Deduplication in content script by `postId`

**Decision**: Maintain a `Set<string>` of seen post IDs in the content script. Skip sending if `postId` already in the set.

**Why**: MutationObserver can fire multiple times for the same node (e.g. Reddit re-renders parts of the feed). Without deduplication, the server would receive the same post repeatedly.

### 5. Server port via `WS_PORT` env var with default `3000`

**Decision**: Content script reads `import.meta.env.WXT_WS_PORT` (a WXT public env var) with fallback to `'3000'`.

**Why**: The server already uses `PORT` env var. Exposing the port to the extension via WXT's public env var mechanism (`WXT_` prefix) avoids hardcoding while keeping it configurable without a UI.

## Risks / Trade-offs

- **`shreddit-feed` not present on all Reddit pages** → Wrap observer setup in a null check; if the element doesn't exist, skip silently. Only feed pages (home, subreddits) have `shreddit-feed`.
- **Server not running when scroll starts** → WebSocket constructor throws / `onerror` fires. Catch and log; posts are lost but the scroll loop continues unaffected.
- **Memory leak if stop message never arrives** → Observer and WebSocket are tied to the `timerId` lifecycle. If the page navigates away, the content script context is invalidated by WXT and resources are cleaned up automatically.
- **Post DOM structure changes** → Reddit may rename attributes. `data-post-id` and `aria-label` on `<article>` are stable shreddit conventions but not guaranteed. Mitigation: graceful fallback to empty string rather than crashing.
