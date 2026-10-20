export interface BudgetsConfig {
  port: number;
  authServiceUrl: string;
}

export const env: BudgetsConfig = {
  port: Number(process.env.BUDGETS_PORT ?? process.env.PORT ?? 3003),
  authServiceUrl: process.env.AUTH_SERVICE_URL ?? 'http://127.0.0.1:3001',
};
