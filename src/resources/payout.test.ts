import { describe, expect, test } from 'vitest';

import { HeleketClient } from '../client';
import { Md5Signer } from '../core';
import {
  createFetchMock,
  errorEnvelope,
  successEnvelope,
} from '../__tests__/helpers';

const merchantUuid = 'c26b80a8-9549-4a66-bb53-774f12809249';
const payoutKey = 'test-payout-key';

const makeClient = (
  fetchImpl: ReturnType<typeof createFetchMock>['fetch'],
): HeleketClient =>
  new HeleketClient({
    payoutKey,
    merchantUuid,
    fetch: fetchImpl,
    retry: { retries: 0, baseDelayMs: 1, maxDelayMs: 1 },
  });

const validPayoutInput = {
  amount: '15',
  currency: 'USDT',
  network: 'TRON',
  orderId: '555321',
  address: 'TXguLRFtrAFrEDA17WuPfrxB84jVzJcNNV',
  isSubtract: '1' as const,
  urlCallback: 'https://example.com/callback',
};

describe('PayoutResource.create', () => {
  test('sends signed POST with snake_case body and returns camelCase data', async () => {
    const mock = createFetchMock({
      status: 200,
      body: successEnvelope({
        uuid: 'a7c0caec-a594-4aaa-b1c4-77d511857594',
        amount: '3',
        currency: 'TRX',
        network: 'tron',
        address: 'TJ...',
        txid: null,
        status: 'process',
        is_final: false,
        balance: 129,
      }),
    });
    const client = makeClient(mock.fetch);

    const res = await client.payout.create(validPayoutInput);

    expect(res.isSuccess).toBe(true);
    expect(res.data?.uuid).toBe('a7c0caec-a594-4aaa-b1c4-77d511857594');
    expect(res.data?.isFinal).toBe(false);

    expect(mock.captured).toHaveLength(1);
    const sent = mock.captured[0]!;
    expect(sent.url).toBe('https://api.heleket.com/v1/payout');
    expect(sent.headers['merchant']).toBe(merchantUuid);
    expect(sent.headers['Content-Type']).toBe('application/json;charset=UTF-8');
    expect(sent.headers['Accept']).toBe('application/json');

    const body = JSON.parse(sent.body) as Record<string, unknown>;
    expect(body).toMatchObject({
      amount: '15',
      currency: 'USDT',
      network: 'TRON',
      order_id: '555321',
      address: validPayoutInput.address,
      is_subtract: '1',
      url_callback: 'https://example.com/callback',
    });
    expect(sent.headers['sign']).toBe(new Md5Signer(payoutKey).sign(sent.body));
  });

  test('returns VALIDATION_ERROR on invalid input without calling fetch', async () => {
    const mock = createFetchMock({});
    const client = makeClient(mock.fetch);

    const res = await client.payout.create({
      ...validPayoutInput,
      orderId: '',
    });

    expect(res.isSuccess).toBe(false);
    expect(res.code).toBe('V001');
    expect(mock.calls).toBe(0);
  });

  test('forwards server-side validation errors in res.errors', async () => {
    const serverErrors = { amount: ['too small'] };
    const mock = createFetchMock({
      status: 422,
      body: errorEnvelope('Validation error', serverErrors),
    });
    const client = makeClient(mock.fetch);

    const res = await client.payout.create(validPayoutInput);

    expect(res.isSuccess).toBe(false);
    expect(res.code).toBe('A001');
    expect(res.errors).toEqual(serverErrors);
  });

  test('returns API_ERROR on non-2xx HTTP status', async () => {
    const mock = createFetchMock({
      status: 401,
      body: errorEnvelope('unauthorized'),
    });
    const client = makeClient(mock.fetch);

    const res = await client.payout.create(validPayoutInput);

    expect(res.isSuccess).toBe(false);
    expect(res.code).toBe('A001');
  });

  test('throws if payoutKey is not configured', () => {
    const client = new HeleketClient({
      paymentKey: 'pm',
      merchantUuid,
      fetch: createFetchMock({}).fetch,
    });
    expect(() => client.payout).toThrow(/payoutKey/);
  });
});

describe('PayoutResource.info', () => {
  test('sends payout/info with order_id when orderId provided', async () => {
    const mock = createFetchMock({
      status: 200,
      body: successEnvelope({
        uuid: 'u',
        order_id: 'po-1',
        amount: '10',
        currency: 'USDT',
        network: 'tron',
        address: 'T...',
        status: 'paid',
        is_final: true,
        balance: '100',
      }),
    });
    const client = makeClient(mock.fetch);

    const res = await client.payout.info({ orderId: 'po-1' });

    expect(res.isSuccess).toBe(true);
    expect(res.data?.status).toBe('paid');

    const sent = mock.captured[0]!;
    expect(sent.url).toBe('https://api.heleket.com/v1/payout/info');
    const body = JSON.parse(sent.body) as Record<string, unknown>;
    expect(body).toEqual({ order_id: 'po-1' });
  });

  test('returns VALIDATION_ERROR when neither uuid nor orderId provided', async () => {
    const mock = createFetchMock({});
    const client = makeClient(mock.fetch);

    const res = await client.payout.info({});

    expect(res.isSuccess).toBe(false);
    expect(res.code).toBe('V001');
    expect(mock.calls).toBe(0);
  });
});

describe('PayoutResource.services', () => {
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

    const res = await client.payout.services();

    expect(res.isSuccess).toBe(true);
    expect(res.data).toHaveLength(1);

    const sent = mock.captured[0]!;
    expect(sent.url).toBe('https://api.heleket.com/v1/payout/services');
    expect(sent.body).toBe('{}');
  });
});

describe('PayoutResource.list and historyAll', () => {
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

    await client.payout.list({ cursor: 'abc' });
    const sent = mock.captured[0]!;
    expect(sent.url).toBe('https://api.heleket.com/v1/payout/list?cursor=abc');
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

    await client.payout.list({
      cursor: 'tok',
      dateFrom: '2024-01-01 00:00:00',
      dateTo: '2024-01-31 23:59:59',
    });
    const sent = mock.captured[0]!;
    expect(sent.url).toBe('https://api.heleket.com/v1/payout/list?cursor=tok');
    const body = JSON.parse(sent.body) as Record<string, unknown>;
    expect(body).toEqual({
      date_from: '2024-01-01 00:00:00',
      date_to: '2024-01-31 23:59:59',
    });
  });

  test('historyAll iterates through paginated pages', async () => {
    const page1 = successEnvelope({
      items: [
        {
          uuid: 'a',
          order_id: '1',
          amount: '1',
          currency: 'USDT',
          network: 'tron',
          address: 'T...',
          status: 'paid',
          is_final: true,
          balance: '100',
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
          network: 'tron',
          address: 'T...',
          status: 'process',
          is_final: false,
          balance: '100',
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
    for await (const item of client.payout.historyAll()) {
      collected.push(item.uuid);
    }
    expect(collected).toEqual(['a', 'b']);
    expect(mock.calls).toBe(2);
    expect(mock.captured[1]!.url).toBe(
      'https://api.heleket.com/v1/payout/list?cursor=c2',
    );
  });

  test('historyAll stops cleanly on API error', async () => {
    const mock = createFetchMock({
      status: 200,
      body: errorEnvelope('boom'),
    });
    const client = makeClient(mock.fetch);

    const collected: string[] = [];
    for await (const item of client.payout.historyAll()) {
      collected.push(item.uuid);
    }
    expect(collected).toEqual([]);
    expect(mock.calls).toBe(1);
  });
});

describe('HeleketClient payout-key gating', () => {
  test('throws when accessing payoutWebhook without payoutKey', () => {
    const client = new HeleketClient({
      paymentKey: 'pm',
      merchantUuid,
      fetch: createFetchMock({}).fetch,
    });
    expect(() => client.payoutWebhook).toThrow(/payoutKey/);
  });

  test('payoutWebhook is constructed lazily and reused', () => {
    const client = new HeleketClient({
      payoutKey,
      merchantUuid,
      fetch: createFetchMock({}).fetch,
    });
    expect(client.payoutWebhook).toBe(client.payoutWebhook);
  });

  test('payout resource is constructed lazily and reused', () => {
    const client = new HeleketClient({
      payoutKey,
      merchantUuid,
      fetch: createFetchMock({}).fetch,
    });
    expect(client.payout).toBe(client.payout);
  });
});
