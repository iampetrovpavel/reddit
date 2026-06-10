import { join } from 'path';
import type { ClientMessage, ServerMessage } from '@redit/shared';
import type { AIProvider } from './providers/types';
import * as logger from './logger';

type SendFn = (msg: ServerMessage) => void;

function parseJson(raw: string): unknown {
  const stripped = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '').trim();
  try {
    return JSON.parse(stripped);
  } catch {
    // Truncated JSON recovery: extract value from incomplete {"key":"value...
    const m = stripped.match(/"(?:comment|reply)"\s*:\s*"((?:[^"\\]|\\.)*)/);
    if (m) {
      let val = m[1];
      try { val = JSON.parse('"' + val + '"'); } catch { /* keep raw */ }
      const lastSentence = val.match(/^[\s\S]*[.!?]/);
      if (lastSentence) val = lastSentence[0].trim();
      return { comment: val, reply: val };
    }
    throw new SyntaxError('unparseable: ' + stripped.slice(0, 80));
  }
}

function toAscii(text: string): string {
  return text
    .replace(/[\u2014\u2015]/g, '-')
    .replace(/\u2013/g, '-')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/\u2026/g, '...')
    .replace(/[^\x00-\x7F]/g, '');
}

const EMOTIONS = ['skeptical', 'mildly_annoyed', 'genuinely_curious', 'enthusiastic', 'dismissive', 'amused', 'neutral', 'tired'] as const;

const LENGTH_HINTS = [
  { lengthHint: 'fragment', maxTokens: 50 },
  { lengthHint: 'fragment', maxTokens: 50 },
  { lengthHint: 'short', maxTokens: 60 },
  { lengthHint: 'short', maxTokens: 60 },
  { lengthHint: 'short', maxTokens: 60 },
  { lengthHint: 'medium', maxTokens: 150 },
  { lengthHint: 'medium', maxTokens: 150 },
] as const;

function pickMood(): { emotion: string; notSure: boolean; lengthHint: string; maxTokens: number } {
  const emotion = EMOTIONS[Math.floor(Math.random() * EMOTIONS.length)];
  const notSure = Math.random() < 0.2;
  const { lengthHint, maxTokens } = LENGTH_HINTS[Math.floor(Math.random() * LENGTH_HINTS.length)];
  return { emotion, notSure, lengthHint, maxTokens };
}

export class SessionManager {
  private sessions = new Map<string, true>();
  private postQueue: Promise<void> = Promise.resolve();

  constructor(private provider: AIProvider, private cooldownS: number) {}

  async handle(msg: ClientMessage, send: SendFn): Promise<void> {
    switch (msg.type) {
      case 'new_session': {
        const session = await this.provider.startSession(msg.systemPromptPath);
        this.sessions.set(session.sessionId, true);
        logger.log('[session] created', session.sessionId);
        send({ type: 'session_created', sessionId: session.sessionId, cooldownS: this.cooldownS });
        break;
      }
      case 'send': {
        if (!this.sessions.has(msg.sessionId)) {
          send({ type: 'error', sessionId: msg.sessionId, message: 'session not found' });
          return;
        }
        for await (const chunk of this.provider.sendMessage(msg.sessionId, msg.content)) {
          send({ type: 'chunk', sessionId: msg.sessionId, content: chunk });
        }
        send({ type: 'done', sessionId: msg.sessionId });
        break;
      }
      case 'end_session': {
        if (!this.sessions.has(msg.sessionId)) {
          send({ type: 'error', sessionId: msg.sessionId, message: 'session not found' });
          return;
        }
        await this.provider.endSession(msg.sessionId);
        this.sessions.delete(msg.sessionId);
        break;
      }
      case 'post_seen': {
        const capturedMsg = msg;
        this.postQueue = this.postQueue
          .then(() => this.processPost(capturedMsg, send))
          .catch((err) => logger.error('[queue] unhandled error in processPost:', err));
        break;
      }
      case 'article_seen': {
        const capturedMsg = msg;
        this.postQueue = this.postQueue
          .then(() => this.processArticle(capturedMsg, send))
          .catch((err) => logger.error('[queue] unhandled error in processArticle:', err));
        break;
      }
      case 'reply_seen': {
        const capturedMsg = msg;
        this.postQueue = this.postQueue
          .then(() => this.processReply(capturedMsg, send))
          .catch((err) => logger.error('[queue] unhandled error in processReply:', err));
        break;
      }
    }
  }

  private async processArticle(
    msg: Extract<ClientMessage, { type: 'article_seen' }>,
    send: SendFn,
  ): Promise<void> {
    logger.log('[article] generating comment for', msg.article.title);
    const session = await this.provider.startSession(join(import.meta.dir, 'article-persona.md'));
    const mood = pickMood();
    logger.log('[article] mood:', mood.emotion, mood.notSure ? '(not sure)' : '');
    let raw = '';
    try {
      const { maxTokens: articleMaxTokens, ...moodForModel } = mood;
      for await (const chunk of this.provider.sendMessage(session.sessionId, JSON.stringify({ ...msg.article, ...moodForModel }), articleMaxTokens)) {
        raw += chunk;
      }
      const parsed = parseJson(raw) as { comment?: string };
      if (!parsed.comment) {
        logger.warn('[article] Claude returned no comment field, raw:', raw);
        send({ type: 'comment', text: '' });
        return;
      }
      const text = toAscii(parsed.comment);
      logger.log('[article] comment →', text);
      send({ type: 'comment', text });
    } catch (err) {
      logger.error('[article] error generating comment for', msg.article.title, '— raw:', raw, '— err:', err);
      send({ type: 'comment', text: '' });
    } finally {
      await this.provider.endSession(session.sessionId);
    }
  }

  private async processReply(
    msg: Extract<ClientMessage, { type: 'reply_seen' }>,
    send: SendFn,
  ): Promise<void> {
    logger.log('[reply] generating reply for', msg.replierAuthor, 'on article:', msg.articleTitle);
    let session: { sessionId: string } | null = null;
    let raw = '';
    try {
      session = await this.provider.startSession(join(import.meta.dir, 'reply-persona.md'));
      const mood = pickMood();
      logger.log('[reply] mood:', mood.emotion, mood.notSure ? '(not sure)' : '');
      for await (const chunk of this.provider.sendMessage(session.sessionId, JSON.stringify({
        articleTitle: msg.articleTitle,
        articleBody: msg.articleBody,
        botComment: msg.botComment,
        replierAuthor: msg.replierAuthor,
        replyText: msg.replyText,
        emotion: mood.emotion,
        notSure: mood.notSure,
        lengthHint: mood.lengthHint,
      }), mood.maxTokens)) {
        raw += chunk;
      }
      const parsed = parseJson(raw) as { reply?: string };
      if (!parsed.reply) {
        logger.warn('[reply] Claude returned no reply field, raw:', raw);
        send({ type: 'reply_answer', text: '' });
        return;
      }
      const text = toAscii(parsed.reply);
      logger.log('[reply] reply →', text);
      send({ type: 'reply_answer', text });
    } catch (err) {
      logger.error('[reply] error for', msg.replierAuthor, '— raw:', raw, '— err:', err);
      send({ type: 'reply_answer', text: '' });
    } finally {
      if (session) await this.provider.endSession(session.sessionId);
    }
  }

  private async processPost(
    msg: Extract<ClientMessage, { type: 'post_seen' }>,
    send: SendFn,
  ): Promise<void> {
    logger.log('[post] evaluating', msg.post.postId, msg.post.title);
    let session: { sessionId: string } | null = null;
    let raw = '';
    try {
      session = await this.provider.startSession('default');
      for await (const chunk of this.provider.sendMessage(session.sessionId, JSON.stringify(msg.post))) {
        raw += chunk;
      }
      const parsed = parseJson(raw) as { command?: string };
      const command = parsed.command;
      if (command === 'scroll' || command === 'like' || command === 'open') {
        logger.log('[post] command →', command);
        send({ type: 'command', command });
      } else {
        logger.warn('[post] unexpected command from Claude, raw:', raw, '— defaulting to scroll');
        send({ type: 'command', command: 'scroll' });
      }
    } catch (err) {
      logger.error('[post] error evaluating', msg.post.postId, '— raw:', raw, '— err:', err);
      send({ type: 'command', command: 'scroll' });
    } finally {
      if (session) await this.provider.endSession(session.sessionId);
    }
  }
}
