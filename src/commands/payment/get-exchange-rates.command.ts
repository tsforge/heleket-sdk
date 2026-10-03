import { z } from 'zod';

import { getEndpointDetails, HTTP_METHOD, REST_API } from '../../shared/api';

export const GetExchangeRatesRequestBodySchema = z.object({}).strict();
export type IGetExchangeRatesRequestBody = z.infer<
  typeof GetExchangeRatesRequestBodySchema
>;

export const GetExchangeRatesResponseSchema = z.array(
  z.record(z.string(), z.unknown()),
);
export type IGetExchangeRatesResponse = z.infer<
  typeof GetExchangeRatesResponseSchema
>;

export namespace GetExchangeRatesCommand {
  export const url = REST_API.EXCHANGE_RATE.GET_LIST;
  export const TSQ_url = url;
  export const method = HTTP_METHOD.GET;

  export const RequestBodySchema = GetExchangeRatesRequestBodySchema;
  export type IRequestBody = IGetExchangeRatesRequestBody;

  export const ResponseSchema = GetExchangeRatesResponseSchema;
  export type IResponse = IGetExchangeRatesResponse;

  export const endpointDetails = getEndpointDetails(
    REST_API.EXCHANGE_RATE.GET_LIST,
    HTTP_METHOD.GET,
    'Get exchange rates for a fiat currency',
    'Read-only endpoint. The currency is part of the path: exchange-rate/{currency}/list.',
  );
}
