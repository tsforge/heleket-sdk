import { z } from 'zod';

import { getEndpointDetails, HTTP_METHOD, REST_API } from '../../shared/api';
import { AmountLike, Currency, Network } from '../common';

export const CalculateWithdrawalRequestBodySchema = z
  .object({
    currency: Currency.Schema,
    network: Network.Schema,
    amount: AmountLike.Schema,
    isSubtract: z.boolean().default(false),
  })
  .strict();
export type ICalculateWithdrawalRequestBody = z.input<
  typeof CalculateWithdrawalRequestBodySchema
>;

export const CalculateWithdrawalResponseSchema = z.object({}).loose();
export type ICalculateWithdrawalResponse = z.infer<
  typeof CalculateWithdrawalResponseSchema
>;

export namespace CalculateWithdrawalCommand {
  export const url = REST_API.PAYOUT.POST_CALCULATE;
  export const TSQ_url = url;

  export const RequestBodySchema = CalculateWithdrawalRequestBodySchema;
  export type IRequestBody = ICalculateWithdrawalRequestBody;

  export const ResponseSchema = CalculateWithdrawalResponseSchema;
  export type IResponse = ICalculateWithdrawalResponse;

  export const endpointDetails = getEndpointDetails(
    REST_API.PAYOUT.POST_CALCULATE,
    HTTP_METHOD.POST,
    'Calculate fees for a withdrawal',
    'Returns the fees and final amounts for a hypothetical withdrawal without creating it.',
  );
}
