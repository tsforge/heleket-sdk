/**
 * AML questionnaire link statuses, see
 * https://doc.heleket.com/ru/methods/payments/aml-links
 */
export const AML_LINK_STATUS_VALUES = [
  'init',
  'pending',
  'completed',
  'expired',
] as const;

export type TAmlLinkStatus = (typeof AML_LINK_STATUS_VALUES)[number];

export const AML_LINK_STATUS = {
  INIT: 'init',
  PENDING: 'pending',
  COMPLETED: 'completed',
  EXPIRED: 'expired',
} as const satisfies Record<string, TAmlLinkStatus>;

const amlLinkStatusValues: readonly string[] = AML_LINK_STATUS_VALUES;

export const isAmlLinkStatusGuard = (value: unknown): value is TAmlLinkStatus =>
  typeof value === 'string' && amlLinkStatusValues.includes(value);

const amlLinkFinalStatuses: readonly string[] = [
  AML_LINK_STATUS.COMPLETED,
  AML_LINK_STATUS.EXPIRED,
];

const amlLinkSuccessfulStatuses: readonly string[] = [
  AML_LINK_STATUS.COMPLETED,
];

export const isAmlLinkStatusFinal = (status: string): boolean =>
  amlLinkFinalStatuses.includes(status);

export const isAmlLinkStatusSuccessful = (status: string): boolean =>
  amlLinkSuccessfulStatuses.includes(status);
