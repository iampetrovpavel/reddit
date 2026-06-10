## ADDED Requirements

### Requirement: Content script runs on Reddit
The system SHALL inject a content script on all `*://*.reddit.com/*` pages that listens for scroll control messages.

#### Scenario: Script available on Reddit
- **WHEN** the user navigates to any reddit.com URL
- **THEN** the content script is active and ready to receive scroll messages

### Requirement: Start scroll on message
The content script SHALL begin a randomized scroll loop when it receives a `{type: 'START_SCROLL'}` message.

#### Scenario: Loop starts
- **WHEN** a `START_SCROLL` message is received and no loop is running
- **THEN** the scroll loop begins immediately, scrolling `window` by a random amount

#### Scenario: Duplicate start ignored
- **WHEN** a `START_SCROLL` message is received while a loop is already running
- **THEN** no additional loop is started

### Requirement: Stop scroll on message
The content script SHALL halt the scroll loop when it receives a `{type: 'STOP_SCROLL'}` message.

#### Scenario: Loop stops
- **WHEN** a `STOP_SCROLL` message is received while a loop is running
- **THEN** the loop is cancelled and no further scrolling occurs

#### Scenario: Stop when not running is safe
- **WHEN** a `STOP_SCROLL` message is received and no loop is running
- **THEN** nothing happens and no error is thrown

### Requirement: Human-like scroll randomness
Each scroll step SHALL vary in distance and direction according to a weighted random profile.

#### Scenario: Normal scroll step
- **WHEN** a step fires and a uniform random value is < 0.77
- **THEN** `window.scrollBy` is called with `top` between 80 and 300 px (downward)

#### Scenario: Big jump step
- **WHEN** a step fires and a uniform random value is between 0.77 and 0.92
- **THEN** `window.scrollBy` is called with `top` between 400 and 700 px (downward)

#### Scenario: Upscroll step
- **WHEN** a step fires and a uniform random value is ≥ 0.92
- **THEN** `window.scrollBy` is called with `top` between −20 and −60 px (upward)

### Requirement: Random delay between steps
The content script SHALL wait a random duration between 400 ms and 1500 ms before executing each scroll step.

#### Scenario: Delay varies between steps
- **WHEN** consecutive scroll steps are scheduled
- **THEN** each delay is independently drawn from a uniform distribution over [400, 1500] ms
