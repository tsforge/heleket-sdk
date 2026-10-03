import { z } from 'zod';

import { getEndpointDetails, HTTP_METHOD, REST_API } from '../../shared/api';

export const RefundBlockedWalletRequestBodySchema = z
  .object({
    uuid: z.uuid(),
    address: z.string().min(1),
  })
  .strict();
export type IRefundBlockedWalletRequestBody = z.infer<
  typeof RefundBlockedWalletRequestBodySchema
>;

export const RefundBlockedWalletResponseSchema = z.object({}).loose();
export type IRefundBlockedWalletResponse = z.infer<
  typeof RefundBlockedWalletResponseSchema
>;

export namespace RefundBlockedWalletCommand {
  export const url = REST_API.WALLET.POST_BLOCKED_ADDRESS_REFUND;
  export const TSQ_url = url;

  export const RequestBodySchema = RefundBlockedWalletRequestBodySchema;
  export type IRequestBody = IRefundBlockedWalletRequestBody;

  export const ResponseSchema = RefundBlockedWalletResponseSchema;
  export type IResponse = IRefundBlockedWalletResponse;

  export const endpointDetails = getEndpointDetails(
    REST_API.WALLET.POST_BLOCKED_ADDRESS_REFUND,
    HTTP_METHOD.POST,
    'Refund funds locked on a blocked static wallet',
    'Sends the locked funds to the given address.',
  );
}
