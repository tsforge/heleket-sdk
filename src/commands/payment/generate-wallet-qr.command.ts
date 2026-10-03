import { z } from 'zod';

import { getEndpointDetails, HTTP_METHOD, REST_API } from '../../shared/api';

export const GenerateWalletQrRequestBodySchema = z
  .object({
    merchantPaymentUuid: z.uuid(),
  })
  .strict();
export type IGenerateWalletQrRequestBody = z.infer<
  typeof GenerateWalletQrRequestBodySchema
>;

export const GenerateWalletQrResponseSchema = z.object({}).loose();
export type IGenerateWalletQrResponse = z.infer<
  typeof GenerateWalletQrResponseSchema
>;

export namespace GenerateWalletQrCommand {
  export const url = REST_API.WALLET.POST_QR;
  export const TSQ_url = url;

  export const RequestBodySchema = GenerateWalletQrRequestBodySchema;
  export type IRequestBody = IGenerateWalletQrRequestBody;

  export const ResponseSchema = GenerateWalletQrResponseSchema;
  export type IResponse = IGenerateWalletQrResponse;

  export const endpointDetails = getEndpointDetails(
    REST_API.WALLET.POST_QR,
    HTTP_METHOD.POST,
    'Generate a QR code for a static wallet',
    'Returns a base64-encoded QR image for an existing static wallet.',
  );
}
