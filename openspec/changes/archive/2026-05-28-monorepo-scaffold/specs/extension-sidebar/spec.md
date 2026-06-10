## ADDED Requirements

### Requirement: WXT sidebar entrypoint
The extension SHALL declare a `sidebar_action` via a WXT `entrypoints/sidebar/` directory. `wxt.config.ts` SHALL target Firefox (`browser: 'firefox'`) and configure React via the `@wxt-dev/module-react` module. The sidebar entrypoint SHALL render a single React root.

#### Scenario: Sidebar loads in Firefox
- **WHEN** the extension is loaded in Firefox and the user opens the sidebar
- **THEN** the sidebar HTML page renders without errors

#### Scenario: WXT dev server starts
- **WHEN** a developer runs `pnpm dev` inside `apps/extension`
- **THEN** WXT starts its HMR dev server and the extension is hot-reloadable

### Requirement: Two placeholder views
The sidebar React app SHALL render exactly two views: `Chat` and `Settings`. View selection SHALL be controlled by a single `useState` value of type `'chat' | 'settings'`. Each view SHALL be an empty React component that renders its name as a heading. No routing library SHALL be used.

#### Scenario: Default view is Chat
- **WHEN** the sidebar first opens
- **THEN** the Chat view is displayed

#### Scenario: Switching to Settings
- **WHEN** the user activates the Settings tab
- **THEN** the Settings view replaces the Chat view without a page reload

#### Scenario: Switching back to Chat
- **WHEN** the user activates the Chat tab while Settings is shown
- **THEN** the Chat view is displayed again

### Requirement: Navigation tab bar
The sidebar SHALL render a tab bar with two buttons, one per view. The active tab SHALL be visually distinguished. Tab bar SHALL persist across view switches.

#### Scenario: Active tab is highlighted
- **WHEN** the Chat view is active
- **THEN** the Chat tab button is visually marked as active and the Settings tab is not

### Requirement: Extension manifest configuration
`wxt.config.ts` SHALL produce a manifest that includes `sidebar_action` with the sidebar page URL. The manifest SHALL NOT include `host_permissions` for localhost (not required for `ws://localhost` in Firefox MV3).

#### Scenario: Manifest contains sidebar_action
- **WHEN** `pnpm build` runs in `apps/extension`
- **THEN** the output manifest.json contains a `sidebar_action` key pointing to the sidebar HTML file
