import { describe, expect, test } from 'vitest';

import { HeleketClient } from '../client';
import { createFetchMock, successEnvelope } from '../__tests__/helpers';

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

describe('PayoutResource.create', () => {
  test('sends signed POST and returns camelCase data', async () => {
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

    const res = await client.payout.create({
      amount: '15',
      currency: 'USDT',
      network: 'TRON',
      orderId: '555321',
      address: 'TXguLRFtrAFrEDA17WuPfrxB84jVzJcNNV',
      isSubtract: '1',
      urlCallback: 'https://example.com/callback',
    });

    expect(res.isSuccess).toBe(true);
    expect(res.data?.uuid).toBe('a7c0caec-a594-4aaa-b1c4-77d511857594');
    expect(res.data?.isFinal).toBe(false);

    const sent = mock.captured[0]!;
    expect(sent.url).toBe('https://api.heleket.com/v1/payout');
    const body = JSON.parse(sent.body) as Record<string, unknown>;
    expect(body).toMatchObject({
      order_id: '555321',
      is_subtract: '1',
      url_callback: 'https://example.com/callback',
    });
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
