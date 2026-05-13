import { z } from 'zod';

import { getEndpointDetails, REST_API } from '../../shared/api';
import { Paginate, PayoutRecord } from '../common';

export const ListPayoutsRequestBodySchema = z
  .object({
    dateFrom: z.string().optional(),
    dateTo: z.string().optional(),
  })
  .strict();
export type IListPayoutsRequestBody = z.input<
  typeof ListPayoutsRequestBodySchema
>;

export const ListPayoutsRequestQuerySchema = z
  .object({
    cursor: z.string().optional(),
  })
  .strict();
export type IListPayoutsRequestQuery = z.input<
  typeof ListPayoutsRequestQuerySchema
>;

export const ListPayoutsResponseSchema = z
  .object({
    items: z.array(PayoutRecord.Schema),
    paginate: Paginate.Schema,
  })
  .loose();
export type IListPayoutsResponse = z.infer<typeof ListPayoutsResponseSchema>;

export namespace ListPayoutsCommand {
  export const url = REST_API.PAYOUT.POST_LIST;
  export const TSQ_url = url;

  export const RequestBodySchema = ListPayoutsRequestBodySchema;
  export type IRequestBody = IListPayoutsRequestBody;

  export const RequestQuerySchema = ListPayoutsRequestQuerySchema;
  export type IRequestQuery = IListPayoutsRequestQuery;

  export const ResponseSchema = ListPayoutsResponseSchema;
  export type IResponse = IListPayoutsResponse;

  export const endpointDetails = getEndpointDetails(
    REST_API.PAYOUT.POST_LIST,
    'post',
    'List payouts with cursor pagination',
  );
}
