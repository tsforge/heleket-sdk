import { describe, expect, test } from 'vitest';

import {
  AML_LINK_STATUS,
  isAmlLinkStatusFinal,
  isAmlLinkStatusSuccessful,
} from './aml-link-status';
import {
  isPaymentStatusFinal,
  isPaymentStatusSuccessful,
  PAYMENT_STATUS,
} from './payment-status';
import {
  isPayoutStatusFinal,
  isPayoutStatusSuccessful,
  PAYOUT_STATUS,
} from './payout-status';

describe('payment status helpers', () => {
  test('paid and paid_over are final and successful', () => {
    expect(isPaymentStatusFinal(PAYMENT_STATUS.PAID)).toBe(true);
    expect(isPaymentStatusSuccessful(PAYMENT_STATUS.PAID)).toBe(true);
    expect(isPaymentStatusSuccessful(PAYMENT_STATUS.PAID_OVER)).toBe(true);
  });

  test('in-flight statuses are neither final nor successful', () => {
    expect(isPaymentStatusFinal(PAYMENT_STATUS.PROCESS)).toBe(false);
    expect(isPaymentStatusFinal(PAYMENT_STATUS.CONFIRM_CHECK)).toBe(false);
    expect(isPaymentStatusSuccessful(PAYMENT_STATUS.CHECK)).toBe(false);
  });

  test('refund_paid is final but not successful for the payment', () => {
    expect(isPaymentStatusFinal(PAYMENT_STATUS.REFUND_PAID)).toBe(true);
    expect(isPaymentStatusSuccessful(PAYMENT_STATUS.REFUND_PAID)).toBe(false);
  });

  test('unknown values are not final', () => {
    expect(isPaymentStatusFinal('brand_new_status')).toBe(false);
  });
});

describe('payout status helpers', () => {
  test('paid is final and successful', () => {
    expect(isPayoutStatusFinal(PAYOUT_STATUS.PAID)).toBe(true);
    expect(isPayoutStatusSuccessful(PAYOUT_STATUS.PAID)).toBe(true);
  });

  test('fail is final but not successful', () => {
    expect(isPayoutStatusFinal(PAYOUT_STATUS.FAIL)).toBe(true);
    expect(isPayoutStatusSuccessful(PAYOUT_STATUS.FAIL)).toBe(false);
  });

  test('check and process are in flight', () => {
    expect(isPayoutStatusFinal(PAYOUT_STATUS.CHECK)).toBe(false);
    expect(isPayoutStatusFinal(PAYOUT_STATUS.PROCESS)).toBe(false);
  });
});

describe('AML link status helpers', () => {
  test('completed is final and successful, expired is final only', () => {
    expect(isAmlLinkStatusFinal(AML_LINK_STATUS.COMPLETED)).toBe(true);
    expect(isAmlLinkStatusSuccessful(AML_LINK_STATUS.COMPLETED)).toBe(true);
    expect(isAmlLinkStatusFinal(AML_LINK_STATUS.EXPIRED)).toBe(true);
    expect(isAmlLinkStatusSuccessful(AML_LINK_STATUS.EXPIRED)).toBe(false);
  });

  test('init and pending are in progress', () => {
    expect(isAmlLinkStatusFinal(AML_LINK_STATUS.INIT)).toBe(false);
    expect(isAmlLinkStatusFinal(AML_LINK_STATUS.PENDING)).toBe(false);
  });
});
