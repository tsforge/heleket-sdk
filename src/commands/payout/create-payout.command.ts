import { z } from 'zod';

import { getEndpointDetails, REST_API } from '../../shared/api';
import {
  CourseSource,
  Currency,
  Network,
  PayoutPriority,
  PayoutRecord,
} from '../common';

export const CreatePayoutRequestBodySchema = z
  .object({
    amount: z.union([z.string(), z.number()]),
    currency: Currency.Schema,
    network: Network.Schema,
    orderId: z.string().min(1).max(100),
    address: z.string(),
    isSubtract: z.union([
      z.boolean(),
      z.literal('0'),
      z.literal('1'),
      z.literal(0),
      z.literal(1),
    ]),
    urlCallback: z.string().url().optional(),
    memo: z.string().min(1).max(30).optional(),
    courseSource: CourseSource.Schema.optional(),
    fromCurrency: Currency.Schema.optional(),
    toCurrency: Currency.Schema.optional(),
    priority: PayoutPriority.Schema.optional(),
  })
  .strict();
export type ICreatePayoutRequestBody = z.input<
  typeof CreatePayoutRequestBodySchema
>;

export const CreatePayoutResponseSchema = PayoutRecord.Schema;
export type ICreatePayoutResponse = z.infer<typeof CreatePayoutResponseSchema>;

export namespace CreatePayoutCommand {
  export const url = REST_API.PAYOUT.POST_CREATE;
  export const TSQ_url = url;

  export const RequestBodySchema = CreatePayoutRequestBodySchema;
  export type IRequestBody = ICreatePayoutRequestBody;

  export const ResponseSchema = CreatePayoutResponseSchema;
  export type IResponse = ICreatePayoutResponse;

  export const endpointDetails = getEndpointDetails(
    REST_API.PAYOUT.POST_CREATE,
    'post',
    'Create a new payout',
    'Sends crypto from your merchant balance to the supplied address.',
  );
}
