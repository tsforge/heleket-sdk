import {
  BlockStaticWalletCommand,
  CreatePaymentCommand,
  CreateStaticWalletCommand,
  GenerateWalletQrCommand,
  GetAmlLinksCommand,
  GetBalanceCommand,
  GetExchangeRatesCommand,
  GetPaymentInfoCommand,
  GetPaymentServicesCommand,
  ListPaymentsCommand,
  RefundBlockedWalletCommand,
  ResendPaymentWebhookCommand,
  TEST_WEBHOOK_TYPE,
  TestWebhookCommand,
  type TTestWebhookType,
} from '../commands';
import type { ICommandResponse } from '../common';
import { REST_API } from '../shared/api';
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

  public amlLinks(
    input: GetAmlLinksCommand.IRequestBody,
    signal?: AbortSignal,
  ): Promise<ICommandResponse<GetAmlLinksCommand.IResponse>> {
    return this.execute(GetAmlLinksCommand, input, { signal });
  }

  public walletQr(
    input: GenerateWalletQrCommand.IRequestBody,
    signal?: AbortSignal,
  ): Promise<ICommandResponse<GenerateWalletQrCommand.IResponse>> {
    return this.execute(GenerateWalletQrCommand, input, { signal });
  }

  public blockWallet(
    input: BlockStaticWalletCommand.IRequestBody,
    signal?: AbortSignal,
  ): Promise<ICommandResponse<BlockStaticWalletCommand.IResponse>> {
    return this.execute(BlockStaticWalletCommand, input, { signal });
  }

  public refundBlockedWallet(
    input: RefundBlockedWalletCommand.IRequestBody,
    signal?: AbortSignal,
  ): Promise<ICommandResponse<RefundBlockedWalletCommand.IResponse>> {
    return this.execute(RefundBlockedWalletCommand, input, { signal });
  }

  public testWebhook(
    type: TTestWebhookType,
    input: TestWebhookCommand.IRequestBody,
    signal?: AbortSignal,
  ): Promise<ICommandResponse<TestWebhookCommand.IResponse>> {
    const path =
      type === TEST_WEBHOOK_TYPE.PAYMENT
        ? REST_API.TEST_WEBHOOK.POST_PAYMENT
        : REST_API.TEST_WEBHOOK.POST_WALLET;

    return this.execute(TestWebhookCommand, input, { path, signal });
  }

  public exchangeRates(
    currency: string,
    signal?: AbortSignal,
  ): Promise<ICommandResponse<GetExchangeRatesCommand.IResponse>> {
    const path = `${GetExchangeRatesCommand.url}/${encodeURIComponent(currency)}/list`;

    return this.execute(GetExchangeRatesCommand, {}, { path, signal });
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
