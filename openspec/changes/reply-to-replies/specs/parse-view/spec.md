## ADDED Requirements

### Requirement: Reply to Replies button
ParseView SHALL render a "Reply to Replies" button that sends a `REPLY_TO_REPLIES` message to the content script of the active tab.

#### Scenario: Button triggers reply flow
- **WHEN** the user clicks "Reply to Replies"
- **THEN** the extension queries the active tab and sends `{ type: 'REPLY_TO_REPLIES' }` to its content script

#### Scenario: Button disabled while reply in progress
- **WHEN** a reply operation is in progress
- **THEN** the "Reply to Replies" button is disabled

### Requirement: Reply status display
ParseView SHALL display a status message reflecting the outcome of the reply operation.

#### Scenario: Working state shown
- **WHEN** the reply operation is in progress
- **THEN** the status reads "Replying..."

#### Scenario: Success state shown
- **WHEN** the content script reports the reply was submitted successfully
- **THEN** the status updates to indicate completion

#### Scenario: Error state shown
- **WHEN** the content script reports an error (no-bot-comment, no-replies, composer-timeout, or send failure)
- **THEN** a descriptive error message is shown in the status area
