import { z } from 'zod';

import { getEndpointDetails, REST_API } from '../../shared/api';
import { CourseSource, Currency, Network, PaymentRecord } from '../common';

export const CreatePaymentRequestBodySchema = z
  .object({
    amount: z.union([z.string(), z.number()]),
    currency: Currency.Schema,
    orderId: z.string().min(1).max(128),
    network: Network.Schema.optional(),
    urlReturn: z.string().url().optional(),
    urlSuccess: z.string().url().optional(),
    urlCallback: z.string().url().optional(),
    isPaymentMultiple: z.boolean().optional(),
    lifetime: z.number().int().min(300).max(43_200).optional(),
    toCurrency: Currency.Schema.optional(),
    subtract: z.number().min(0).max(100).optional(),
    accuracyPaymentPercent: z.number().min(0).max(5).optional(),
    additionalData: z.string().optional(),
    currencies: z
      .array(
        z.object({
          currency: Currency.Schema,
          network: Network.Schema.optional(),
        }),
      )
      .optional(),
    exceptCurrencies: z
      .array(
        z.object({
          currency: Currency.Schema,
          network: Network.Schema.optional(),
        }),
      )
      .optional(),
    courseSource: CourseSource.Schema.optional(),
    fromReferralCode: z.string().optional(),
    discountPercent: z.number().int().min(-99).max(100).optional(),
    isRefresh: z.boolean().optional(),
    payerEmail: z.string().email().optional(),
  })
  .strict();
export type ICreatePaymentRequestBody = z.input<
  typeof CreatePaymentRequestBodySchema
>;

export const CreatePaymentResponseSchema = PaymentRecord.Schema;
export type ICreatePaymentResponse = z.infer<
  typeof CreatePaymentResponseSchema
>;

export namespace CreatePaymentCommand {
  export const url = REST_API.PAYMENT.POST_CREATE;
  export const TSQ_url = url;

  export const RequestBodySchema = CreatePaymentRequestBodySchema;
  export type IRequestBody = ICreatePaymentRequestBody;

  export const ResponseSchema = CreatePaymentResponseSchema;
  export type IResponse = ICreatePaymentResponse;

  export const endpointDetails = getEndpointDetails(
    REST_API.PAYMENT.POST_CREATE,
    'post',
    'Create a new payment invoice',
    'Creates a payment invoice that the customer can pay in crypto. Returns the invoice uuid and a hosted pay URL.',
  );
}
