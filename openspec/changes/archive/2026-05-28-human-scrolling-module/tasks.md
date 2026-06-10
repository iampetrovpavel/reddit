## 1. Manifest Permissions

- [x] 1.1 Add `"tabs"` to `manifest.permissions` in `apps/extension/wxt.config.ts`

## 2. Content Script

- [x] 2.1 Create `apps/extension/entrypoints/reddit.content.ts` with `defineContentScript` matching `*://*.reddit.com/*`
- [x] 2.2 Implement `rand(min, max)` helper returning a random integer in range
- [x] 2.3 Implement the `scheduleNext()` recursive timeout loop: draw random delay, draw scroll distance by weighted probability (77% normal 80–300px, 15% big 400–700px, 8% upscroll 20–60px), call `window.scrollBy({ top: dy, behavior: 'smooth' })`, reschedule
- [x] 2.4 Add `browser.runtime.onMessage` listener: `START_SCROLL` starts the loop if not running; `STOP_SCROLL` clears the timer

## 3. ParseView Controls

- [x] 3.1 Add `isScrolling: boolean` and `activeTabId: number | null` state to `ParseView`
- [x] 3.2 Implement `handleStart`: query active tab via `browser.tabs.query({ active: true, currentWindow: true })`, send `START_SCROLL` message, update state — wrap in try/catch for missing content script
- [x] 3.3 Implement `handleStop`: send `STOP_SCROLL` to stored `activeTabId`, reset state
- [x] 3.4 Render "Start Scrolling" button (disabled when `isScrolling`) and "Stop Scrolling" button (disabled when `!isScrolling`)
