## Context

The extension is a Firefox MV2 sidepanel built with WXT + React. The sidepanel runs in an isolated browser context and cannot directly manipulate the active tab's DOM. Reddit's new `shreddit` layout scrolls the main `window` (no custom scroll container), so `window.scrollBy()` is the correct scroll target.

There is currently no content script in the extension. WXT auto-discovers entrypoints by filename convention — a file named `*.content.ts` in `entrypoints/` is automatically registered as a content script.

## Goals / Non-Goals

**Goals:**
- Scroll the active Reddit tab in a human-like pattern when triggered from the sidepanel
- Start/Stop control from ParseView with visible disabled state
- Self-contained module — no new dependencies

**Non-Goals:**
- Configurable scroll speed/range (hardcoded for now)
- Scroll behavior on non-Reddit sites
- Scroll position persistence across page loads

## Decisions

### 1. Scroll via content script + messaging (not scripting API)

**Decision**: Content script registers a `browser.runtime.onMessage` listener; ParseView sends `{type: 'START_SCROLL'}` / `{type: 'STOP_SCROLL'}` via `browser.tabs.sendMessage`.

**Alternatives considered**:
- `browser.scripting.executeScript` — requires `scripting` permission (MV3 only in Firefox); not suitable for MV2
- Shared background script relay — unnecessary indirection; direct sidepanel→content messaging works fine

### 2. `window.scrollBy` with `behavior: 'smooth'`

**Decision**: Use `window.scrollBy({ top: dy, behavior: 'smooth' })` on each step.

Reddit's shreddit layout scrolls the root window (confirmed via `sample.html` — no `overflow-y: scroll` on any feed container). `smooth` behavior adds micro-easing within each step, reinforcing the human appearance.

### 3. Single `setTimeout` chain (not `setInterval`)

**Decision**: Each scroll step schedules the next via `setTimeout` with a freshly drawn random delay, rather than using `setInterval`.

**Why**: `setInterval` fires at a fixed cadence regardless of scroll duration. Chained `setTimeout` naturally produces variable gaps that include the scroll duration itself, preventing overlapping calls and giving more realistic timing.

### 4. Randomness profile (hardcoded)

| Case | Probability | Distance | Delay after |
|------|-------------|----------|-------------|
| Normal scroll | 77% | 80–300 px down | 400–1500 ms |
| Big jump | 15% | 400–700 px down | 400–1500 ms |
| Upscroll | 8% | 20–60 px up | 400–1500 ms |

Values chosen to mimic a casual reader on a feed page. Delay applies uniformly regardless of case — the randomness in distance + pause combination produces sufficient variation.

### 5. `tabs` permission for `browser.tabs.query`

**Decision**: Add `"tabs"` to manifest permissions in `wxt.config.ts`.

ParseView needs to find the active tab's ID before sending a message. `browser.tabs.query({ active: true, currentWindow: true })` requires the `tabs` permission in Firefox MV2.

## Risks / Trade-offs

- **Content script not injected yet when button clicked** → The content script is injected on page load. If the user opens the sidepanel before navigating to Reddit, the first `sendMessage` will fail silently. Mitigation: catch the error in ParseView and surface a status message ("Navigate to Reddit first").
- **Tab ID mismatch if user switches tabs** → The scroll loop runs in the content script of whatever tab was active at Start time. If the user switches tabs, Stop must still target the correct tab. Mitigation: store the tab ID in ParseView state alongside `isScrolling`.
