# Spec: article-extractor

## Requirement: Extract post title and body from article page
The content script SHALL extract post title from `shreddit-post h1[slot="title"]` and body text from `shreddit-post-text-body div[id*="post-rtjson-content"] p` elements, joining paragraph text with newlines.

### Scenario: Title extracted from h1 slot
- **WHEN** `extractArticle()` is called on an article page with a `<shreddit-post>` element
- **THEN** the returned `FullArticle.title` equals the `textContent` of `shreddit-post h1[slot="title"]`

### Scenario: Body extracted from paragraphs
- **WHEN** the post has one or more `<p dir="auto">` elements inside `shreddit-post-text-body`
- **THEN** `FullArticle.body` contains the joined text of all those paragraphs

### Scenario: Missing body returns empty string
- **WHEN** no `shreddit-post-text-body` element or no `<p>` children are found
- **THEN** `FullArticle.body` is an empty string

## Requirement: Extract post author from article page
The content script SHALL extract the author from the `author` attribute of the `<shreddit-post>` element.

### Scenario: Author attribute present
- **WHEN** `<shreddit-post author="someuser">` is in the DOM
- **THEN** `FullArticle.author` equals `"someuser"`

## Requirement: Extract top 5 depth-0 comments
The content script SHALL query `shreddit-comment[depth="0"]` elements, take the first 5, and for each extract `author` attribute and body text from `div[slot="comment"] div[id*="post-rtjson-content"] p`.

### Scenario: Up to 5 top-level comments extracted
- **WHEN** there are 8 `shreddit-comment[depth="0"]` elements on the page
- **THEN** `FullArticle.comments` contains exactly 5 entries

### Scenario: Fewer than 5 comments available
- **WHEN** there are 3 `shreddit-comment[depth="0"]` elements on the page
- **THEN** `FullArticle.comments` contains 3 entries

### Scenario: Comment with no body returns empty string
- **WHEN** a `shreddit-comment` has no `div[slot="comment"]` paragraph content
- **THEN** the corresponding `Comment.text` is an empty string
