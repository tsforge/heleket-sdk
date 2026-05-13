import { z } from 'zod';

/**
 * Payout network fee priority. Applied only for BTC, ETH, Polygon, BSC.
 * https://doc.heleket.com/ru/methods/payouts/creating-payout
 */
export namespace PayoutPriority {
  export const KNOWN = ['recommended', 'economy', 'high', 'highest'] as const;

  export type Known = (typeof KNOWN)[number];

  export type Value = Known | (string & {});

  export const Schema = z.custom<Value>(
    (val) => typeof val === 'string' && val.length >= 4 && val.length <= 11,
    { message: 'priority must be a 4..11 character string' },
  );
}
