## Why

When the bot decides a post is worth engaging with, it currently just navigates to the article and stops — there's no follow-through. Sending a comment based on the full article content is the core engagement action the bot exists to perform.

## What Changes

- After `open` command, save `sessionId` to `sessionStorage` before navigating
- On article pages (`/comments/` URL), enter **comment mode**: extract post + top 5 comments, send to server, receive generated comment, post it, then navigate back
- New `article_seen` client message carries full article payload with `sessionId`
- New `comment` server message carries generated comment text
- Server adds `processArticle` handler; Claude responds with `{"comment":"..."}` at higher token limit (~300)
- Shared types extended: `FullArticle`, `Comment`, updated `ClientMessage` and `ServerMessage` unions

## Capabilities

### New Capabilities

- `article-comment-flow`: End-to-end flow from article page load → content extraction → comment generation → comment posting → back navigation
- `article-extractor`: DOM extraction of post title, body, author, and top-level comments from Reddit's shreddit article page

### Modified Capabilities

- `shared-types`: Add `FullArticle`, `Comment` types; extend `ClientMessage` with `article_seen`; extend `ServerMessage` with `comment`
- `post-transport`: Extend server-side message handling to process `article_seen` and route to article comment generation
- `command-handler`: Extend content script to handle `comment` server message and perform DOM interaction (fill input, submit, wait, back)

## Impact

- `packages/shared/src/types.ts` — new types and message variants
- `apps/server/src/session-manager.ts` — new `processArticle` handler
- `apps/server/src/providers/claude.ts` — higher `max_tokens` for article path
- `apps/extension/entrypoints/reddit.content.ts` — sessionStorage bridge + comment mode logic
