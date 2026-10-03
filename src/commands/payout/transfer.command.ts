import { z } from 'zod';

import { getEndpointDetails, HTTP_METHOD, REST_API } from '../../shared/api';
import { AmountLike, Currency } from '../common';

export const TransferRequestBodySchema = z
  .object({
    amount: AmountLike.Schema,
    currency: Currency.Schema,
  })
  .strict();
export type ITransferRequestBody = z.infer<typeof TransferRequestBodySchema>;

export const TransferResponseSchema = z.object({}).loose();
export type ITransferResponse = z.infer<typeof TransferResponseSchema>;

export namespace TransferToPersonalCommand {
  export const url = REST_API.TRANSFER.POST_TO_PERSONAL;
  export const TSQ_url = url;

  export const RequestBodySchema = TransferRequestBodySchema;
  export type IRequestBody = ITransferRequestBody;

  export const ResponseSchema = TransferResponseSchema;
  export type IResponse = ITransferResponse;

  export const endpointDetails = getEndpointDetails(
    REST_API.TRANSFER.POST_TO_PERSONAL,
    HTTP_METHOD.POST,
    'Move funds to the personal balance',
    'Moves funds from the business balance into the personal balance.',
  );
}

export namespace TransferToBusinessCommand {
  export const url = REST_API.TRANSFER.POST_TO_BUSINESS;
  export const TSQ_url = url;

  export const RequestBodySchema = TransferRequestBodySchema;
  export type IRequestBody = ITransferRequestBody;

  export const ResponseSchema = TransferResponseSchema;
  export type IResponse = ITransferResponse;

  export const endpointDetails = getEndpointDetails(
    REST_API.TRANSFER.POST_TO_BUSINESS,
    HTTP_METHOD.POST,
    'Move funds to the business balance',
    'Moves funds from the personal balance into the business balance.',
  );
}
