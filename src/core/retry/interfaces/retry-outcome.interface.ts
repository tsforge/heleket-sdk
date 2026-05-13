import type { RetryOutcomeKind } from './retry-outcome-kind';

export type RetryOutcome<T> =
  | {
      readonly kind: typeof RetryOutcomeKind.Success;
      readonly value: T;
    }
  | {
      readonly kind: typeof RetryOutcomeKind.Error;
      readonly error: unknown;
    };
