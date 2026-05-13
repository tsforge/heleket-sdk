export const EnvelopeResultKind = {
  Success: 'success',
  ApiError: 'apiError',
  ParseError: 'parseError',
} as const;

export type EnvelopeResultKind =
  (typeof EnvelopeResultKind)[keyof typeof EnvelopeResultKind];
