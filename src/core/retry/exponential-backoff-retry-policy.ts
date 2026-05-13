import { sleep as defaultSleep } from '../../common';
import { RetryOutcomeKind } from './interfaces';
import type {
  IRetryPolicy,
  RetryOptions,
  RetryOutcome,
  RetryPredicate,
} from './interfaces';

export class ExponentialBackoffRetryPolicy implements IRetryPolicy {
  private readonly retries: number;
  private readonly baseDelayMs: number;
  private readonly maxDelayMs: number;
  private readonly sleep: (ms: number) => Promise<void>;
  private readonly random: () => number;

  constructor(options: RetryOptions) {
    this.retries = options.retries;
    this.baseDelayMs = options.baseDelayMs;
    this.maxDelayMs = options.maxDelayMs;
    this.sleep = options.sleep ?? defaultSleep;
    this.random = options.random ?? Math.random;
  }

  public async execute<T>(
    operation: () => Promise<T>,
    isRetryable: RetryPredicate<T>,
  ): Promise<T> {
    let attempt = 0;

    while (true) {
      const outcome = await this.runOnce(operation);
      const isLastAttempt = attempt >= this.retries;

      if (outcome.kind === RetryOutcomeKind.Success) {
        if (isLastAttempt || !isRetryable(outcome)) {
          return outcome.value;
        }
      } else {
        if (isLastAttempt || !isRetryable(outcome)) {
          throw outcome.error;
        }
      }

      const delay = this.computeDelay(attempt);
      await this.sleep(delay);
      attempt += 1;
    }
  }

  private async runOnce<T>(
    operation: () => Promise<T>,
  ): Promise<RetryOutcome<T>> {
    try {
      const value = await operation();
      return { kind: RetryOutcomeKind.Success, value };
    } catch (error) {
      return { kind: RetryOutcomeKind.Error, error };
    }
  }

  private computeDelay(attempt: number): number {
    const exponential = this.baseDelayMs * 2 ** attempt;
    const jitter = this.random() * this.baseDelayMs;
    const total = exponential + jitter;
    return Math.min(total, this.maxDelayMs);
  }
}
