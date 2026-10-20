import crypto from 'node:crypto';

export interface AuthConfig {
  port: number;
  jwtSecret: string;
  jwtIssuer: string;
  jwtExpiresInSeconds: number;
}

const fallbackSecret = crypto.randomBytes(32).toString('hex');

export const env: AuthConfig = {
  port: Number(process.env.AUTH_PORT ?? process.env.PORT ?? 3001),
  jwtSecret: process.env.AUTH_JWT_SECRET ?? fallbackSecret,
  jwtIssuer: process.env.AUTH_JWT_ISSUER ?? 'centavo-auth-service',
  jwtExpiresInSeconds: Number(process.env.AUTH_JWT_EXPIRES_IN ?? 3600),
};
