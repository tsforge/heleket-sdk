import type { ZodType } from 'zod';

import type { THttpMethod } from '../../../shared/api';

export interface ICommandDescriptor<TIn, TOut> {
  readonly url: string;
  readonly method?: THttpMethod | undefined;
  readonly RequestBodySchema: ZodType<TIn>;
  readonly ResponseSchema: ZodType<TOut>;
}
