import { z } from 'zod';

export namespace Paginate {
  export const Schema = z
    .object({
      count: z.number().int().nonnegative(),
      hasPages: z.boolean(),
      nextCursor: z.string().nullable(),
      previousCursor: z.string().nullable(),
      perPage: z.number().int().positive(),
    })
    .loose();

  export type Value = z.infer<typeof Schema>;
}
