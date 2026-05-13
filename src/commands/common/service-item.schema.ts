import { z } from 'zod';

import { AmountLike } from './amount.schema';

export namespace ServiceItem {
  export const Schema = z
    .object({
      network: z.string(),
      currency: z.string(),
      isAvailable: z.boolean(),
      limit: z
        .object({
          minAmount: AmountLike.Schema,
          maxAmount: AmountLike.Schema,
        })
        .loose(),
      commission: z
        .object({
          feeAmount: AmountLike.Schema,
          percent: AmountLike.Schema,
        })
        .loose(),
    })
    .loose();

  export const ListSchema = z.array(Schema);

  export type Value = z.infer<typeof Schema>;
  export type List = z.infer<typeof ListSchema>;
}
