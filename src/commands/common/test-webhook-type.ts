/**
 * Targets of the synthetic test webhook endpoint, see
 * https://doc.heleket.com/ru/methods/payments/test-webhook
 */
export const TEST_WEBHOOK_TYPE_VALUES = ['payment', 'wallet'] as const;

export type TTestWebhookType = (typeof TEST_WEBHOOK_TYPE_VALUES)[number];

export const TEST_WEBHOOK_TYPE = {
  PAYMENT: 'payment',
  WALLET: 'wallet',
} as const satisfies Record<string, TTestWebhookType>;
