import { z } from 'zod';

export const CURRENCY_VALUES = [
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
  'USD',
] as const;

export type TCurrency = (typeof CURRENCY_VALUES)[number];

export const CURRENCY = {
  USDT: 'USDT',
  USDC: 'USDC',
  BUSD: 'BUSD',
  DAI: 'DAI',
  VERSE: 'VERSE',
  CGPT: 'CGPT',
  BTC: 'BTC',
  ETH: 'ETH',
  BNB: 'BNB',
  TRX: 'TRX',
  LTC: 'LTC',
  BCH: 'BCH',
  DASH: 'DASH',
  DOGE: 'DOGE',
  MATIC: 'MATIC',
  TON: 'TON',
  XMR: 'XMR',
  USD: 'USD',
} as const satisfies Record<string, TCurrency>;

export namespace Currency {
  export const KNOWN = CURRENCY_VALUES;

  export type Known = TCurrency;

  export type Value = Known | (string & {});

  export const Schema = z.custom<Value>(
    (val) => typeof val === 'string' && val.length > 0,
    { message: 'currency must be a non-empty string' },
  );
}
