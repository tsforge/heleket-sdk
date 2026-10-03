import { z } from 'zod';

import { getEndpointDetails, HTTP_METHOD, REST_API } from '../../shared/api';
import { Currency, Network } from '../common';

export const TestWebhookRequestBodySchema = z
  .object({
    urlCallback: z.string().url(),
    currency: Currency.Schema,
    network: Network.Schema,
    status: z.string().min(1),
    uuid: z.uuid().optional(),
    orderId: z.string().min(1).optional(),
  })
  .strict()
  .refine((v) => v.uuid !== undefined || v.orderId !== undefined, {
    message: 'Either uuid or orderId must be provided',
  });
export type ITestWebhookRequestBody = z.infer<
  typeof TestWebhookRequestBodySchema
>;

export const TestWebhookResponseSchema = z.object({}).loose();
export type ITestWebhookResponse = z.infer<typeof TestWebhookResponseSchema>;

export namespace TestWebhookCommand {
  export const url = REST_API.TEST_WEBHOOK.POST_PAYMENT;
  export const TSQ_url = url;

  export const RequestBodySchema = TestWebhookRequestBodySchema;
  export type IRequestBody = ITestWebhookRequestBody;

  export const ResponseSchema = TestWebhookResponseSchema;
  export type IResponse = ITestWebhookResponse;

  export const endpointDetails = getEndpointDetails(
    REST_API.TEST_WEBHOOK.POST_PAYMENT,
    HTTP_METHOD.POST,
    'Send a synthetic test webhook',
    'Triggers a test callback to urlCallback. The resource picks the payment or wallet endpoint by type.',
  );
}
