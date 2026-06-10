import type { Session } from '@redit/shared';

export interface AIProvider {
  startSession(systemPromptPath: string): Promise<Session>;
  sendMessage(sessionId: string, content: string, maxTokens?: number): AsyncIterable<string>;
  endSession(sessionId: string): Promise<void>;
}
