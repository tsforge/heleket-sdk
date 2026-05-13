import { timingSafeEqual } from 'node:crypto';

import { tryParseJson } from '../common';
import type { ISigner } from '../core';

export class WebhookVerifier {
  private readonly signer: ISigner;

  constructor(signer: ISigner) {
    this.signer = signer;
  }

  public verify(body: string | Record<string, unknown>): boolean {
    const payload = WebhookVerifier.parsePayload(body);
    if (payload === null) {
      return false;
    }

    const { sign: providedSignature, ...payloadWithoutSign } = payload;
    if (typeof providedSignature !== 'string') {
      return false;
    }

    const expectedSignature = this.signer.sign(
      JSON.stringify(payloadWithoutSign),
    );
    return WebhookVerifier.signaturesMatch(
      expectedSignature,
      providedSignature,
    );
  }

  private static parsePayload(
    body: string | Record<string, unknown>,
  ): Record<string, unknown> | null {
    const candidate =
      typeof body === 'string' ? tryParseJson<unknown>(body) : body;

    if (candidate === null) {
      return null;
    }
    if (typeof candidate !== 'object') {
      return null;
    }
    if (Array.isArray(candidate)) {
      return null;
    }
    return candidate as Record<string, unknown>;
  }

  private static signaturesMatch(expected: string, provided: string): boolean {
    const expectedBytes = Buffer.from(expected);
    const providedBytes = Buffer.from(provided);
    if (expectedBytes.length !== providedBytes.length) {
      return false;
    }
    return timingSafeEqual(expectedBytes, providedBytes);
  }
}
