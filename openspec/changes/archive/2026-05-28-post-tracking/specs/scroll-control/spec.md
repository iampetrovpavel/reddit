## ADDED Requirements

### Requirement: Scroll start initialises post tracking
When scrolling starts, the content script SHALL initialise both the scroll loop and post tracking (WebSocket + MutationObserver).

#### Scenario: Full initialisation on start
- **WHEN** `START_SCROLL` message is received
- **THEN** the scroll loop starts, the WebSocket connection opens, and the MutationObserver is connected

### Requirement: Scroll stop tears down post tracking
When scrolling stops, the content script SHALL tear down both the scroll loop and post tracking.

#### Scenario: Full teardown on stop
- **WHEN** `STOP_SCROLL` message is received
- **THEN** the scroll loop stops, the WebSocket is closed, the MutationObserver is disconnected, and the seen-posts set is cleared
