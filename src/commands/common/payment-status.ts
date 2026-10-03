/**
 * Payment / invoice statuses as documented at
 * https://doc.heleket.com/ru/methods/payments/payment-statuses
 */
export const PAYMENT_STATUS_VALUES = [
  'paid',
  'paid_over',
  'wrong_amount',
  'wrong_amount_waiting',
  'process',
  'confirm_check',
  'check',
  'fail',
  'cancel',
  'system_fail',
  'refund_process',
  'refund_fail',
  'refund_paid',
  'locked',
] as const;

export type TPaymentStatus = (typeof PAYMENT_STATUS_VALUES)[number];

export const PAYMENT_STATUS = {
  PAID: 'paid',
  PAID_OVER: 'paid_over',
  WRONG_AMOUNT: 'wrong_amount',
  WRONG_AMOUNT_WAITING: 'wrong_amount_waiting',
  PROCESS: 'process',
  CONFIRM_CHECK: 'confirm_check',
  CHECK: 'check',
  FAIL: 'fail',
  CANCEL: 'cancel',
  SYSTEM_FAIL: 'system_fail',
  REFUND_PROCESS: 'refund_process',
  REFUND_FAIL: 'refund_fail',
  REFUND_PAID: 'refund_paid',
  LOCKED: 'locked',
} as const satisfies Record<string, TPaymentStatus>;

const paymentStatusValues: readonly string[] = PAYMENT_STATUS_VALUES;

export const isPaymentStatusGuard = (value: unknown): value is TPaymentStatus =>
  typeof value === 'string' && paymentStatusValues.includes(value);

const paymentFinalStatuses: readonly string[] = [
  PAYMENT_STATUS.PAID,
  PAYMENT_STATUS.PAID_OVER,
  PAYMENT_STATUS.WRONG_AMOUNT,
  PAYMENT_STATUS.FAIL,
  PAYMENT_STATUS.CANCEL,
  PAYMENT_STATUS.SYSTEM_FAIL,
  PAYMENT_STATUS.REFUND_FAIL,
  PAYMENT_STATUS.REFUND_PAID,
  PAYMENT_STATUS.LOCKED,
];

const paymentSuccessfulStatuses: readonly string[] = [
  PAYMENT_STATUS.PAID,
  PAYMENT_STATUS.PAID_OVER,
];

export const isPaymentStatusFinal = (status: string): boolean =>
  paymentFinalStatuses.includes(status);

export const isPaymentStatusSuccessful = (status: string): boolean =>
  paymentSuccessfulStatuses.includes(status);
