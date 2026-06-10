import { randomUUID } from 'crypto';
import type { Session } from '@redit/shared';
import type { AIProvider } from './types';

export class StubProvider implements AIProvider {
  async startSession(systemPromptPath: string): Promise<Session> {
    return { sessionId: randomUUID(), systemPromptPath };
  }

  async *sendMessage(_sessionId: string, content: string): AsyncIterable<string> {
    yield content;
  }

  async endSession(_sessionId: string): Promise<void> {}
}
