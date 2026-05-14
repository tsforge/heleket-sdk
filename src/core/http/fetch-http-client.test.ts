import { describe, expect, test, vi } from 'vitest';

import { FetchHttpClient } from './fetch-http-client';
import type { FetchLike, IHttpRequest } from './interfaces';
import { TransportError } from './transport-error';

const baseRequest: IHttpRequest = {
  url: 'https://api.heleket.com/v1/payment',
  headers: { merchant: 'm', sign: 's' },
  body: '{}',
  timeoutMs: 1_000,
};

const mockResponse = (status: number, body: string): Response =>
  ({
    status,
    ok: status >= 200 && status < 300,
    text: () => Promise.resolve(body),
  }) as unknown as Response;

describe('FetchHttpClient.post', () => {
  test('returns status and body on a successful response', async () => {
    const fetchImpl: FetchLike = vi
      .fn()
      .mockResolvedValue(mockResponse(200, '{"state":0}'));
    const client = new FetchHttpClient(fetchImpl);

    const response = await client.post(baseRequest);

    expect(response.status).toBe(200);
    expect(response.body).toBe('{"state":0}');
    expect(fetchImpl).toHaveBeenCalledWith(
      baseRequest.url,
      expect.objectContaining({
        method: 'POST',
        headers: baseRequest.headers,
        body: baseRequest.body,
        signal: expect.any(AbortSignal),
      }),
    );
  });

  test('propagates non-2xx status without throwing', async () => {
    const fetchImpl: FetchLike = vi
      .fn()
      .mockResolvedValue(mockResponse(500, 'oops'));
    const client = new FetchHttpClient(fetchImpl);

    const response = await client.post(baseRequest);

    expect(response.status).toBe(500);
    expect(response.body).toBe('oops');
  });

  test('wraps a generic fetch error into TransportError with NETWORK_ERROR code', async () => {
    const fetchImpl: FetchLike = vi.fn().mockRejectedValue(new Error('boom'));
    const client = new FetchHttpClient(fetchImpl);

    await expect(client.post(baseRequest)).rejects.toMatchObject({
      name: 'TransportError',
      error: { code: 'N001' },
      message: 'boom',
    });
  });

  test('wraps a non-Error fetch rejection into TransportError', async () => {
    const fetchImpl: FetchLike = vi.fn().mockRejectedValue('weird');
    const client = new FetchHttpClient(fetchImpl);

    await expect(client.post(baseRequest)).rejects.toBeInstanceOf(
      TransportError,
    );
  });

  test('reports TIMEOUT_ERROR when the timeout signal fires first', async () => {
    const fetchImpl: FetchLike = (_input, init) =>
      new Promise((_resolve, reject) => {
        init?.signal?.addEventListener('abort', () => {
          reject(new DOMException('Aborted', 'AbortError'));
        });
      });
    const client = new FetchHttpClient(fetchImpl);

    await expect(
      client.post({ ...baseRequest, timeoutMs: 5 }),
    ).rejects.toMatchObject({
      name: 'TransportError',
      error: { code: 'T001' },
    });
  });

  test('cancels the in-flight fetch when the user signal aborts', async () => {
    const controller = new AbortController();
    const fetchImpl: FetchLike = vi.fn((_input, init) => {
      return new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener('abort', () => {
          reject(new DOMException('Aborted', 'AbortError'));
        });
      });
    });
    const client = new FetchHttpClient(fetchImpl);

    const pending = client.post({
      ...baseRequest,
      timeoutMs: 5_000,
      signal: controller.signal,
    });
    controller.abort();

    await expect(pending).rejects.toBeInstanceOf(TransportError);
  });

  test('does not cancel when neither user nor timeout signal fires', async () => {
    const fetchImpl: FetchLike = vi.fn((_input, init) => {
      return new Promise<Response>((resolve) => {
        setTimeout(() => {
          if (init?.signal?.aborted) {
            return;
          }
          resolve(mockResponse(200, 'ok'));
        }, 10);
      });
    });
    const client = new FetchHttpClient(fetchImpl);

    const response = await client.post({
      ...baseRequest,
      timeoutMs: 1_000,
    });
    expect(response.body).toBe('ok');
  });

  test('honors an already-aborted user signal', async () => {
    const controller = new AbortController();
    controller.abort();
    const fetchImpl: FetchLike = vi.fn((_input, init) => {
      if (init?.signal?.aborted) {
        return Promise.reject(new DOMException('Aborted', 'AbortError'));
      }
      return Promise.resolve(mockResponse(200, 'late'));
    });
    const client = new FetchHttpClient(fetchImpl);

    await expect(
      client.post({
        ...baseRequest,
        signal: controller.signal,
      }),
    ).rejects.toBeInstanceOf(TransportError);
  });
});
