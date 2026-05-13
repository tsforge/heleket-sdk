import {
  CreatePaymentCommand,
  CreateStaticWalletCommand,
  GetBalanceCommand,
  GetPaymentInfoCommand,
  GetPaymentServicesCommand,
  ListPaymentsCommand,
  ResendPaymentWebhookCommand,
} from '../commands';
import type { ICommandResponse } from '../common';
import { Resource } from './resource.base';

type PaymentItem = ListPaymentsCommand.IResponse['items'][number];

export class PaymentResource extends Resource {
  public create(
    input: CreatePaymentCommand.IRequestBody,
    signal?: AbortSignal,
  ): Promise<ICommandResponse<CreatePaymentCommand.IResponse>> {
    return this.execute(CreatePaymentCommand, input, { signal });
  }

  public info(
    input: GetPaymentInfoCommand.IRequestBody,
    signal?: AbortSignal,
  ): Promise<ICommandResponse<GetPaymentInfoCommand.IResponse>> {
    return this.execute(GetPaymentInfoCommand, input, { signal });
  }

  public services(
    signal?: AbortSignal,
  ): Promise<ICommandResponse<GetPaymentServicesCommand.IResponse>> {
    return this.execute(GetPaymentServicesCommand, {}, { signal });
  }

  public resend(
    input: ResendPaymentWebhookCommand.IRequestBody,
    signal?: AbortSignal,
  ): Promise<ICommandResponse<ResendPaymentWebhookCommand.IResponse>> {
    return this.execute(ResendPaymentWebhookCommand, input, { signal });
  }

  public wallet(
    input: CreateStaticWalletCommand.IRequestBody,
    signal?: AbortSignal,
  ): Promise<ICommandResponse<CreateStaticWalletCommand.IResponse>> {
    return this.execute(CreateStaticWalletCommand, input, { signal });
  }

  public balance(
    signal?: AbortSignal,
  ): Promise<ICommandResponse<GetBalanceCommand.IResponse>> {
    return this.execute(GetBalanceCommand, {}, { signal });
  }

  public list(
    input: ListPaymentsCommand.IRequestBody &
      ListPaymentsCommand.IRequestQuery = {},
    signal?: AbortSignal,
  ): Promise<ICommandResponse<ListPaymentsCommand.IResponse>> {
    const { cursor, ...body } = input;
    const query = cursor !== undefined ? { cursor } : undefined;

    return this.execute(ListPaymentsCommand, body, { signal, query });
  }

  public async *historyAll(
    input: ListPaymentsCommand.IRequestBody = {},
    signal?: AbortSignal,
  ): AsyncGenerator<PaymentItem> {
    let cursor: string | undefined;

    while (true) {
      const pageInput = cursor !== undefined ? { ...input, cursor } : input;
      const page = await this.list(pageInput, signal);

      if (!page.isSuccess || !page.data) {
        return;
      }

      for (const item of page.data.items) {
        yield item;
      }

      const nextCursor = page.data.paginate.nextCursor;
      if (!page.data.paginate.hasPages) {
        return;
      }
      if (nextCursor === null) {
        return;
      }

      cursor = nextCursor;
    }
  }
}
