import { describe, expect, test } from 'vitest';

import { HeleketClient } from '../client';
import { Md5Signer } from '../core';
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

  test('list forwards dateFrom/dateTo in body and cursor in query', async () => {
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

    await client.payment.list({
      cursor: 'tok',
      dateFrom: '2024-01-01 00:00:00',
      dateTo: '2024-01-31 23:59:59',
    });
    const sent = mock.captured[0]!;
    expect(sent.url).toBe('https://api.heleket.com/v1/payment/list?cursor=tok');
    const body = JSON.parse(sent.body) as Record<string, unknown>;
    expect(body).toEqual({
      date_from: '2024-01-01 00:00:00',
      date_to: '2024-01-31 23:59:59',
    });
  });

  test('historyAll stops cleanly on API error', async () => {
    const mock = createFetchMock({
      status: 200,
      body: errorEnvelope('boom'),
    });
    const client = makeClient(mock.fetch);

    const collected: string[] = [];
    for await (const item of client.payment.historyAll()) {
      collected.push(item.uuid);
    }
    expect(collected).toEqual([]);
    expect(mock.calls).toBe(1);
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

describe('PaymentResource.info', () => {
  test('sends payment/info with order_id when orderId provided', async () => {
    const mock = createFetchMock({
      status: 200,
      body: successEnvelope({
        uuid: 'u',
        order_id: '555',
        amount: '16',
        currency: 'USD',
        payment_status: 'paid',
        is_final: true,
      }),
    });
    const client = makeClient(mock.fetch);

    const res = await client.payment.info({ orderId: '555' });

    expect(res.isSuccess).toBe(true);
    expect(res.data?.paymentStatus).toBe('paid');

    const sent = mock.captured[0]!;
    expect(sent.url).toBe('https://api.heleket.com/v1/payment/info');
    const body = JSON.parse(sent.body) as Record<string, unknown>;
    expect(body).toEqual({ order_id: '555' });
  });

  test('returns VALIDATION_ERROR when neither uuid nor orderId provided', async () => {
    const mock = createFetchMock({});
    const client = makeClient(mock.fetch);

    const res = await client.payment.info({});

    expect(res.isSuccess).toBe(false);
    expect(res.code).toBe('V001');
    expect(mock.calls).toBe(0);
  });
});

describe('PaymentResource.services', () => {
  test('sends empty-body POST and parses the services array', async () => {
    const mock = createFetchMock({
      status: 200,
      body: successEnvelope([
        {
          network: 'TRON',
          currency: 'USDT',
          is_available: true,
          limit: { min_amount: '1', max_amount: '1000' },
          commission: { fee_amount: '1', percent: '0' },
        },
      ]),
    });
    const client = makeClient(mock.fetch);

    const res = await client.payment.services();

    expect(res.isSuccess).toBe(true);
    expect(res.data).toHaveLength(1);

    const sent = mock.captured[0]!;
    expect(sent.url).toBe('https://api.heleket.com/v1/payment/services');
    expect(sent.body).toBe('{}');
  });
});

describe('PaymentResource.resend', () => {
  test('sends payment/resend with uuid when uuid provided', async () => {
    const mock = createFetchMock({
      status: 200,
      body: successEnvelope({ success: true }),
    });
    const client = makeClient(mock.fetch);

    const res = await client.payment.resend({
      uuid: 'a7c0caec-a594-4aaa-b1c4-77d511857594',
    });

    expect(res.isSuccess).toBe(true);
    const sent = mock.captured[0]!;
    expect(sent.url).toBe('https://api.heleket.com/v1/payment/resend');
    const body = JSON.parse(sent.body) as Record<string, unknown>;
    expect(body).toEqual({ uuid: 'a7c0caec-a594-4aaa-b1c4-77d511857594' });
  });
});

describe('PaymentResource.wallet', () => {
  test('sends wallet creation request with snake_case body', async () => {
    const mock = createFetchMock({
      status: 200,
      body: successEnvelope({
        uuid: 'w',
        order_id: 'w-1',
        currency: 'USDT',
        network: 'TRON',
        address: 'T...',
      }),
    });
    const client = makeClient(mock.fetch);

    const res = await client.payment.wallet({
      currency: 'USDT',
      network: 'TRON',
      orderId: 'w-1',
      urlCallback: 'https://example.com/cb',
    });

    expect(res.isSuccess).toBe(true);
    expect(res.data?.address).toBe('T...');

    const sent = mock.captured[0]!;
    expect(sent.url).toBe('https://api.heleket.com/v1/wallet');
    const body = JSON.parse(sent.body) as Record<string, unknown>;
    expect(body).toEqual({
      currency: 'USDT',
      network: 'TRON',
      order_id: 'w-1',
      url_callback: 'https://example.com/cb',
    });
  });

  test('returns VALIDATION_ERROR when orderId is empty', async () => {
    const mock = createFetchMock({});
    const client = makeClient(mock.fetch);

    const res = await client.payment.wallet({
      currency: 'USDT',
      network: 'TRON',
      orderId: '',
    });

    expect(res.isSuccess).toBe(false);
    expect(res.code).toBe('V001');
    expect(mock.calls).toBe(0);
  });
});

describe('PaymentResource.balance', () => {
  test('sends empty-body POST to /balance and parses the array result', async () => {
    const mock = createFetchMock({
      status: 200,
      body: successEnvelope([
        {
          balance: {
            merchant: [{ uuid: 'm1', balance: '100.00', currencyCode: 'USDT' }],
            user: [{ uuid: 'u1', balance: '50.00', currencyCode: 'USDT' }],
          },
        },
      ]),
    });
    const client = makeClient(mock.fetch);

    const res = await client.payment.balance();

    expect(res.isSuccess).toBe(true);
    expect(res.data).toHaveLength(1);
    expect(res.data?.[0]?.balance.merchant[0]?.currencyCode).toBe('USDT');

    const sent = mock.captured[0]!;
    expect(sent.url).toBe('https://api.heleket.com/v1/balance');
    expect(sent.body).toBe('{}');
  });
});

describe('HeleketClient payment-key gating', () => {
  test('throws when accessing paymentWebhook without paymentKey', () => {
    const client = new HeleketClient({
      payoutKey: 'po',
      merchantUuid,
      fetch: createFetchMock({}).fetch,
    });
    expect(() => client.paymentWebhook).toThrow(/paymentKey/);
  });

  test('paymentWebhook is constructed lazily and reused', () => {
    const client = new HeleketClient({
      paymentKey,
      merchantUuid,
      fetch: createFetchMock({}).fetch,
    });
    expect(client.paymentWebhook).toBe(client.paymentWebhook);
  });

  test('payment resource is constructed lazily and reused', () => {
    const client = new HeleketClient({
      paymentKey,
      merchantUuid,
      fetch: createFetchMock({}).fetch,
    });
    expect(client.payment).toBe(client.payment);
  });
});
