import type { ZodType } from 'zod';

export interface ICommandDescriptor<TIn, TOut> {
  readonly url: string;
  readonly RequestBodySchema: ZodType<TIn>;
  readonly ResponseSchema: ZodType<TOut>;
}
