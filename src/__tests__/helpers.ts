import { vi } from 'vitest';

import type { FetchLike } from '../core';

export interface CapturedRequest {
  url: string;
  method?: string;
  headers: Record<string, string>;
  body: string;
}

export interface FetchMockOptions {
  status?: number;
  body?: unknown;
  textBody?: string;
}

export interface FetchMock {
  fetch: FetchLike;
  captured: CapturedRequest[];
  calls: number;
}

export const createFetchMock = (
  options: FetchMockOptions | FetchMockOptions[],
): FetchMock => {
  const queue = Array.isArray(options) ? [...options] : [options];
  const captured: CapturedRequest[] = [];
  const state = { calls: 0 };

  const fetchImpl: FetchLike = async (input, init) => {
    state.calls += 1;
    const headers: Record<string, string> = {};
    if (init?.headers) {
      const h = init.headers as Record<string, string>;
      for (const [k, v] of Object.entries(h)) headers[k] = String(v);
    }
    captured.push({
      url: String(input),
      ...(init?.method ? { method: init.method } : {}),
      headers,
      body: typeof init?.body === 'string' ? init.body : '',
    });
    const next = queue.shift() ?? queue[queue.length - 1] ?? {};
    const textBody =
      next.textBody ??
      (next.body !== undefined ? JSON.stringify(next.body) : '');
    const status = next.status ?? 200;
    return {
      status,
      ok: status >= 200 && status < 300,
      text: () => Promise.resolve(textBody),
    } as unknown as Response;
  };

  return {
    fetch: vi.fn(fetchImpl) as unknown as FetchLike,
    captured,
    get calls() {
      return state.calls;
    },
  };
};

export const successEnvelope = (result: unknown): unknown => ({
  state: 0,
  result,
});

export const errorEnvelope = (message: string, errors?: unknown): unknown => {
  if (errors !== undefined) {
    return { state: 1, message, errors };
  }
  return { state: 1, message };
};
