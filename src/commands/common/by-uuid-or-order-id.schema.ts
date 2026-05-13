import { z } from 'zod';

export namespace ByUuidOrOrderId {
  export const Schema = z
    .object({
      uuid: z.uuid().optional(),
      orderId: z.string().min(1).optional(),
    })
    .strict()
    .refine((v) => v.uuid !== undefined || v.orderId !== undefined, {
      message: 'Either uuid or orderId must be provided',
    });

  export type Value = z.infer<typeof Schema>;
}
