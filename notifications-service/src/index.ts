import http from 'node:http';
import { env } from './config/env.ts';
import { handleNotificationRequest } from './routes/notificationRoutes.ts';
import { verifySessionWithAuthService, type SessionVerifier } from './middleware/authMiddleware.ts';
import {
  fetchBudgetsFromBudgetsService,
  type BudgetLookup,
} from './services/notificationService.ts';
import { logger } from './utils/logger.ts';

export function createNotificationsServer(
  verify: SessionVerifier = verifySessionWithAuthService,
  lookupBudgets: BudgetLookup = fetchBudgetsFromBudgetsService
): http.Server {
  return http.createServer((req, res) => {
    void handleNotificationRequest(req, res, verify, lookupBudgets);
  });
}

// Iniciar servidor si este archivo es el punto de entrada principal
if (import.meta.url === `file://${process.argv[1]}`) {
  const server = createNotificationsServer();
  server.listen(env.port, () => {
    logger.info('notifications-service.started', {
      port: env.port,
      authServiceUrl: env.authServiceUrl,
      budgetsServiceUrl: env.budgetsServiceUrl,
    });
  });
}
