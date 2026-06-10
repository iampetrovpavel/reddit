## Why

The extension needs to simulate natural human browsing behavior on Reddit by automatically scrolling the feed in a way that mimics real reading patterns — variable scroll distances, irregular pauses, and occasional backtracking.

## What Changes

- New content script that runs on `reddit.com` and implements a randomized scroll loop
- New Start/Stop controls added to the ParseView in the sidepanel
- Messaging contract between sidepanel and content script for scroll control

## Capabilities

### New Capabilities

- `human-scrolling`: Randomized scroll loop in a content script that simulates human reading behavior (variable step sizes, random pauses, occasional upscrolls); controlled via extension messaging

### Modified Capabilities

- `parse-view`: ParseView gains Start/Stop scrolling controls wired to the human-scrolling capability

## Impact

- **New file**: `apps/extension/entrypoints/reddit.content.ts`
- **Modified file**: `apps/extension/entrypoints/sidepanel/views/ParseView.tsx`
- **Firefox MV2** manifest permissions: `tabs` (needed for `browser.tabs.query` + `browser.tabs.sendMessage`)
- No new dependencies required
