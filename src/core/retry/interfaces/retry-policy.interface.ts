import type { RetryPredicate } from './retry-predicate.interface';

export interface IRetryPolicy {
  execute<T>(
    operation: () => Promise<T>,
    isRetryable: RetryPredicate<T>,
  ): Promise<T>;
}
