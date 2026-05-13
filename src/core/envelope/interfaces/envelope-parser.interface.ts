import type { EnvelopeResult } from './envelope-result.interface';

export interface IEnvelopeParser {
  parse(body: string, status: number): EnvelopeResult;
}
