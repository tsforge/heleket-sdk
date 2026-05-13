import type { z } from 'zod';

import { getEndpointDetails, REST_API } from '../../shared/api';
import { ByUuidOrOrderId, PaymentRecord } from '../common';

export const GetPaymentInfoRequestBodySchema = ByUuidOrOrderId.Schema;
export type IGetPaymentInfoRequestBody = z.infer<
  typeof GetPaymentInfoRequestBodySchema
>;

export const GetPaymentInfoResponseSchema = PaymentRecord.Schema;
export type IGetPaymentInfoResponse = z.infer<
  typeof GetPaymentInfoResponseSchema
>;

export namespace GetPaymentInfoCommand {
  export const url = REST_API.PAYMENT.POST_INFO;
  export const TSQ_url = url;

  export const RequestBodySchema = GetPaymentInfoRequestBodySchema;
  export type IRequestBody = IGetPaymentInfoRequestBody;

  export const ResponseSchema = GetPaymentInfoResponseSchema;
  export type IResponse = IGetPaymentInfoResponse;

  export const endpointDetails = getEndpointDetails(
    REST_API.PAYMENT.POST_INFO,
    'post',
    'Get information about a payment invoice',
    'Retrieves a single payment invoice by uuid or order_id. If both are provided, order_id wins.',
  );
}
