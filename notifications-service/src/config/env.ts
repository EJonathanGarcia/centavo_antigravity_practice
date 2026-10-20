export interface NotificationsConfig {
  port: number;
  authServiceUrl: string;
  budgetsServiceUrl: string;
}

export const env: NotificationsConfig = {
  port: Number(process.env.NOTIFICATIONS_PORT ?? process.env.PORT ?? 3004),
  authServiceUrl: process.env.AUTH_SERVICE_URL ?? 'http://127.0.0.1:3001',
  budgetsServiceUrl: process.env.BUDGETS_SERVICE_URL ?? 'http://127.0.0.1:3003',
};
