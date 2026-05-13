import { z } from 'zod';

import { getEndpointDetails, REST_API } from '../../shared/api';
import { ByUuidOrOrderId } from '../common';

export const ResendPaymentWebhookRequestBodySchema = ByUuidOrOrderId.Schema;
export type IResendPaymentWebhookRequestBody = z.infer<
  typeof ResendPaymentWebhookRequestBodySchema
>;

export const ResendPaymentWebhookResponseSchema = z.unknown();
export type IResendPaymentWebhookResponse = unknown;

export namespace ResendPaymentWebhookCommand {
  export const url = REST_API.PAYMENT.POST_RESEND;
  export const TSQ_url = url;

  export const RequestBodySchema = ResendPaymentWebhookRequestBodySchema;
  export type IRequestBody = IResendPaymentWebhookRequestBody;

  export const ResponseSchema = ResendPaymentWebhookResponseSchema;
  export type IResponse = IResendPaymentWebhookResponse;

  export const endpointDetails = getEndpointDetails(
    REST_API.PAYMENT.POST_RESEND,
    'post',
    'Resend the webhook notification for a payment',
    'Triggers Heleket to re-deliver the webhook for the specified payment invoice.',
  );
}
