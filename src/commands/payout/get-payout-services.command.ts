import { z } from 'zod';

import { getEndpointDetails, REST_API } from '../../shared/api';
import { ServiceItem } from '../common';

export const GetPayoutServicesRequestBodySchema = z.object({}).strict();
export type IGetPayoutServicesRequestBody = z.infer<
  typeof GetPayoutServicesRequestBodySchema
>;

export const GetPayoutServicesResponseSchema = ServiceItem.ListSchema;
export type IGetPayoutServicesResponse = z.infer<
  typeof GetPayoutServicesResponseSchema
>;

export namespace GetPayoutServicesCommand {
  export const url = REST_API.PAYOUT.POST_SERVICES;
  export const TSQ_url = url;

  export const RequestBodySchema = GetPayoutServicesRequestBodySchema;
  export type IRequestBody = IGetPayoutServicesRequestBody;

  export const ResponseSchema = GetPayoutServicesResponseSchema;
  export type IResponse = IGetPayoutServicesResponse;

  export const endpointDetails = getEndpointDetails(
    REST_API.PAYOUT.POST_SERVICES,
    'post',
    'List available payout services',
  );
}
