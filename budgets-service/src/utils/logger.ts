/**
 * Logger JSON estructurado. Redacta campos sensibles (tokens, authorization)
 * por consistencia con auth-service: este servicio maneja el header
 * Authorization de las peticiones y nunca debe registrarlo.
 */

const SENSITIVE_KEYS = new Set(['token', 'accesstoken', 'authorization', 'secret', 'cookie', 'password']);

const JWT_REGEX = /\beyJ[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\b/g;
const BEARER_REGEX = /(Bearer\s+)[^\s"']+/gi;

export function sanitizeValue(value: unknown): unknown {
  if (value === null || value === undefined) {
    return value;
  }
  if (typeof value === 'string') {
    return value.replace(BEARER_REGEX, '$1[REDACTED]').replace(JWT_REGEX, '[REDACTED_TOKEN]');
  }
  if (Array.isArray(value)) {
    return value.map(sanitizeValue);
  }
  if (typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
      out[key] = SENSITIVE_KEYS.has(key.toLowerCase().replace(/[_-]/g, '')) ? '[REDACTED]' : sanitizeValue(val);
    }
    return out;
  }
  return value;
}

export interface LogEntry {
  timestamp: string;
  level: 'INFO' | 'WARN' | 'ERROR';
  event: string;
  meta?: Record<string, unknown>;
}

export const logger = {
  format(level: LogEntry['level'], event: string, meta?: Record<string, unknown>): LogEntry {
    return {
      timestamp: new Date().toISOString(),
      level,
      event: sanitizeValue(event) as string,
      ...(meta ? { meta: sanitizeValue(meta) as Record<string, unknown> } : {}),
    };
  },

  info(event: string, meta?: Record<string, unknown>): void {
    console.log(JSON.stringify(this.format('INFO', event, meta)));
  },

  warn(event: string, meta?: Record<string, unknown>): void {
    console.warn(JSON.stringify(this.format('WARN', event, meta)));
  },

  error(event: string, meta?: Record<string, unknown>): void {
    console.error(JSON.stringify(this.format('ERROR', event, meta)));
  },
};
