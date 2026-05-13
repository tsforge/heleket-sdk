import type { EnvelopeResultKind } from './envelope-result-kind';

export type EnvelopeResult =
  | {
      readonly kind: typeof EnvelopeResultKind.Success;
      readonly result: unknown;
    }
  | {
      readonly kind: typeof EnvelopeResultKind.ApiError;
      readonly message?: string;
      readonly errors?: unknown;
    }
  | {
      readonly kind: typeof EnvelopeResultKind.ParseError;
    };
