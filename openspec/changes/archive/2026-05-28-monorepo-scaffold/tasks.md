## 1. Repo Root Setup

- [x] 1.1 Initialize git repo and create root `package.json` with `name: "redit"`, `private: true`, and `scripts` for `build`, `dev`, `typecheck` via `turbo run`
- [x] 1.2 Create `pnpm-workspace.yaml` with `packages: ["apps/*", "packages/*"]` and `catalog:` block pinning react, react-dom, typescript, vite, @types/react, @types/node
- [x] 1.3 Create `turbo.json` with `build`, `dev` (persistent, no cache), and `typecheck` pipelines
- [x] 1.4 Create root `tsconfig.json` with `strict: true`, no `include`/`exclude` (base config only)
- [x] 1.5 Add `.gitignore` covering `node_modules`, `.output`, `dist`, `.turbo`

## 2. Shared Types Package

- [x] 2.1 Create `packages/shared/package.json` with `name: "@redit/shared"`, `main: "./src/index.ts"`, no runtime dependencies
- [x] 2.2 Create `packages/shared/tsconfig.json` extending root config
- [x] 2.3 Define `ClientMessage` discriminated union in `packages/shared/src/types.ts` (`send`, `new_session`, `end_session`)
- [x] 2.4 Define `ServerMessage` discriminated union in `packages/shared/src/types.ts` (`chunk`, `done`, `error`, `session_created`)
- [x] 2.5 Define `Session` type (`sessionId: string`, `systemPromptPath: string`)
- [x] 2.6 Export all types from `packages/shared/src/index.ts`

## 3. Bun Server

- [x] 3.1 Create `apps/server/package.json` with `name: "@redit/server"`, `@redit/shared: "workspace:*"` dependency, `dev` and `build` scripts using bun
- [x] 3.2 Create `apps/server/tsconfig.json` extending root config
- [x] 3.3 Define `AIProvider` interface in `apps/server/src/providers/types.ts` (`startSession`, `sendMessage` as `AsyncIterable<string>`, `endSession`)
- [x] 3.4 Implement `StubProvider` in `apps/server/src/providers/stub.ts` (echo message back as single chunk)
- [x] 3.5 Implement `ClaudeProvider` skeleton in `apps/server/src/providers/claude.ts` (satisfies interface, no-op spawn)
- [x] 3.6 Implement `SessionManager` in `apps/server/src/session-manager.ts` (Map of sessionId → session, handles all three message types, delegates to injected `AIProvider`)
- [x] 3.7 Create Bun WebSocket server entry in `apps/server/src/index.ts` (listens on `PORT` env or 3001, upgrades connections, routes messages to `SessionManager` with `StubProvider`)
- [x] 3.8 Verify server starts and echoes a message via `wscat` or similar

## 4. Firefox Extension

- [x] 4.1 Create `apps/extension/package.json` with `name: "@redit/extension"`, `@redit/shared: "workspace:*"`, `wxt` and `@wxt-dev/module-react` dependencies from catalog
- [x] 4.2 Create `apps/extension/tsconfig.json` extending root config with WXT-compatible settings
- [x] 4.3 Create `apps/extension/wxt.config.ts` targeting Firefox, enabling React module
- [x] 4.4 Create `apps/extension/entrypoints/sidebar/index.html` (WXT sidebar entrypoint HTML)
- [x] 4.5 Create `apps/extension/entrypoints/sidebar/App.tsx` with `useState<'chat' | 'settings'>('chat')` and tab bar rendering `<ChatView>` or `<SettingsView>`
- [x] 4.6 Create `apps/extension/entrypoints/sidebar/views/ChatView.tsx` — empty placeholder with `<h1>Chat</h1>`
- [x] 4.7 Create `apps/extension/entrypoints/sidebar/views/SettingsView.tsx` — empty placeholder with `<h1>Settings</h1>`
- [x] 4.8 Create `apps/extension/entrypoints/sidebar/main.tsx` rendering `<App />` into the DOM root
- [x] 4.9 Run `pnpm dev` in `apps/extension`, load extension in Firefox, confirm sidebar opens with tab bar and both views switch correctly

## 5. Integration Wiring

- [x] 5.1 Run `pnpm install` from repo root and verify all workspaces link correctly
- [x] 5.2 Run `pnpm dev` from repo root and verify both extension HMR and server start in parallel
- [x] 5.3 Run `pnpm build` from repo root and verify build order: shared → extension + server
- [x] 5.4 Verify `apps/extension` and `apps/server` can both import from `@redit/shared` without TypeScript errors
