import { describe, expect, test } from 'vitest';

import { Md5Signer } from '../core/signer';
import { WebhookVerifier } from './webhook-verifier';

const apiKey = 'webhook-key';
const signer = new Md5Signer(apiKey);
const verifier = new WebhookVerifier(signer);

const signedPayload = (
  data: Record<string, unknown>,
): Record<string, unknown> => ({
  ...data,
  sign: signer.sign(JSON.stringify(data)),
});

describe('WebhookVerifier', () => {
  test('returns true for a valid signed string payload', () => {
    const payload = signedPayload({ uuid: 'abc', status: 'paid', amount: '1' });
    expect(verifier.verify(JSON.stringify(payload))).toBe(true);
  });

  test('returns true for a valid signed object payload', () => {
    const payload = signedPayload({ uuid: 'abc', status: 'paid' });
    expect(verifier.verify(payload)).toBe(true);
  });

  test('returns false when sign is missing', () => {
    expect(verifier.verify({ uuid: 'abc' })).toBe(false);
  });

  test('returns false when sign is wrong', () => {
    const payload = {
      uuid: 'abc',
      status: 'paid',
      sign: 'deadbeef'.repeat(4),
    };
    expect(verifier.verify(payload)).toBe(false);
  });

  test('returns false when key does not match', () => {
    const payload = signedPayload({ uuid: 'abc' });
    const wrongVerifier = new WebhookVerifier(new Md5Signer('wrong-key'));
    expect(wrongVerifier.verify(payload)).toBe(false);
  });

  test('returns false for malformed JSON string', () => {
    expect(verifier.verify('{not json')).toBe(false);
  });

  test('returns false for non-object payloads', () => {
    expect(verifier.verify('[]')).toBe(false);
    expect(verifier.verify('null')).toBe(false);
  });
});
