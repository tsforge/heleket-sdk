export const WALLET_CONTROLLER = 'wallet' as const;

export const WALLET_ROUTES = {
  POST_CREATE: WALLET_CONTROLLER,
  POST_QR: `${WALLET_CONTROLLER}/qr`,
  POST_BLOCK_ADDRESS: `${WALLET_CONTROLLER}/block-address`,
  POST_BLOCKED_ADDRESS_REFUND: `${WALLET_CONTROLLER}/blocked-address-refund`,
} as const;
