import { z } from 'zod';

import { AmountLike } from './amount.schema';
import { PaymentStatus } from './payment-status';

export namespace PaymentRecord {
  export const Schema = z
    .object({
      uuid: z.string(),
      orderId: z.string(),
      amount: AmountLike.Schema,
      paymentAmount: AmountLike.Schema.nullable().optional(),
      paymentAmountUsd: AmountLike.Schema.nullable().optional(),
      merchantAmount: AmountLike.Schema.nullable().optional(),
      commission: AmountLike.Schema.nullable().optional(),
      currency: z.string(),
      payerCurrency: z.string().nullable().optional(),
      network: z.string().nullable().optional(),
      address: z.string().nullable().optional(),
      from: z.string().nullable().optional(),
      txid: z.string().nullable().optional(),
      paymentStatus: PaymentStatus.Schema.optional(),
      status: PaymentStatus.Schema.optional(),
      url: z.string().optional(),
      expiredAt: z.number().int().optional(),
      isFinal: z.boolean().optional(),
      additionalData: z.string().nullable().optional(),
      comments: z.string().nullable().optional(),
    })
    .loose();

  export type Value = z.infer<typeof Schema>;
}
