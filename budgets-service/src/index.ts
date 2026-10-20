import http from 'node:http';
import { env } from './config/env.ts';
import { handleBudgetRequest } from './routes/budgetRoutes.ts';
import { verifySessionWithAuthService, type SessionVerifier } from './middleware/authMiddleware.ts';
import { logger } from './utils/logger.ts';

export function createBudgetsServer(
  verify: SessionVerifier = verifySessionWithAuthService
): http.Server {
  return http.createServer((req, res) => {
    void handleBudgetRequest(req, res, verify);
  });
}

// Iniciar servidor si este archivo es el punto de entrada principal
if (import.meta.url === `file://${process.argv[1]}`) {
  const server = createBudgetsServer();
  server.listen(env.port, () => {
    logger.info('budgets-service.started', {
      port: env.port,
      authServiceUrl: env.authServiceUrl,
    });
  });
}
