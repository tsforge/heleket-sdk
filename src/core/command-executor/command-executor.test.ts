import { describe, expect, test, vi } from 'vitest';
import { z } from 'zod';

import { ERRORS } from '../../constants';
import { SnakeCaseConverter } from '../case';
import { HeleketEnvelopeParser } from '../envelope';
import type { IHttpClient, IHttpResponse } from '../http';
import { TransportError } from '../http';
import { ExponentialBackoffRetryPolicy } from '../retry';
import { Md5Signer } from '../signer';
import { UrlBuilder } from '../url';
import { CommandExecutor } from './command-executor';
import type { ICommandDescriptor } from './interfaces';

const merchantUuid = '0d8e2f8a-1234-5678-9abc-deadbeefcafe';
const apiKey = 'test-api-key';

const InputSchema = z.object({
  orderId: z.string().min(1),
});
const OutputSchema = z
  .object({
    uuid: z.string(),
    orderId: z.string(),
  })
  .loose();

type CommandIn = z.infer<typeof InputSchema>;
type CommandOut = z.infer<typeof OutputSchema>;

const testCommand: ICommandDescriptor<CommandIn, CommandOut> = {
  url: 'payment/test',
  RequestBodySchema: InputSchema,
  ResponseSchema: OutputSchema,
};

const makeQueue = (responses: Array<IHttpResponse | Error>) => {
  const post = vi.fn<IHttpClient['post']>(() => {
    const next = responses.shift();
    if (next === undefined) {
      return Promise.reject(new Error('no more responses queued'));
    }
    if (next instanceof Error) {
      return Promise.reject(next);
    }
    return Promise.resolve(next);
  });
  return {
    post,
    httpClient: { post } as IHttpClient,
  };
};

const makeExecutor = (
  httpClient: IHttpClient,
  retries: number,
): CommandExecutor =>
  new CommandExecutor({
    signer: new Md5Signer(apiKey),
    merchantUuid,
    httpClient,
    retryPolicy: new ExponentialBackoffRetryPolicy({
      retries,
      baseDelayMs: 1,
      maxDelayMs: 1,
      sleep: () => Promise.resolve(),
    }),
    caseConverter: new SnakeCaseConverter(),
    envelopeParser: new HeleketEnvelopeParser(),
    urlBuilder: new UrlBuilder('https://api.heleket.com/v1'),
    timeoutMs: 1_000,
  });

const successBody = JSON.stringify({
  state: 0,
  result: { uuid: 'u-1', order_id: 'order-1' },
});

describe('CommandExecutor.execute', () => {
  test('returns VALIDATION_ERROR for invalid input without calling http', async () => {
    const queue = makeQueue([]);
    const executor = makeExecutor(queue.httpClient, 0);

    const res = await executor.execute(testCommand, { orderId: '' });

    expect(res.isSuccess).toBe(false);
    expect(res.code).toBe('V001');
    expect(queue.post).not.toHaveBeenCalled();
  });

  test('retries on 5xx and returns success when subsequent attempt succeeds', async () => {
    const queue = makeQueue([
      { status: 503, body: '' },
      { status: 200, body: successBody },
    ]);
    const executor = makeExecutor(queue.httpClient, 3);

    const res = await executor.execute(testCommand, { orderId: 'order-1' });

    expect(res.isSuccess).toBe(true);
    expect(res.data?.uuid).toBe('u-1');
    expect(queue.post).toHaveBeenCalledTimes(2);
  });

  test('retries on 429 Too Many Requests', async () => {
    const queue = makeQueue([
      { status: 429, body: '' },
      { status: 200, body: successBody },
    ]);
    const executor = makeExecutor(queue.httpClient, 3);

    const res = await executor.execute(testCommand, { orderId: 'order-1' });

    expect(res.isSuccess).toBe(true);
    expect(queue.post).toHaveBeenCalledTimes(2);
  });

  test('retries on TransportError and returns success when subsequent attempt succeeds', async () => {
    const networkError = new TransportError(ERRORS.NETWORK_ERROR, 'down');
    const queue = makeQueue([networkError, { status: 200, body: successBody }]);
    const executor = makeExecutor(queue.httpClient, 3);

    const res = await executor.execute(testCommand, { orderId: 'order-1' });

    expect(res.isSuccess).toBe(true);
    expect(queue.post).toHaveBeenCalledTimes(2);
  });

  test('does not retry on 4xx and returns API_ERROR with server message', async () => {
    const queue = makeQueue([
      {
        status: 422,
        body: JSON.stringify({
          state: 1,
          message: 'bad input',
          errors: { amount: ['too small'] },
        }),
      },
    ]);
    const executor = makeExecutor(queue.httpClient, 3);

    const res = await executor.execute(testCommand, { orderId: 'order-1' });

    expect(res.isSuccess).toBe(false);
    expect(res.code).toBe('A001');
    expect(res.message).toBe('bad input');
    expect(res.errors).toEqual({ amount: ['too small'] });
    expect(queue.post).toHaveBeenCalledTimes(1);
  });

  test('returns TransportError-mapped failure when retries are exhausted', async () => {
    const networkError = new TransportError(
      ERRORS.NETWORK_ERROR,
      'unreachable',
    );
    const queue = makeQueue([networkError, networkError, networkError]);
    const executor = makeExecutor(queue.httpClient, 2);

    const res = await executor.execute(testCommand, { orderId: 'order-1' });

    expect(res.isSuccess).toBe(false);
    expect(res.code).toBe('N001');
    expect(res.message).toBe('unreachable');
    expect(queue.post).toHaveBeenCalledTimes(3);
  });

  test('returns PARSE_ERROR when body is not valid JSON', async () => {
    const queue = makeQueue([{ status: 200, body: '{not json' }]);
    const executor = makeExecutor(queue.httpClient, 0);

    const res = await executor.execute(testCommand, { orderId: 'order-1' });

    expect(res.isSuccess).toBe(false);
    expect(res.code).toBe('P001');
  });

  test('returns PARSE_ERROR when result fails response schema validation', async () => {
    const queue = makeQueue([
      {
        status: 200,
        body: JSON.stringify({ state: 0, result: { uuid: 123 } }),
      },
    ]);
    const executor = makeExecutor(queue.httpClient, 0);

    const res = await executor.execute(testCommand, { orderId: 'order-1' });

    expect(res.isSuccess).toBe(false);
    expect(res.code).toBe('P001');
  });

  test('returns API_ERROR when state != 0 even on HTTP 200', async () => {
    const queue = makeQueue([
      {
        status: 200,
        body: JSON.stringify({ state: 1, message: 'logical failure' }),
      },
    ]);
    const executor = makeExecutor(queue.httpClient, 0);

    const res = await executor.execute(testCommand, { orderId: 'order-1' });

    expect(res.isSuccess).toBe(false);
    expect(res.code).toBe('A001');
    expect(res.message).toBe('logical failure');
  });

  test('serializes body as snake_case JSON and signs it with the merchant key', async () => {
    const captured: Array<{
      url: string;
      body: string;
      headers: Record<string, string>;
    }> = [];
    const httpClient: IHttpClient = {
      post: (request) => {
        captured.push({
          url: request.url,
          body: request.body,
          headers: request.headers,
        });
        return Promise.resolve({ status: 200, body: successBody });
      },
    };
    const executor = makeExecutor(httpClient, 0);

    await executor.execute(testCommand, { orderId: 'order-1' });

    expect(captured).toHaveLength(1);
    const sent = captured[0]!;
    expect(sent.url).toBe('https://api.heleket.com/v1/payment/test');
    expect(JSON.parse(sent.body)).toEqual({ order_id: 'order-1' });
    expect(sent.headers['merchant']).toBe(merchantUuid);
    expect(sent.headers['sign']).toBe(new Md5Signer(apiKey).sign(sent.body));
  });

  test('forwards query params to the URL via the UrlBuilder', async () => {
    const captured: string[] = [];
    const httpClient: IHttpClient = {
      post: (request) => {
        captured.push(request.url);
        return Promise.resolve({ status: 200, body: successBody });
      },
    };
    const executor = makeExecutor(httpClient, 0);

    await executor.execute(
      testCommand,
      { orderId: 'order-1' },
      { query: { cursor: 'next-tok' } },
    );

    expect(captured[0]).toBe(
      'https://api.heleket.com/v1/payment/test?cursor=next-tok',
    );
  });

  test('forwards AbortSignal to the http client', async () => {
    const seenSignals: Array<AbortSignal | undefined> = [];
    const httpClient: IHttpClient = {
      post: (request) => {
        seenSignals.push(request.signal);
        return Promise.resolve({ status: 200, body: successBody });
      },
    };
    const executor = makeExecutor(httpClient, 0);
    const controller = new AbortController();

    await executor.execute(
      testCommand,
      { orderId: 'order-1' },
      { signal: controller.signal },
    );

    expect(seenSignals[0]).toBe(controller.signal);
  });

  test('re-throws non-TransportError errors from the http client', async () => {
    const httpClient: IHttpClient = {
      post: () => Promise.reject(new RangeError('boom')),
    };
    const executor = makeExecutor(httpClient, 0);

    await expect(
      executor.execute(testCommand, { orderId: 'order-1' }),
    ).rejects.toBeInstanceOf(RangeError);
  });
});
