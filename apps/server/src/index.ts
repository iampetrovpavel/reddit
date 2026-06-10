import type { ClientMessage, ServerMessage } from '@redit/shared';
import { SessionManager } from './session-manager';
import { ClaudeProvider } from './providers/claude';
import * as logger from './logger';

if(!process.env.PORT) {
  logger.error('PORT environment variable is not set');
  process.exit(1);
}

const port = Number(process.env.PORT);
const commentCooldownS = Number(process.env.COMMENT_COOLDOWN_S) || 600;
const manager = new SessionManager(new ClaudeProvider(), commentCooldownS);

Bun.serve({
  port,
  fetch(req, server) {
    if (server.upgrade(req)) return;
    return new Response('WebSocket only', { status: 426 });
  },
  websocket: {
    async message(ws, raw) {
      let msg: ClientMessage;
      try {
        msg = JSON.parse(typeof raw === 'string' ? raw : raw.toString()) as ClientMessage;
      } catch {
        return;
      }
      await manager.handle(msg, (response: ServerMessage) => {
        const result = ws.send(JSON.stringify(response));
        if (result === -1) {
          logger.warn('send failed — socket closed, response dropped:', response.type);
        }
      });
    },
    open() {
      logger.log('Client connected');
    },
    close() {
      logger.log('Client disconnected');
    },
  },
});

logger.log(`Server listening on ws://localhost:${port}`);
