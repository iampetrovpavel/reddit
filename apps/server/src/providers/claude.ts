import Anthropic from '@anthropic-ai/sdk';
import type { MessageParam } from '@anthropic-ai/sdk/resources';
import { randomUUID } from 'crypto';
import { readFileSync } from 'fs';
import { join } from 'path';
import type { Session } from '@redit/shared';
import type { AIProvider } from './types';
import * as logger from '../logger';

type SessionState = {
  systemPrompt: string;
  messages: MessageParam[];
};

export class ClaudeProvider implements AIProvider {
  private client = new Anthropic();
  private sessions = new Map<string, SessionState>();

  async startSession(systemPromptPath: string): Promise<Session> {
    const resolvedPath =
      systemPromptPath === 'default'
        ? join(import.meta.dir, '..', 'persona.md')
        : systemPromptPath;

    const systemPrompt = readFileSync(resolvedPath, 'utf-8');
    const sessionId = randomUUID();
    this.sessions.set(sessionId, { systemPrompt, messages: [] });
    logger.log('[claude] session started', sessionId, resolvedPath);
    return { sessionId, systemPromptPath: resolvedPath };
  }

  async *sendMessage(sessionId: string, content: string, maxTokens = 64): AsyncIterable<string> {
    const state = this.sessions.get(sessionId);
    if (!state) throw new Error(`Session ${sessionId} not found`);

    state.messages.push({ role: 'user', content });
    logger.log('[claude] →', content);

    const response = await this.client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: maxTokens,
      system: [{ type: 'text', text: state.systemPrompt, cache_control: { type: 'ephemeral' } }],
      messages: state.messages,
    });

    const { input_tokens, output_tokens, cache_creation_input_tokens, cache_read_input_tokens } = response.usage;
    logger.log(
      '[claude] usage',
      `in=${input_tokens}`,
      `out=${output_tokens}`,
      `cache_write=${cache_creation_input_tokens ?? 0}`,
      `cache_read=${cache_read_input_tokens ?? 0}`,
    );

    const text = response.content
      .filter((b) => b.type === 'text')
      .map((b) => (b as Anthropic.TextBlock).text)
      .join('');

    state.messages.push({ role: 'assistant', content: text });
    logger.log('[claude] ←', text);

    yield text;
  }

  async endSession(sessionId: string): Promise<void> {
    this.sessions.delete(sessionId);
    logger.log('[claude] session ended', sessionId);
  }
}
