import type { ICaseConverter } from '../../case';
import type { IEnvelopeParser } from '../../envelope';
import type { IHttpClient } from '../../http';
import type { IRetryPolicy } from '../../retry';
import type { ISigner } from '../../signer';
import type { UrlBuilder } from '../../url';

export interface ICommandExecutorDeps {
  signer: ISigner;
  merchantUuid: string;
  httpClient: IHttpClient;
  retryPolicy: IRetryPolicy;
  caseConverter: ICaseConverter;
  envelopeParser: IEnvelopeParser;
  urlBuilder: UrlBuilder;
  timeoutMs: number;
}
