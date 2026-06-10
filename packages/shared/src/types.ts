export type Session = {
  sessionId: string;
  systemPromptPath: string;
};

export type Post = {
  postId: string;
  title: string;
  url: string;
  imageUrl: string | null;
};

export type Comment = {
  author: string;
  text: string;
};

export type FullArticle = {
  title: string;
  body: string;
  author: string;
  comments: Comment[];
};

export type ClientMessage =
  | { type: 'send'; sessionId: string; content: string }
  | { type: 'new_session'; systemPromptPath: string }
  | { type: 'end_session'; sessionId: string }
  | { type: 'post_seen'; post: Post }
  | { type: 'article_seen'; sessionId: string; article: FullArticle }
  | { type: 'reply_seen'; articleTitle: string; articleBody: string; botComment: string; replierAuthor: string; replyText: string };

export type ServerMessage =
  | { type: 'chunk'; sessionId: string; content: string }
  | { type: 'done'; sessionId: string }
  | { type: 'error'; sessionId: string; message: string }
  | { type: 'session_created'; sessionId: string; cooldownS: number }
  | { type: 'command'; command: 'scroll' | 'like' | 'open' }
  | { type: 'comment'; text: string }
  | { type: 'reply_answer'; text: string };
