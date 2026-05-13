export const ERRORS = {
  VALIDATION_ERROR: {
    code: 'V001',
    message: 'Input validation failed',
    httpCode: 400,
  },
  API_ERROR: {
    code: 'A001',
    message: 'Heleket API returned an error',
    httpCode: 502,
  },
  PARSE_ERROR: {
    code: 'P001',
    message: 'Could not parse Heleket API response',
    httpCode: 502,
  },
  NETWORK_ERROR: {
    code: 'N001',
    message: 'Network request to Heleket failed',
    httpCode: 503,
  },
  TIMEOUT_ERROR: {
    code: 'T001',
    message: 'Request to Heleket timed out',
    httpCode: 504,
  },
  WEBHOOK_INVALID_SIGN: {
    code: 'W001',
    message: 'Webhook signature is invalid',
    httpCode: 401,
  },
  UNKNOWN_ERROR: {
    code: 'U001',
    message: 'Unknown error',
    httpCode: 500,
  },
} as const;

export type ErrorKey = keyof typeof ERRORS;
export type ErrorEntry = (typeof ERRORS)[ErrorKey];
export type ErrorCode = ErrorEntry['code'];
