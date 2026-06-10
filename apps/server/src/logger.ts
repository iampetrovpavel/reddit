import { appendFileSync } from 'fs';

const LOG_FILE = 'server.log';

function write(level: string, args: unknown[]) {
  const ts = new Date().toISOString();
  const msg = args.map(a => (typeof a === 'string' ? a : JSON.stringify(a))).join(' ');
  appendFileSync(LOG_FILE, `${ts} [${level}] ${msg}\n`);
}

export const log = (...args: unknown[]) => write('INFO', args);
export const warn = (...args: unknown[]) => write('WARN', args);
export const error = (...args: unknown[]) => write('ERROR', args);
