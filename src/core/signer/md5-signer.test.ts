import { createHash } from 'node:crypto';

import { describe, expect, test } from 'vitest';

import { Md5Signer } from './md5-signer';

const referenceSign = (body: string, apiKey: string): string =>
  createHash('md5')
    .update(Buffer.from(body, 'utf8').toString('base64') + apiKey)
    .digest('hex');

describe('Md5Signer', () => {
  test('returns md5 of base64(body) + apiKey', () => {
    const body = JSON.stringify({ amount: '10', currency: 'USDT' });
    const apiKey = 'test-api-key';
    const signer = new Md5Signer(apiKey);
    expect(signer.sign(body)).toBe(referenceSign(body, apiKey));
  });

  test('handles empty body', () => {
    const apiKey = 'k';
    const signer = new Md5Signer(apiKey);
    expect(signer.sign('')).toBe(referenceSign('', apiKey));
  });

  test('is deterministic for the same input', () => {
    const signer = new Md5Signer('k');
    expect(signer.sign('{}')).toBe(signer.sign('{}'));
  });

  test('differs for different keys', () => {
    expect(new Md5Signer('a').sign('{}')).not.toBe(
      new Md5Signer('b').sign('{}'),
    );
  });
});
