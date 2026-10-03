export const TRANSFER_CONTROLLER = 'transfer' as const;

export const TRANSFER_ROUTES = {
  POST_TO_PERSONAL: `${TRANSFER_CONTROLLER}/to-personal`,
  POST_TO_BUSINESS: `${TRANSFER_CONTROLLER}/to-business`,
} as const;
