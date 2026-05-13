import { z } from 'zod';

import { AmountLike } from './amount.schema';
import { PayoutStatus } from './payout-status';

export namespace PayoutRecord {
  export const Schema = z
    .object({
      uuid: z.string(),
      amount: AmountLike.Schema,
      currency: z.string(),
      network: z.string(),
      address: z.string(),
      txid: z.string().nullable().optional(),
      status: PayoutStatus.Schema,
      isFinal: z.boolean(),
      balance: AmountLike.Schema,
      orderId: z.string().optional(),
      payerCurrency: z.string().optional(),
      payerAmount: AmountLike.Schema.optional(),
      commission: AmountLike.Schema.optional(),
      merchantAmount: AmountLike.Schema.optional(),
    })
    .loose();

  export type Value = z.infer<typeof Schema>;
}
