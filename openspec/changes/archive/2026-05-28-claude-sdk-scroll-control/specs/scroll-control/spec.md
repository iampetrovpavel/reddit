## MODIFIED Requirements

### Requirement: Scroll start initialises post tracking
When scrolling starts, the content script SHALL initialise the WebSocket, send `new_session`, and start observing posts — but SHALL NOT start the scroll timer until Claude's first `scroll` command is received.

#### Scenario: Full initialisation on start
- **WHEN** `START_SCROLL` message is received
- **THEN** the WebSocket connection opens, `new_session` is sent, and the IntersectionObserver is connected; the scroll timer does NOT start immediately

#### Scenario: Scroll begins after session confirmed
- **WHEN** `session_created` is received with a `sessionId`
- **THEN** `scheduleNext()` is called to begin the first scroll step

### Requirement: Scroll stop tears down post tracking
When scrolling stops, the content script SHALL tear down both the scroll loop and post tracking.

#### Scenario: Full teardown on stop
- **WHEN** `STOP_SCROLL` message is received
- **THEN** the scroll loop stops, the WebSocket is closed, the observers are disconnected, `sessionId` is cleared, and the seen-posts set is cleared
