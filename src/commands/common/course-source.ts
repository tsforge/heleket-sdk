import { z } from 'zod';

/**
 * Exchange rate source for crypto-to-fiat conversion.
 * https://doc.heleket.com/ru/methods/payments/creating-invoice
 * https://doc.heleket.com/ru/methods/payouts/creating-payout
 */
export namespace CourseSource {
  export const KNOWN = ['Binance', 'BinanceP2P', 'Exmo', 'Kucoin'] as const;

  export type Known = (typeof KNOWN)[number];

  export type Value = Known | (string & {});

  export const Schema = z.custom<Value>(
    (val) => typeof val === 'string' && val.length >= 4 && val.length <= 20,
    { message: 'course_source must be a 4..20 character string' },
  );
}
