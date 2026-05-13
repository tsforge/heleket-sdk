import { z } from 'zod';

/**
 * Payment / invoice statuses as documented at
 * https://doc.heleket.com/ru/methods/payments/payment-statuses
 */
export namespace PaymentStatus {
  export const KNOWN = [
    'paid',
    'paid_over',
    'wrong_amount',
    'wrong_amount_waiting',
    'process',
    'confirm_check',
    'check',
    'fail',
    'cancel',
    'system_fail',
    'refund_process',
    'refund_fail',
    'refund_paid',
    'locked',
  ] as const;

  export type Known = (typeof KNOWN)[number];

  export type Value = Known | (string & {});

  export const Schema = z.custom<Value>(
    (val) => typeof val === 'string' && val.length > 0,
    { message: 'payment status must be a non-empty string' },
  );
}
