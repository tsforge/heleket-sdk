import type { ICommandResponse } from '../common';
import type {
  CommandExecutor,
  ICommandDescriptor,
  IExecuteOptions,
} from '../core/command-executor';

export abstract class Resource {
  protected readonly executor: CommandExecutor;

  constructor(executor: CommandExecutor) {
    this.executor = executor;
  }

  protected execute<TIn, TOut>(
    command: ICommandDescriptor<TIn, TOut>,
    input: TIn,
    options?: IExecuteOptions,
  ): Promise<ICommandResponse<TOut>> {
    return this.executor.execute(command, input, options);
  }
}
