import { tryParseJson } from '../../common';
import { EnvelopeResultKind } from './interfaces';
import type { EnvelopeResult, IEnvelopeParser } from './interfaces';

interface HeleketEnvelope {
  state?: number;
  result?: unknown;
  message?: string;
  errors?: unknown;
}

export class HeleketEnvelopeParser implements IEnvelopeParser {
  public parse(body: string, status: number): EnvelopeResult {
    const envelope = HeleketEnvelopeParser.readEnvelope(body);
    if (envelope === null) {
      return { kind: EnvelopeResultKind.ParseError };
    }

    if (status < 200 || status >= 300) {
      return HeleketEnvelopeParser.apiError(envelope.message, envelope.errors);
    }

    if (typeof envelope.state === 'number' && envelope.state !== 0) {
      return HeleketEnvelopeParser.apiError(envelope.message, envelope.errors);
    }

    return { kind: EnvelopeResultKind.Success, result: envelope.result };
  }

  private static readEnvelope(body: string): HeleketEnvelope | null {
    if (body === '') {
      return {};
    }
    return tryParseJson<HeleketEnvelope>(body);
  }

  private static apiError(
    message: string | undefined,
    errors: unknown,
  ): EnvelopeResult {
    const hasMessage = message !== undefined;
    const hasErrors = errors !== undefined && errors !== null;

    if (hasMessage && hasErrors) {
      return { kind: EnvelopeResultKind.ApiError, message, errors };
    }
    if (hasMessage) {
      return { kind: EnvelopeResultKind.ApiError, message };
    }
    if (hasErrors) {
      return { kind: EnvelopeResultKind.ApiError, errors };
    }
    return { kind: EnvelopeResultKind.ApiError };
  }
}
