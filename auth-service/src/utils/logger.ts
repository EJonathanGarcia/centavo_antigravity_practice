/**
 * Logger seguro que garantiza el cumplimiento de AGENTS.md:
 * "Nunca logueas credenciales ni tokens en texto plano."
 */

const SENSITIVE_KEYS = new Set([
  'password',
  'plainpassword',
  'newpassword',
  'oldpassword',
  'passwordhash',
  'hash',
  'salt',
  'token',
  'accesstoken',
  'refreshtoken',
  'idtoken',
  'authorization',
  'secret',
  'jwtsecret',
  'cookie',
]);

const JWT_REGEX = /\beyJ[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\b/g;
const BEARER_REGEX = /(Bearer\s+)[^\s"']+/gi;

export function sanitizeValue(value: unknown): unknown {
  if (value === null || value === undefined) {
    return value;
  }

  if (typeof value === 'string') {
    return value
      .replace(BEARER_REGEX, '$1[REDACTED]')
      .replace(JWT_REGEX, '[REDACTED_TOKEN]');
  }

  if (Array.isArray(value)) {
    return value.map(sanitizeValue);
  }

  if (typeof value === 'object') {
    const sanitizedObj: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
      if (SENSITIVE_KEYS.has(key.toLowerCase().replace(/[_-]/g, ''))) {
        sanitizedObj[key] = '[REDACTED]';
      } else {
        sanitizedObj[key] = sanitizeValue(val);
      }
    }
    return sanitizedObj;
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
    const entry = this.format('INFO', event, meta);
    console.log(JSON.stringify(entry));
  },

  warn(event: string, meta?: Record<string, unknown>): void {
    const entry = this.format('WARN', event, meta);
    console.warn(JSON.stringify(entry));
  },

  error(event: string, meta?: Record<string, unknown>): void {
    const entry = this.format('ERROR', event, meta);
    console.error(JSON.stringify(entry));
  },
};
