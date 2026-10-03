export const TEST_WEBHOOK_CONTROLLER = 'test-webhook' as const;

export const TEST_WEBHOOK_ROUTES = {
  POST_PAYMENT: `${TEST_WEBHOOK_CONTROLLER}/payment`,
  POST_WALLET: `${TEST_WEBHOOK_CONTROLLER}/wallet`,
} as const;
