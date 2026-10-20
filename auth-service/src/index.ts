import http from 'node:http';
import { env } from './config/env.ts';
import { handleAuthRequest } from './routes/authRoutes.ts';
import { logger } from './utils/logger.ts';

export function createAuthServer(): http.Server {
  return http.createServer((req, res) => {
    void handleAuthRequest(req, res);
  });
}

// Iniciar servidor si este archivo es el punto de entrada principal
if (import.meta.url === `file://${process.argv[1]}`) {
  const server = createAuthServer();
  server.listen(env.port, () => {
    logger.info('auth-service.started', {
      port: env.port,
      issuer: env.jwtIssuer,
    });
  });
}
