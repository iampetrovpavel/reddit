## Why

A Firefox sidebar extension needs a local server that bridges user input to Claude CLI, streaming AI responses back in real time. Standing up the right monorepo skeleton now prevents structural debt and ensures the extension, server, and shared types can evolve independently without coupling.

## What Changes

- **New** `apps/extension` — WXT-based Firefox extension with a sidebar entrypoint; two empty React placeholder views (Chat, Settings) toggled by local state
- **New** `apps/server` — Bun HTTP + WebSocket server; manages Claude CLI sessions via stdin/stdout pipes, streams responses to connected sidebar clients
- **New** `packages/shared` — TypeScript types for the WebSocket message protocol and session model, consumed by both apps
- **New** repo root — pnpm workspace, turborepo pipeline, pnpm catalog for pinned shared dep versions

## Capabilities

### New Capabilities

- `monorepo-workspace`: pnpm workspace + turborepo config wiring all packages together with `build` and `dev` pipelines
- `extension-sidebar`: WXT Firefox sidebar entrypoint with React, two empty placeholder views (Chat, Settings) rendered via view-state toggle
- `server-core`: Bun WebSocket server with session management scaffolding and a provider abstraction layer for AI backends
- `shared-types`: TypeScript package defining the WebSocket message protocol and session types shared between extension and server

### Modified Capabilities

## Impact

- **New dependencies**: pnpm, turborepo, bun, wxt, react, vite, typescript
- **No existing code affected** — greenfield project
- **Firefox only** for initial target; WXT can add Chrome later without structural changes
