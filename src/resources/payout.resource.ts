import {
  CreatePayoutCommand,
  GetPayoutInfoCommand,
  GetPayoutServicesCommand,
  ListPayoutsCommand,
} from '../commands';
import type { ICommandResponse } from '../common';
import { Resource } from './resource.base';

type PayoutItem = ListPayoutsCommand.IResponse['items'][number];

export class PayoutResource extends Resource {
  public create(
    input: CreatePayoutCommand.IRequestBody,
    signal?: AbortSignal,
  ): Promise<ICommandResponse<CreatePayoutCommand.IResponse>> {
    return this.execute(CreatePayoutCommand, input, { signal });
  }

  public info(
    input: GetPayoutInfoCommand.IRequestBody,
    signal?: AbortSignal,
  ): Promise<ICommandResponse<GetPayoutInfoCommand.IResponse>> {
    return this.execute(GetPayoutInfoCommand, input, { signal });
  }

  public services(
    signal?: AbortSignal,
  ): Promise<ICommandResponse<GetPayoutServicesCommand.IResponse>> {
    return this.execute(GetPayoutServicesCommand, {}, { signal });
  }

  public list(
    input: ListPayoutsCommand.IRequestBody &
      ListPayoutsCommand.IRequestQuery = {},
    signal?: AbortSignal,
  ): Promise<ICommandResponse<ListPayoutsCommand.IResponse>> {
    const { cursor, ...body } = input;
    const query = cursor !== undefined ? { cursor } : undefined;

    return this.execute(ListPayoutsCommand, body, { signal, query });
  }

  public async *historyAll(
    input: ListPayoutsCommand.IRequestBody = {},
    signal?: AbortSignal,
  ): AsyncGenerator<PayoutItem> {
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
