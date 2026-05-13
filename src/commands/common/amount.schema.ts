import { z } from 'zod';

export namespace AmountLike {
  export const Schema = z.union([z.string(), z.number()]);

  export type Value = z.infer<typeof Schema>;
}
