import { describe, expect, test } from 'vitest';

import { HeleketClient } from '../client';
import { Md5Signer } from '../core/signer';
import {
  createFetchMock,
  errorEnvelope,
  successEnvelope,
} from '../__tests__/helpers';

const merchantUuid = '8b03432e-385b-4670-8d06-064591096795';
const paymentKey = 'test-payment-key';

const makeClient = (
  fetchImpl: ReturnType<typeof createFetchMock>['fetch'],
): HeleketClient =>
  new HeleketClient({
    paymentKey,
    merchantUuid,
    fetch: fetchImpl,
    retry: { retries: 0, baseDelayMs: 1, maxDelayMs: 1 },
  });

describe('PaymentResource.create', () => {
  test('sends signed POST with snake_case body and returns camelCase data', async () => {
    const mock = createFetchMock({
      status: 200,
      body: successEnvelope({
        uuid: 'u',
        order_id: '555',
        amount: '16',
        currency: 'USD',
        url: 'https://pay.heleket.com/pay/u',
        payment_status: 'check',
        is_final: false,
      }),
    });
    const client = makeClient(mock.fetch);

    const res = await client.payment.create({
      amount: '16',
      currency: 'USD',
      orderId: '555',
      urlCallback: 'https://example.com/cb',
    });

    expect(res.isSuccess).toBe(true);
    expect(res.data?.uuid).toBe('u');
    expect(res.data?.orderId).toBe('555');

    expect(mock.captured).toHaveLength(1);
    const sent = mock.captured[0]!;
    expect(sent.url).toBe('https://api.heleket.com/v1/payment');
    expect(sent.headers['merchant']).toBe(merchantUuid);
    expect(sent.headers['Content-Type']).toBe('application/json;charset=UTF-8');
    expect(sent.headers['Accept']).toBe('application/json');

    const parsedBody = JSON.parse(sent.body) as Record<string, unknown>;
    expect(parsedBody).toMatchObject({
      amount: '16',
      currency: 'USD',
      order_id: '555',
      url_callback: 'https://example.com/cb',
    });
    expect(sent.headers['sign']).toBe(
      new Md5Signer(paymentKey).sign(sent.body),
    );
  });

  test('returns VALIDATION_ERROR on invalid input without calling fetch', async () => {
    const mock = createFetchMock({});
    const client = makeClient(mock.fetch);

    const res = await client.payment.create({
      amount: '1',
      currency: 'USD',
      orderId: '',
    });

    expect(res.isSuccess).toBe(false);
    expect(res.code).toBe('V001');
    expect(mock.calls).toBe(0);
  });

  test('returns API_ERROR when API returns non-zero state', async () => {
    const mock = createFetchMock({
      status: 200,
      body: errorEnvelope('amount too low'),
    });
    const client = makeClient(mock.fetch);

    const res = await client.payment.create({
      amount: '1',
      currency: 'USD',
      orderId: '1',
    });

    expect(res.isSuccess).toBe(false);
    expect(res.code).toBe('A001');
    expect(res.message).toContain('amount too low');
  });

  test('forwards server-side validation errors in res.errors', async () => {
    const validationErrors = {
      amount: ['must be a positive number'],
      currency: ['unsupported'],
    };
    const mock = createFetchMock({
      status: 422,
      body: errorEnvelope('Validation error', validationErrors),
    });
    const client = makeClient(mock.fetch);

    const res = await client.payment.create({
      amount: '1',
      currency: 'USD',
      orderId: '1',
    });

    expect(res.isSuccess).toBe(false);
    expect(res.code).toBe('A001');
    expect(res.errors).toEqual(validationErrors);
  });

  test('returns API_ERROR on non-2xx HTTP status', async () => {
    const mock = createFetchMock({
      status: 401,
      body: errorEnvelope('unauthorized'),
    });
    const client = makeClient(mock.fetch);

    const res = await client.payment.create({
      amount: '1',
      currency: 'USD',
      orderId: '1',
    });

    expect(res.isSuccess).toBe(false);
    expect(res.code).toBe('A001');
  });

  test('throws if paymentKey is not configured', () => {
    const client = new HeleketClient({
      payoutKey: 'po',
      merchantUuid,
      fetch: createFetchMock({}).fetch,
    });
    expect(() => client.payment).toThrow(/paymentKey/);
  });
});

describe('PaymentResource.list and historyAll', () => {
  test('list sends cursor as query string, not in body', async () => {
    const mock = createFetchMock({
      status: 200,
      body: successEnvelope({
        items: [],
        paginate: {
          count: 0,
          hasPages: false,
          nextCursor: null,
          previousCursor: null,
          perPage: 15,
        },
      }),
    });
    const client = makeClient(mock.fetch);

    await client.payment.list({ cursor: 'abc' });
    const sent = mock.captured[0]!;
    expect(sent.url).toBe('https://api.heleket.com/v1/payment/list?cursor=abc');
    expect(sent.body).toBe('{}');
  });

  test('historyAll iterates through paginated pages', async () => {
    const page1 = successEnvelope({
      items: [
        {
          uuid: 'a',
          order_id: '1',
          amount: '1',
          currency: 'USDT',
        },
      ],
      paginate: {
        count: 1,
        hasPages: true,
        nextCursor: 'c2',
        previousCursor: null,
        perPage: 1,
      },
    });
    const page2 = successEnvelope({
      items: [
        {
          uuid: 'b',
          order_id: '2',
          amount: '2',
          currency: 'USDT',
        },
      ],
      paginate: {
        count: 1,
        hasPages: false,
        nextCursor: null,
        previousCursor: 'c1',
        perPage: 1,
      },
    });
    const mock = createFetchMock([
      { status: 200, body: page1 },
      { status: 200, body: page2 },
    ]);
    const client = makeClient(mock.fetch);

    const collected: string[] = [];
    for await (const item of client.payment.historyAll()) {
      collected.push(item.uuid);
    }
    expect(collected).toEqual(['a', 'b']);
    expect(mock.calls).toBe(2);
    expect(mock.captured[1]!.url).toBe(
      'https://api.heleket.com/v1/payment/list?cursor=c2',
    );
  });
});
