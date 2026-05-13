import { z } from 'zod';

/**
 * Payout statuses as documented at
 * https://doc.heleket.com/ru/methods/payouts/payout-statuses
 */
export namespace PayoutStatus {
  export const KNOWN = [
    'process',
    'check',
    'paid',
    'fail',
    'cancel',
    'system_fail',
  ] as const;

  export type Known = (typeof KNOWN)[number];

  export type Value = Known | (string & {});

  export const Schema = z.custom<Value>(
    (val) => typeof val === 'string' && val.length > 0,
    { message: 'payout status must be a non-empty string' },
  );
}
