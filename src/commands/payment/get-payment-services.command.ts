import { z } from 'zod';

import { getEndpointDetails, REST_API } from '../../shared/api';
import { ServiceItem } from '../common';

export const GetPaymentServicesRequestBodySchema = z.object({}).strict();
export type IGetPaymentServicesRequestBody = z.infer<
  typeof GetPaymentServicesRequestBodySchema
>;

export const GetPaymentServicesResponseSchema = ServiceItem.ListSchema;
export type IGetPaymentServicesResponse = z.infer<
  typeof GetPaymentServicesResponseSchema
>;

export namespace GetPaymentServicesCommand {
  export const url = REST_API.PAYMENT.POST_SERVICES;
  export const TSQ_url = url;

  export const RequestBodySchema = GetPaymentServicesRequestBodySchema;
  export type IRequestBody = IGetPaymentServicesRequestBody;

  export const ResponseSchema = GetPaymentServicesResponseSchema;
  export type IResponse = IGetPaymentServicesResponse;

  export const endpointDetails = getEndpointDetails(
    REST_API.PAYMENT.POST_SERVICES,
    'post',
    'List available payment services',
    'Returns supported networks/currencies for payments with their limits and commission rates.',
  );
}
