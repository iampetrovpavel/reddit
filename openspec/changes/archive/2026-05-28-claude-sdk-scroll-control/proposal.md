## Why

Posts are currently sent to the server and logged — nothing acts on them. Connecting Claude via the Anthropic SDK closes the loop: Claude evaluates each post and drives the scroll session, turning the extension into an autonomous Reddit browsing agent.

## What Changes

- The server's `ClaudeProvider` is fully implemented using `@anthropic-ai/sdk` (replacing the stub); each session maintains a `messages[]` conversation history so Claude retains context across posts.
- `post_seen` on the server now triggers a Claude call and sends a `command` response back to the extension.
- A new `command` variant is added to `ServerMessage` so the server can instruct the extension.
- The content script pauses the scroll loop when a post is sent and resumes only when Claude responds with `scroll`; `like` clicks the upvote button; `open` opens the post in a new tab.
- The content script starts the Claude session itself (via `new_session` on `ws.onopen`) — no sidepanel involvement.

## Capabilities

### New Capabilities

- `claude-session`: Anthropic SDK session lifecycle — start with system prompt from `persona.md`, accumulate `messages[]`, stream a response per user message, tear down on end.
- `claude-scroll-control`: Server-side orchestration — receive `post_seen`, call Claude, parse JSON command, send `command` ServerMessage back to extension.
- `command-handler`: Content script command handling — pause scroll on post send, act on received command (`scroll` / `like` / `open`), resume scroll loop.

### Modified Capabilities

- `scroll-control`: Scroll loop is no longer self-sustaining; it pauses after each post is sent and only resumes on a `scroll` command from the server.
- `post-transport`: `post_seen` is no longer a fire-and-forget log; it triggers a synchronous Claude call and a response back to the extension.

## Impact

- `packages/shared/src/types.ts` — new `{ type: 'command'; command: 'scroll' | 'like' | 'open' }` variant in `ServerMessage`
- `apps/server/src/providers/claude.ts` — full implementation replacing stub
- `apps/server/src/session-manager.ts` — `post_seen` case wired to Claude + response send
- `apps/server/package.json` — add `@anthropic-ai/sdk` dependency
- `apps/extension/entrypoints/reddit.content.ts` — pause/resume scroll, `ws.onmessage` handler
