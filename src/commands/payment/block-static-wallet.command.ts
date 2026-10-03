import { z } from 'zod';

import { getEndpointDetails, HTTP_METHOD, REST_API } from '../../shared/api';

export const BlockStaticWalletRequestBodySchema = z
  .object({
    uuid: z.uuid().optional(),
    orderId: z.string().min(1).optional(),
    isRefund: z.boolean().optional(),
  })
  .strict()
  .refine((v) => v.uuid !== undefined || v.orderId !== undefined, {
    message: 'Either uuid or orderId must be provided',
  });
export type IBlockStaticWalletRequestBody = z.infer<
  typeof BlockStaticWalletRequestBodySchema
>;

export const BlockStaticWalletResponseSchema = z.object({}).loose();
export type IBlockStaticWalletResponse = z.infer<
  typeof BlockStaticWalletResponseSchema
>;

export namespace BlockStaticWalletCommand {
  export const url = REST_API.WALLET.POST_BLOCK_ADDRESS;
  export const TSQ_url = url;

  export const RequestBodySchema = BlockStaticWalletRequestBodySchema;
  export type IRequestBody = IBlockStaticWalletRequestBody;

  export const ResponseSchema = BlockStaticWalletResponseSchema;
  export type IResponse = IBlockStaticWalletResponse;

  export const endpointDetails = getEndpointDetails(
    REST_API.WALLET.POST_BLOCK_ADDRESS,
    HTTP_METHOD.POST,
    'Block a static wallet',
    'No further top-ups are processed after the wallet is blocked. Set isRefund to refund funds already locked on it.',
  );
}
