## Why

The extension needs to observe which Reddit posts the user scrolls past and stream them to the server — this is the data ingestion layer that will eventually feed posts into Claude AI sessions for analysis.

## What Changes

- New `post_seen` message type added to the shared `ClientMessage` union
- Content script gains a `MutationObserver` that detects newly loaded posts in `shreddit-feed`, extracts minimal post data, and sends each post to the server via WebSocket
- WebSocket connection opens when `START_SCROLL` begins and closes when `STOP_SCROLL` is received
- Post deduplication by `postId` prevents duplicate sends on re-renders
- Server handles `post_seen` messages by logging posts to console

## Capabilities

### New Capabilities

- `post-observer`: MutationObserver in the content script that detects new `<article>` nodes added to `<shreddit-feed>`, extracts `{postId, title, url}`, deduplicates, and sends to server
- `post-transport`: WebSocket connection from content script to server, lifecycle tied to scroll session (open on start, close on stop)

### Modified Capabilities

- `scroll-control`: Scroll start/stop now also opens/closes the WebSocket connection to the server in addition to controlling the scroll loop

## Impact

- **Modified**: `packages/shared/src/types.ts` — new `post_seen` variant in `ClientMessage`
- **Modified**: `apps/server/src/session-manager.ts` — new `case 'post_seen'` that `console.log`s the post
- **Modified**: `apps/extension/entrypoints/reddit.content.ts` — MutationObserver + WebSocket management
- Server port read from `WS_PORT` env var in the content script (hardcoded default `3000`)
- No new npm dependencies required
