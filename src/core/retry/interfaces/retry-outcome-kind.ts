export const RetryOutcomeKind = {
  Success: 'success',
  Error: 'error',
} as const;

export type RetryOutcomeKind =
  (typeof RetryOutcomeKind)[keyof typeof RetryOutcomeKind];
