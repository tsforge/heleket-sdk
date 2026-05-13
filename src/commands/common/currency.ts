import { z } from 'zod';

export namespace Currency {
  export const KNOWN = [
    'USDT',
    'USDC',
    'BUSD',
    'DAI',
    'VERSE',
    'CGPT',
    'BTC',
    'ETH',
    'BNB',
    'TRX',
    'LTC',
    'BCH',
    'DASH',
    'DOGE',
    'MATIC',
    'TON',
    'XMR',
  ] as const;

  export type Known = (typeof KNOWN)[number];

  export type Value = Known | (string & {});

  export const Schema = z.custom<Value>(
    (val) => typeof val === 'string' && val.length > 0,
    { message: 'currency must be a non-empty string' },
  );
}
