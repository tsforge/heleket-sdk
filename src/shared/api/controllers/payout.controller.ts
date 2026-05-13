export const PAYOUT_CONTROLLER = 'payout' as const;

export const PAYOUT_ROUTES = {
  POST_CREATE: PAYOUT_CONTROLLER,
  POST_INFO: `${PAYOUT_CONTROLLER}/info`,
  POST_LIST: `${PAYOUT_CONTROLLER}/list`,
  POST_SERVICES: `${PAYOUT_CONTROLLER}/services`,
} as const;
