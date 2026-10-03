/**
 * Payout statuses as documented at
 * https://doc.heleket.com/ru/methods/payouts/payout-statuses
 */
export const PAYOUT_STATUS_VALUES = [
  'process',
  'check',
  'paid',
  'fail',
  'cancel',
  'system_fail',
] as const;

export type TPayoutStatus = (typeof PAYOUT_STATUS_VALUES)[number];

export const PAYOUT_STATUS = {
  PROCESS: 'process',
  CHECK: 'check',
  PAID: 'paid',
  FAIL: 'fail',
  CANCEL: 'cancel',
  SYSTEM_FAIL: 'system_fail',
} as const satisfies Record<string, TPayoutStatus>;

const payoutStatusValues: readonly string[] = PAYOUT_STATUS_VALUES;

export const isPayoutStatusGuard = (value: unknown): value is TPayoutStatus =>
  typeof value === 'string' && payoutStatusValues.includes(value);

const payoutFinalStatuses: readonly string[] = [
  PAYOUT_STATUS.PAID,
  PAYOUT_STATUS.FAIL,
  PAYOUT_STATUS.CANCEL,
  PAYOUT_STATUS.SYSTEM_FAIL,
];

const payoutSuccessfulStatuses: readonly string[] = [PAYOUT_STATUS.PAID];

export const isPayoutStatusFinal = (status: string): boolean =>
  payoutFinalStatuses.includes(status);

export const isPayoutStatusSuccessful = (status: string): boolean =>
  payoutSuccessfulStatuses.includes(status);
