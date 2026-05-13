import type { z } from 'zod';

import { getEndpointDetails, REST_API } from '../../shared/api';
import { ByUuidOrOrderId, PayoutRecord } from '../common';

export const GetPayoutInfoRequestBodySchema = ByUuidOrOrderId.Schema;
export type IGetPayoutInfoRequestBody = z.infer<
  typeof GetPayoutInfoRequestBodySchema
>;

export const GetPayoutInfoResponseSchema = PayoutRecord.Schema;
export type IGetPayoutInfoResponse = z.infer<
  typeof GetPayoutInfoResponseSchema
>;

export namespace GetPayoutInfoCommand {
  export const url = REST_API.PAYOUT.POST_INFO;
  export const TSQ_url = url;

  export const RequestBodySchema = GetPayoutInfoRequestBodySchema;
  export type IRequestBody = IGetPayoutInfoRequestBody;

  export const ResponseSchema = GetPayoutInfoResponseSchema;
  export type IResponse = IGetPayoutInfoResponse;

  export const endpointDetails = getEndpointDetails(
    REST_API.PAYOUT.POST_INFO,
    'post',
    'Get information about a payout',
    'Retrieves a single payout by uuid or order_id. If both are provided, order_id wins.',
  );
}
