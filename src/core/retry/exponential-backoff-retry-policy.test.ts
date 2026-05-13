import { describe, expect, test, vi } from 'vitest';

import { ERRORS } from '../../constants';
import { TransportError } from '../http';
import { ExponentialBackoffRetryPolicy } from './exponential-backoff-retry-policy';
import { RetryOutcomeKind } from './interfaces';
import type { RetryOutcome, RetryPredicate } from './interfaces';

const policy = new ExponentialBackoffRetryPolicy({
  retries: 3,
  baseDelayMs: 10,
  maxDelayMs: 50,
  sleep: () => Promise.resolve(),
  random: () => 0,
});

interface FakeResponse {
  status: number;
}

const isRetryable: RetryPredicate<FakeResponse> = (
  outcome: RetryOutcome<FakeResponse>,
): boolean => {
  if (outcome.kind === RetryOutcomeKind.Error) {
    return outcome.error instanceof TransportError;
  }
  return outcome.value.status >= 500 || outcome.value.status === 429;
};

describe('ExponentialBackoffRetryPolicy', () => {
  test('returns the result on first success', async () => {
    const fn = vi.fn(async (): Promise<FakeResponse> => ({ status: 200 }));
    const res = await policy.execute(fn, isRetryable);
    expect(res.status).toBe(200);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  test('retries on 5xx and eventually succeeds', async () => {
    const responses: FakeResponse[] = [
      { status: 500 },
      { status: 502 },
      { status: 200 },
    ];
    let i = 0;
    const fn = vi.fn(async (): Promise<FakeResponse> => responses[i++]!);
    const res = await policy.execute(fn, isRetryable);
    expect(res.status).toBe(200);
    expect(fn).toHaveBeenCalledTimes(3);
  });

  test('retries on 429', async () => {
    const responses: FakeResponse[] = [{ status: 429 }, { status: 200 }];
    let i = 0;
    const fn = vi.fn(async (): Promise<FakeResponse> => responses[i++]!);
    const res = await policy.execute(fn, isRetryable);
    expect(res.status).toBe(200);
    expect(fn).toHaveBeenCalledTimes(2);
  });

  test('does not retry on 4xx (except 429)', async () => {
    const fn = vi.fn(async (): Promise<FakeResponse> => ({ status: 400 }));
    const res = await policy.execute(fn, isRetryable);
    expect(res.status).toBe(400);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  test('returns last response after exhausting retries on 5xx', async () => {
    const fn = vi.fn(async (): Promise<FakeResponse> => ({ status: 500 }));
    const res = await policy.execute(fn, isRetryable);
    expect(res.status).toBe(500);
    expect(fn).toHaveBeenCalledTimes(4);
  });

  test('throws TransportError after exhausting retries on network errors', async () => {
    const fn = vi.fn(async (): Promise<FakeResponse> => {
      throw new TransportError(ERRORS.NETWORK_ERROR);
    });
    await expect(policy.execute(fn, isRetryable)).rejects.toBeInstanceOf(
      TransportError,
    );
    expect(fn).toHaveBeenCalledTimes(4);
  });
});
