## Context

Greenfield project. No existing code. The goal is a Firefox sidebar that streams AI responses from a local Bun server. The server bridges user messages to Claude CLI via subprocess. This design covers the monorepo wiring, the extension–server protocol, and the server's internal architecture.

## Goals / Non-Goals

**Goals:**
- Working `pnpm dev` that starts both extension dev server (WXT) and Bun server in parallel
- Working `pnpm build` that produces a Firefox-loadable extension and a runnable server bundle
- Shared TypeScript types consumed by both apps with no duplication
- Server architecture that can swap Claude CLI for another provider without touching extension code
- Extension sidebar with two empty React views toggled by state

**Non-Goals:**
- Authentication or multi-user support
- Actual Claude CLI integration (process spawning is stubbed)
- Content scripts, background service workers, or browser action popup
- Chrome support (WXT can add it later without structural changes)
- Deployment or packaging scripts

## Decisions

### 1. pnpm workspaces + turborepo

**Decision**: Use pnpm workspaces for package management and turborepo for task orchestration.

**Rationale**: pnpm's symlink strategy avoids phantom dependencies. Turborepo adds parallel task execution and caching on top with minimal config. The alternative (nx) is heavier and harder to eject from.

**pnpm catalog** pins shared dep versions (react, typescript, vite, @types/react) in `pnpm-workspace.yaml` under `catalog:`. Each package references `catalog:react` instead of a version string, eliminating cross-package drift.

**turbo.json pipelines**:
```
build  → dependsOn: ["^build"]   outputs: [".output/**", "dist/**"]
dev    → persistent: true, cache: false
typecheck → dependsOn: ["^build"]
```

### 2. WXT sidebar entrypoint — single HTML, view-state toggle

**Decision**: One `entrypoints/sidebar/` directory produces one HTML page. The two views (Chat, Settings) are React components toggled by a `useState` value. No React Router.

**Rationale**: A sidebar is a persistent panel, not a navigable surface. React Router adds routing logic (history, URL, back button) that has no meaning inside a browser extension sidebar. A simple `view: 'chat' | 'settings'` state is the right primitive. The tab bar at the top of the sidebar swaps the view.

**Alternative considered**: Two separate WXT entrypoints (`entrypoints/chat/`, `entrypoints/settings/`). Rejected: WXT would generate two separate HTML pages with no shared runtime, and the sidebar manifest only points to one page.

### 3. WebSocket for extension ↔ server communication

**Decision**: Bun's built-in WebSocket server; extension connects via `new WebSocket('ws://localhost:3000')`.

**Rationale**: Streaming Claude responses requires server-push. WebSocket is bidirectional (needed for sending messages and receiving streamed chunks). SSE is unidirectional and would need a separate HTTP POST for sending. HTTP long-poll is worse. WebSocket is the natural fit.

**Message envelope** (defined in `packages/shared`):
```ts
// client → server
{ type: 'send', sessionId: string, content: string }
{ type: 'new_session', systemPromptPath: string }
{ type: 'end_session', sessionId: string }

// server → client
{ type: 'chunk', sessionId: string, content: string }
{ type: 'done', sessionId: string }
{ type: 'error', sessionId: string, message: string }
{ type: 'session_created', sessionId: string }
```

### 4. Claude CLI — long-running process per session

**Decision**: One `claude` subprocess per session, kept alive with an open stdin/stdout pipe. Messages are written to stdin; streaming output is read from stdout.

**Rationale**: Claude CLI maintains conversation history in its own state when run interactively. Restarting per message would lose context. Long-running process is how the CLI is designed to operate.

**Process lifecycle**:
```
new_session → spawn claude --system <path>  → register in SessionManager
send        → write message to stdin        → pipe stdout chunks to WS client
end_session → close stdin → wait for exit   → remove from SessionManager
```

**Stub for scaffold**: The `ClaudeProvider` class will exist and implement the `AIProvider` interface but the `spawn` call will be replaced by a no-op that echoes the message back, so the wiring can be tested without Claude installed.

### 5. Provider abstraction

**Decision**: Server defines an `AIProvider` interface. `ClaudeProvider` implements it. `SessionManager` depends only on the interface.

**Rationale**: Extensibility requirement. A future `OpenAIProvider` or `OllamaProvider` can be dropped in by swapping the concrete class passed to `SessionManager`.

```ts
interface AIProvider {
  startSession(systemPromptPath: string): Promise<Session>
  sendMessage(sessionId: string, content: string): AsyncIterable<string>
  endSession(sessionId: string): Promise<void>
}
```

### 6. Package layout

```
redit/
├── apps/
│   ├── extension/          # WXT app, target: firefox
│   └── server/             # Bun app
├── packages/
│   └── shared/             # types only, no runtime deps
├── turbo.json
├── pnpm-workspace.yaml     # workspace globs + catalog
└── package.json            # root devDeps: turbo, typescript
```

`packages/shared` is a types-only package (no build step needed — TypeScript projects reference it via `paths` or workspace protocol, and tsc resolves `.ts` source directly).

## Risks / Trade-offs

**WXT caching with turborepo** → WXT's `.output/` contains hashed filenames that change every build; turbo's content-hash cache may not be useful. Mitigation: mark extension `build` as `cache: false` initially, enable after profiling.

**Long-running Claude subprocess stability** → Process may crash, hang on output, or exit unexpectedly. Mitigation: SessionManager wraps spawn with exit/error handlers; sends `{ type: 'error' }` to client on unexpected exit. Full retry logic is out of scope for scaffold.

**localhost WebSocket in extension** → Firefox extensions can connect to localhost without special permissions in MV3. No `host_permissions` entry needed for `ws://localhost`. Confirmed behavior; worth a note in wxt.config.ts.

**pnpm catalog + WXT peer deps** → WXT declares React as a peer dep. Catalog must include `react` and `react-dom` so WXT and the extension package resolve the same instance. Otherwise React context will break.

## Open Questions

- What port should the server use? (Defaulting to `3000`; should be configurable via env)
- Should the system prompt path be absolute or relative to the server's working directory?
- Will the server ever need to support multiple sidebar clients simultaneously (e.g., two Firefox windows)?
