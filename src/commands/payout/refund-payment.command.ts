import { z } from 'zod';

import { getEndpointDetails, HTTP_METHOD, REST_API } from '../../shared/api';

export const RefundPaymentRequestBodySchema = z
  .object({
    uuid: z.uuid().optional(),
    orderId: z.string().min(1).optional(),
    address: z.string().min(1),
    isSubtract: z.boolean(),
  })
  .strict()
  .refine((v) => v.uuid !== undefined || v.orderId !== undefined, {
    message: 'Either uuid or orderId must be provided',
  });
export type IRefundPaymentRequestBody = z.infer<
  typeof RefundPaymentRequestBodySchema
>;

export const RefundPaymentResponseSchema = z.object({}).loose();
export type IRefundPaymentResponse = z.infer<
  typeof RefundPaymentResponseSchema
>;

export namespace RefundPaymentCommand {
  export const url = REST_API.PAYMENT.POST_REFUND;
  export const TSQ_url = url;

  export const RequestBodySchema = RefundPaymentRequestBodySchema;
  export type IRequestBody = IRefundPaymentRequestBody;

  export const ResponseSchema = RefundPaymentResponseSchema;
  export type IResponse = IRefundPaymentResponse;

  export const endpointDetails = getEndpointDetails(
    REST_API.PAYMENT.POST_REFUND,
    HTTP_METHOD.POST,
    'Refund a paid invoice',
    'Signed with the payout key, so it is exposed on the payout resource.',
  );
}
