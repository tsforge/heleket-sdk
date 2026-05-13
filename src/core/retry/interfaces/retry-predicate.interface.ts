import type { RetryOutcome } from './retry-outcome.interface';

export type RetryPredicate<T> = (outcome: RetryOutcome<T>) => boolean;
