## Why

The bot (Right-Programmer6076) posts comments on articles, but when real users reply to those comments the bot goes silent — breaking the illusion of a human account. Responding to replies closes the engagement loop and makes the persona more believable.

## What Changes

- Add a **"Reply to Replies"** button to ParseView in the extension sidebar
- New `reply_seen` client message type carrying article title, bot's own comment, replier's author and text
- New `reply_answer` server message type carrying the generated reply text
- New `reply-persona.md` system prompt instructing Claude to respond as Jason to someone who replied to his comment
- New `processReply` handler in `SessionManager` that creates a one-shot Claude session and returns the reply
- New `REPLY_TO_REPLIES` content-script handler that extracts the bot comment + first reply, calls the server, then types and submits the reply using the existing composer manipulation pattern

## Capabilities

### New Capabilities

- `reply-to-replies`: Finds the bot's comment and its first reply on a Reddit comments page, generates a contextual response via Claude, and posts it as a reply to the replier using the existing composer injection mechanism.

### Modified Capabilities

- `parse-view`: Button and status display added for the reply-to-replies action.
- `shared-types`: New `reply_seen` and `reply_answer` message variants added to `ClientMessage` and `ServerMessage` unions.

## Impact

- `packages/shared/src/types.ts` — new union members
- `apps/server/src/reply-persona.md` — new file
- `apps/server/src/session-manager.ts` — new `reply_seen` case + `processReply` method
- `apps/extension/entrypoints/reddit.content.ts` — new `REPLY_TO_REPLIES` message handler
- `apps/extension/entrypoints/sidepanel/views/ParseView.tsx` — new button + status
