## Context

The extension already has a full round-trip for posting top-level comments: scroll feed → open article → `article_seen` WS message → Claude generates comment → content script types + submits via `comment-composer-host`. The reply flow is structurally identical but targets a nested `comment-composer-host[parent-id="<replyThingId>"]` instead of the top-level one, and the input to Claude is different (bot's own comment + replier's text rather than the article body).

Reddit's shreddit comment tree structure relevant to this feature:
```
shreddit-comment[author="Right-Programmer6076", depth="0", thingid="t1_xxx"]
  └── shreddit-comment[depth="1", parentid="t1_xxx", thingid="t1_yyy", author="Replier"]
       ├── shreddit-comment-action-row[comment-id="t1_yyy"]
       └── comment-composer-host[parent-id="t1_yyy"]   ← typing target
```

Both the bot comment and the reply comment are in the light DOM (slotted into shadow via `slot="children-..."` attributes), so standard `document.querySelector` works.

## Goals / Non-Goals

**Goals:**
- One-click reply to the first reply on the bot's comment
- Claude generates a contextual, in-persona response (same Jason voice, ASCII-only, 1-2 sentences)
- Reuse the existing composer manipulation + execCommand injection pattern verbatim
- Status feedback in ParseView (idle / working / done / error)

**Non-Goals:**
- Replying to multiple replies (only the first child comment of the bot's comment)
- Handling the case where the bot has no comment yet on the page (button does nothing or shows error)
- Persisting reply history
- Navigating to the article page first (user must already be on a `/comments/` URL)

## Decisions

### D1 — New `reply_seen` message type vs. reusing `article_seen`

**Decision:** New dedicated `reply_seen` / `reply_answer` message pair.

**Rationale:** `article_seen` carries `FullArticle` (title, body, author, top comments) and requires a pre-existing `sessionId` from the scroll flow. The reply use case needs different fields (bot's comment text, replier's text, replier's author) and is fully self-contained — no prior session exists. Reusing `article_seen` would require either bending its schema or coupling the reply flow to the scroll session lifecycle. A dedicated type keeps each flow independent.

### D2 — Session lifecycle for reply generation

**Decision:** `processReply` creates and destroys a one-shot internal Claude session (not exposed to the client).

**Rationale:** The reply needs its own system prompt (`reply-persona.md`) distinct from the scroll persona. Creating a session internally avoids adding a new `new_session` round-trip to the client and keeps the WS exchange to two messages: `reply_seen` → `reply_answer`.

### D3 — Composer activation: unhide vs. click Reply button

**Decision:** Use the same `composerHost` unhide approach as the existing `postAndBack`, scoped to `comment-composer-host[parent-id="${replyThingId}"]`.

**Rationale:** The existing approach (remove `nd:hidden`, set `display:block`, strip `slot` from `faceplate-form[slot="ready"]`, force-show shreddit-composer shadow elements) is already proven. Clicking the Reply button would require shadow DOM traversal into `shreddit-comment-action-row` and risks the button not being visible in the viewport. The unhide approach bypasses UI interaction entirely.

The injected `<script>` for typing must scope its composer query:
```js
var composerHost = document.querySelector('comment-composer-host[parent-id="' + replyThingId + '"]');
var el = composerHost && composerHost.querySelector('div[slot="rte"][contenteditable="true"]');
```
This avoids accidentally targeting a different open composer on the page.

### D4 — Reply persona system prompt

**Decision:** New `reply-persona.md` file alongside `persona.md`.

**Rationale:** The input shape and task differ from Mode 1 (post eval) and Mode 2 (comment generation). A separate file avoids cramming a third mode into an already long prompt and keeps each prompt focused. Same Jason identity and style rules apply; output format is `{"reply":"..."}`.

## Risks / Trade-offs

**[Risk] `comment-composer-host` for the reply comment may not have a pre-rendered `shreddit-composer` inside it** (Reddit lazy-renders reply composers on button click) → Mitigation: `waitForComposer` already polls up to 10 s; scope the poll to `composerHost.querySelector(...)`. If nothing appears within timeout, surface an error status in ParseView.

**[Risk] Page has no bot comment** (user triggers the button on a post the bot never commented on) → Mitigation: content script sends `{ type: 'REPLY_STATUS', status: 'no-bot-comment' }` back to the sidebar; ParseView shows an error message.

**[Risk] Bot comment has no replies yet** → Same mitigation as above with status `'no-replies'`.

**[Risk] Multiple `shreddit-composer` elements visible simultaneously** (e.g. user has another composer open) → Mitigated by D3: we scope the composer query to the specific `comment-composer-host[parent-id]`.

## Migration Plan

No migration required. All changes are additive:
- New union members in shared types are backward-compatible
- New WS message types are ignored by old clients/servers
- New server handler is a new switch case
- New button is additive to ParseView

Rollback: revert the 5 changed files.

## Open Questions

- Should the button be disabled (greyed out) when the active tab is not on a `/comments/` URL? Currently proposed as always-enabled with an error status if triggered on the wrong page — simpler to implement.
