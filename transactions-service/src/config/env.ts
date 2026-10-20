export interface TransactionsConfig {
  port: number;
  authServiceUrl: string;
}

export const env: TransactionsConfig = {
  port: Number(process.env.TRANSACTIONS_PORT ?? process.env.PORT ?? 3002),
  authServiceUrl: process.env.AUTH_SERVICE_URL ?? 'http://127.0.0.1:3001',
};
