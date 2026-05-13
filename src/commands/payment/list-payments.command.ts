import { z } from 'zod';

import { getEndpointDetails, REST_API } from '../../shared/api';
import { Paginate, PaymentRecord } from '../common';

export const ListPaymentsRequestBodySchema = z
  .object({
    dateFrom: z.string().optional(),
    dateTo: z.string().optional(),
  })
  .strict();
export type IListPaymentsRequestBody = z.input<
  typeof ListPaymentsRequestBodySchema
>;

export const ListPaymentsRequestQuerySchema = z
  .object({
    cursor: z.string().optional(),
  })
  .strict();
export type IListPaymentsRequestQuery = z.input<
  typeof ListPaymentsRequestQuerySchema
>;

export const ListPaymentsResponseSchema = z
  .object({
    items: z.array(PaymentRecord.Schema),
    paginate: Paginate.Schema,
  })
  .loose();
export type IListPaymentsResponse = z.infer<typeof ListPaymentsResponseSchema>;

export namespace ListPaymentsCommand {
  export const url = REST_API.PAYMENT.POST_LIST;
  export const TSQ_url = url;

  export const RequestBodySchema = ListPaymentsRequestBodySchema;
  export type IRequestBody = IListPaymentsRequestBody;

  export const RequestQuerySchema = ListPaymentsRequestQuerySchema;
  export type IRequestQuery = IListPaymentsRequestQuery;

  export const ResponseSchema = ListPaymentsResponseSchema;
  export type IResponse = IListPaymentsResponse;

  export const endpointDetails = getEndpointDetails(
    REST_API.PAYMENT.POST_LIST,
    'post',
    'List payments with cursor pagination',
    'Returns a page of payments. Pass cursor as a query param to navigate pages, dateFrom/dateTo in the body to filter by creation date.',
  );
}
