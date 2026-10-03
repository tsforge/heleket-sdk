import { describe, expect, test } from 'vitest';

import { HeleketClient } from './client';
import { createFetchMock } from './__tests__/helpers';

describe('HeleketClient', () => {
  test('requires merchantUuid', () => {
    expect(
      () =>
        new HeleketClient({
          paymentKey: 'p',
          merchantUuid: '',
          fetch: createFetchMock({}).fetch,
        }),
    ).toThrow(/merchantUuid/);
  });

  test('requires at least one of paymentKey or payoutKey', () => {
    expect(
      () =>
        new HeleketClient({
          merchantUuid: 'u',
          fetch: createFetchMock({}).fetch,
        }),
    ).toThrow(/paymentKey or payoutKey/);
  });

  test('memoizes the resource instances', () => {
    const client = new HeleketClient({
      paymentKey: 'p',
      payoutKey: 'po',
      merchantUuid: 'u',
      fetch: createFetchMock({}).fetch,
    });
    expect(client.payment).toBe(client.payment);
    expect(client.payout).toBe(client.payout);
  });
});

describe('HeleketClient urlBuilder injection', () => {
  test('uses the urlBuilder passed in options for every request', async () => {
    const mock = createFetchMock({
      status: 200,
      body: { state: 0, result: [] },
    });
    const urls: string[] = [];
    const client = new HeleketClient({
      paymentKey: 'p',
      merchantUuid: 'u',
      fetch: mock.fetch,
      urlBuilder: {
        build: (endpoint) => {
          urls.push(endpoint);
          return `https://proxy.example/${endpoint}`;
        },
      },
    });

    await client.payment.services();

    expect(urls).toEqual(['payment/services']);
    expect(mock.captured[0]!.url).toBe(
      'https://proxy.example/payment/services',
    );
  });
});
