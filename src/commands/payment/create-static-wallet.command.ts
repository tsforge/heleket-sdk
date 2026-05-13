import { z } from 'zod';

import { getEndpointDetails, REST_API } from '../../shared/api';
import { Currency, Network } from '../common';

export const CreateStaticWalletRequestBodySchema = z
  .object({
    currency: Currency.Schema,
    network: Network.Schema,
    orderId: z.string().min(1).max(100),
    urlCallback: z.string().url().optional(),
    fromReferralCode: z.string().optional(),
  })
  .strict();
export type ICreateStaticWalletRequestBody = z.input<
  typeof CreateStaticWalletRequestBodySchema
>;

export const CreateStaticWalletResponseSchema = z
  .object({
    uuid: z.string(),
    orderId: z.string(),
    currency: z.string(),
    network: z.string(),
    address: z.string(),
  })
  .loose();
export type ICreateStaticWalletResponse = z.infer<
  typeof CreateStaticWalletResponseSchema
>;

export namespace CreateStaticWalletCommand {
  export const url = REST_API.WALLET.POST_CREATE;
  export const TSQ_url = url;

  export const RequestBodySchema = CreateStaticWalletRequestBodySchema;
  export type IRequestBody = ICreateStaticWalletRequestBody;

  export const ResponseSchema = CreateStaticWalletResponseSchema;
  export type IResponse = ICreateStaticWalletResponse;

  export const endpointDetails = getEndpointDetails(
    REST_API.WALLET.POST_CREATE,
    'post',
    'Create a static wallet for top-ups',
    'Generates a deposit address bound to your merchant on the requested network/currency.',
  );
}
