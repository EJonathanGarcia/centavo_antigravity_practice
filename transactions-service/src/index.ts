import http from 'node:http';
import { env } from './config/env.ts';
import { handleTransactionRequest } from './routes/transactionRoutes.ts';
import { verifySessionWithAuthService, type SessionVerifier } from './middleware/authMiddleware.ts';
import { logger } from './utils/logger.ts';

export function createTransactionsServer(
  verify: SessionVerifier = verifySessionWithAuthService
): http.Server {
  return http.createServer((req, res) => {
    void handleTransactionRequest(req, res, verify);
  });
}

// Iniciar servidor si este archivo es el punto de entrada principal
if (import.meta.url === `file://${process.argv[1]}`) {
  const server = createTransactionsServer();
  server.listen(env.port, () => {
    logger.info('transactions-service.started', {
      port: env.port,
      authServiceUrl: env.authServiceUrl,
    });
  });
}
