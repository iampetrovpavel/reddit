## ADDED Requirements

### Requirement: Observe new posts in feed
The content script SHALL use a `MutationObserver` on `shreddit-feed` to detect `<article>` nodes added to the DOM during scrolling.

#### Scenario: New article detected
- **WHEN** Reddit appends a new `<article>` element to `shreddit-feed`
- **THEN** the observer fires and the post is processed

#### Scenario: No feed element on page
- **WHEN** `shreddit-feed` does not exist on the current page
- **THEN** the observer is not created and no error is thrown

### Requirement: Extract minimal post data
The content script SHALL extract `postId`, `title`, `url`, and `imageUrl` from each detected `<article>` element.

#### Scenario: Standard article attributes
- **WHEN** an `<article>` has `data-post-id` and `aria-label` attributes
- **THEN** `postId` = `data-post-id` value, `title` = `aria-label` value, `url` = current `window.location.href`

#### Scenario: Image post
- **WHEN** an `<article>` contains an `<img>` inside `[slot="post-media-container"]`
- **THEN** `imageUrl` = that `<img>`'s `src` attribute

#### Scenario: Link post with thumbnail
- **WHEN** an `<article>` has no post-media image but has a `[data-testid="post-thumbnail"] img`
- **THEN** `imageUrl` = that thumbnail `<img>`'s `src` attribute

#### Scenario: Text-only post
- **WHEN** an `<article>` has no image in either location
- **THEN** `imageUrl` = `null`

#### Scenario: Missing attributes
- **WHEN** an `<article>` is missing `data-post-id` or `aria-label`
- **THEN** the missing field defaults to an empty string and the post is still sent

### Requirement: Deduplicate posts by postId
The content script SHALL maintain a set of seen post IDs and SHALL NOT send the same post more than once per scroll session.

#### Scenario: Duplicate post suppressed
- **WHEN** a post with an already-seen `postId` is detected
- **THEN** it is not sent to the server

#### Scenario: New post passes through
- **WHEN** a post with an unseen `postId` is detected
- **THEN** it is sent to the server and its ID is added to the seen set

### Requirement: Observer lifecycle
The content script SHALL start the `MutationObserver` when scrolling starts and disconnect it when scrolling stops.

#### Scenario: Observer starts with scroll
- **WHEN** `START_SCROLL` message is received
- **THEN** a new `MutationObserver` is connected to `shreddit-feed`

#### Scenario: Observer stops with scroll
- **WHEN** `STOP_SCROLL` message is received
- **THEN** the `MutationObserver` is disconnected and the seen-posts set is cleared
