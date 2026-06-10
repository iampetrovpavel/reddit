## ADDED Requirements

### Requirement: Start scrolling button
ParseView SHALL render a "Start Scrolling" button that initiates scroll automation on the active Reddit tab.

#### Scenario: Button triggers scroll start
- **WHEN** the user clicks "Start Scrolling"
- **THEN** the extension queries the active tab and sends `{type: 'START_SCROLL'}` to its content script

#### Scenario: Button disabled while scrolling
- **WHEN** scrolling is active
- **THEN** the "Start Scrolling" button is disabled

### Requirement: Stop scrolling button
ParseView SHALL render a "Stop Scrolling" button that halts scroll automation on the active Reddit tab.

#### Scenario: Button triggers scroll stop
- **WHEN** the user clicks "Stop Scrolling"
- **THEN** the extension sends `{type: 'STOP_SCROLL'}` to the tab's content script

#### Scenario: Button disabled when not scrolling
- **WHEN** scrolling is not active
- **THEN** the "Stop Scrolling" button is disabled

### Requirement: Scroll state tracking
ParseView SHALL track whether scrolling is currently active and reflect that state in the UI.

#### Scenario: State updates on start
- **WHEN** the user successfully starts scrolling
- **THEN** `isScrolling` becomes `true` and the active tab ID is stored

#### Scenario: State updates on stop
- **WHEN** the user stops scrolling
- **THEN** `isScrolling` becomes `false`

### Requirement: Error handling for missing content script
ParseView SHALL handle the case where the content script is not available on the active tab.

#### Scenario: Not on Reddit
- **WHEN** the user clicks "Start Scrolling" and the active tab is not a Reddit page
- **THEN** the error is caught, scrolling state remains `false`, and no unhandled exception is thrown
