## ADDED Requirements

### Requirement: pnpm workspace configuration
The repository SHALL be configured as a pnpm workspace containing `apps/*` and `packages/*` globs. A `catalog:` block SHALL pin shared dependency versions (react, react-dom, typescript, vite, @types/react, @types/node) so all packages resolve identical versions without per-package version strings.

#### Scenario: Workspace resolves shared packages
- **WHEN** a developer runs `pnpm install` at the repo root
- **THEN** all packages under `apps/` and `packages/` are linked and their dependencies installed

#### Scenario: Catalog pins versions
- **WHEN** a package references `catalog:react` as a dependency version
- **THEN** pnpm resolves it to the version declared in the workspace catalog

### Requirement: Turborepo task pipelines
The repository SHALL include a `turbo.json` defining pipelines for `build`, `dev`, and `typecheck` tasks. The `build` pipeline SHALL declare `dependsOn: ["^build"]` so packages build in dependency order. The `dev` pipeline SHALL be `persistent: true` and `cache: false`. The root `package.json` SHALL expose `build`, `dev`, and `typecheck` scripts that invoke `turbo run`.

#### Scenario: Parallel dev startup
- **WHEN** a developer runs `pnpm dev` at the repo root
- **THEN** both `apps/extension` and `apps/server` dev processes start in parallel and remain running

#### Scenario: Ordered build
- **WHEN** a developer runs `pnpm build` at the repo root
- **THEN** `packages/shared` builds before `apps/extension` and `apps/server`

### Requirement: TypeScript root configuration
The repository SHALL include a root `tsconfig.json` with `composite: false` and `strict: true` that all package-level configs extend. No source files SHALL be compiled by the root config directly.

#### Scenario: Package extends root config
- **WHEN** any package's `tsconfig.json` uses `"extends": "../../tsconfig.json"`
- **THEN** strict mode and shared compiler options are inherited without duplication
