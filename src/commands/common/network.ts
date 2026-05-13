import { z } from 'zod';

export namespace Network {
  export const KNOWN = [
    'ETH',
    'TRON',
    'BSC',
    'BTC',
    'LTC',
    'BCH',
    'DASH',
    'DOGE',
    'POLYGON',
    'TON',
    'XMR',
  ] as const;

  export type Known = (typeof KNOWN)[number];

  export type Value = Known | (string & {});

  export const Schema = z.custom<Value>(
    (val) => typeof val === 'string' && val.length > 0,
    { message: 'network must be a non-empty string' },
  );
}
