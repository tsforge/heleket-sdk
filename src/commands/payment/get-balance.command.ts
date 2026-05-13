import { z } from 'zod';

import { getEndpointDetails, REST_API } from '../../shared/api';
import { AmountLike } from '../common';

const BalanceEntrySchema = z
  .object({
    uuid: z.string(),
    balance: AmountLike.Schema,
    currencyCode: z.string(),
  })
  .loose();

export const GetBalanceRequestBodySchema = z.object({}).strict();
export type IGetBalanceRequestBody = z.infer<
  typeof GetBalanceRequestBodySchema
>;

export const GetBalanceResponseSchema = z.array(
  z
    .object({
      balance: z
        .object({
          merchant: z.array(BalanceEntrySchema),
          user: z.array(BalanceEntrySchema),
        })
        .loose(),
    })
    .loose(),
);
export type IGetBalanceResponse = z.infer<typeof GetBalanceResponseSchema>;

export namespace GetBalanceCommand {
  export const url = REST_API.BALANCE.POST_GET;
  export const TSQ_url = url;

  export const RequestBodySchema = GetBalanceRequestBodySchema;
  export type IRequestBody = IGetBalanceRequestBody;

  export const ResponseSchema = GetBalanceResponseSchema;
  export type IResponse = IGetBalanceResponse;

  export const endpointDetails = getEndpointDetails(
    REST_API.BALANCE.POST_GET,
    'post',
    'Get merchant and user balances',
    'Returns balance entries grouped by merchant and user, broken down by currency.',
  );
}
