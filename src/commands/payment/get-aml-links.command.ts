import { z } from 'zod';

import { getEndpointDetails, HTTP_METHOD, REST_API } from '../../shared/api';
import { ByUuidOrOrderId } from '../common';

export const GetAmlLinksRequestBodySchema = ByUuidOrOrderId.Schema;
export type IGetAmlLinksRequestBody = z.infer<
  typeof GetAmlLinksRequestBodySchema
>;

export const GetAmlLinksResponseSchema = z.array(
  z
    .object({
      link: z.string(),
      status: z.string(),
      expiredAt: z.union([z.string(), z.number()]).nullable().optional(),
    })
    .loose(),
);
export type IGetAmlLinksResponse = z.infer<typeof GetAmlLinksResponseSchema>;

export namespace GetAmlLinksCommand {
  export const url = REST_API.PAYMENT.POST_AML_LINKS;
  export const TSQ_url = url;

  export const RequestBodySchema = GetAmlLinksRequestBodySchema;
  export type IRequestBody = IGetAmlLinksRequestBody;

  export const ResponseSchema = GetAmlLinksResponseSchema;
  export type IResponse = IGetAmlLinksResponse;

  export const endpointDetails = getEndpointDetails(
    REST_API.PAYMENT.POST_AML_LINKS,
    HTTP_METHOD.POST,
    'Get AML questionnaire links for a blocked payment',
    'Returns the links the payer must complete to unblock a payment held by the AML program.',
  );
}
