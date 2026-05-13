import { createHash } from 'node:crypto';

import type { ISigner } from './interfaces';

export class Md5Signer implements ISigner {
  private readonly apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  public sign(body: string): string {
    const base64Body = Buffer.from(body, 'utf8').toString('base64');
    const payload = base64Body + this.apiKey;
    return createHash('md5').update(payload).digest('hex');
  }
}
