import {
  CommandExecutor,
  ExponentialBackoffRetryPolicy,
  FetchHttpClient,
  HeleketEnvelopeParser,
  HTTP_DEFAULTS,
  Md5Signer,
  RETRY_DEFAULTS,
  SnakeCaseConverter,
  UrlBuilder,
} from './core';
import type {
  FetchLike,
  ICaseConverter,
  IEnvelopeParser,
  IHttpClient,
  IRetryPolicy,
  ISigner,
  RetryOptions,
} from './core';
import { PaymentResource, PayoutResource } from './resources';
import { BASE_URL } from './shared/api';
import { WebhookVerifier } from './webhook';

export type SignerFactory = (apiKey: string) => ISigner;

export interface HeleketClientOptions {
  paymentKey?: string;
  payoutKey?: string;
  merchantUuid: string;
  baseUrl?: string;
  fetch?: FetchLike;
  timeoutMs?: number;
  retry?: Partial<RetryOptions>;
  httpClient?: IHttpClient;
  retryPolicy?: IRetryPolicy;
  caseConverter?: ICaseConverter;
  envelopeParser?: IEnvelopeParser;
  signerFactory?: SignerFactory;
}

export class HeleketClient {
  private readonly merchantUuid: string;
  private readonly paymentKey: string | undefined;
  private readonly payoutKey: string | undefined;
  private readonly baseUrl: string;
  private readonly timeoutMs: number;
  private readonly httpClient: IHttpClient;
  private readonly retryPolicy: IRetryPolicy;
  private readonly caseConverter: ICaseConverter;
  private readonly envelopeParser: IEnvelopeParser;
  private readonly urlBuilder: UrlBuilder;
  private readonly signerFactory: SignerFactory;

  private paymentResource: PaymentResource | undefined;
  private payoutResource: PayoutResource | undefined;
  private paymentWebhookVerifier: WebhookVerifier | undefined;
  private payoutWebhookVerifier: WebhookVerifier | undefined;

  constructor(options: HeleketClientOptions) {
    HeleketClient.assertRequiredOptions(options);

    this.merchantUuid = options.merchantUuid;
    this.paymentKey = options.paymentKey;
    this.payoutKey = options.payoutKey;
    this.baseUrl = options.baseUrl ?? BASE_URL;
    this.timeoutMs = options.timeoutMs ?? HTTP_DEFAULTS.TIMEOUT_MS;

    this.httpClient =
      options.httpClient ?? HeleketClient.buildHttpClient(options.fetch);
    this.retryPolicy =
      options.retryPolicy ?? HeleketClient.buildRetryPolicy(options.retry);
    this.caseConverter = options.caseConverter ?? new SnakeCaseConverter();
    this.envelopeParser = options.envelopeParser ?? new HeleketEnvelopeParser();
    this.urlBuilder = new UrlBuilder(this.baseUrl);
    this.signerFactory =
      options.signerFactory ?? HeleketClient.defaultSignerFactory;
  }

  public get payment(): PaymentResource {
    if (this.paymentResource) {
      return this.paymentResource;
    }
    const apiKey = this.requirePaymentKey('payment');
    this.paymentResource = new PaymentResource(this.buildExecutor(apiKey));
    return this.paymentResource;
  }

  public get payout(): PayoutResource {
    if (this.payoutResource) {
      return this.payoutResource;
    }
    const apiKey = this.requirePayoutKey('payout');
    this.payoutResource = new PayoutResource(this.buildExecutor(apiKey));
    return this.payoutResource;
  }

  public get paymentWebhook(): WebhookVerifier {
    if (this.paymentWebhookVerifier) {
      return this.paymentWebhookVerifier;
    }
    const apiKey = this.requirePaymentKey('paymentWebhook');
    this.paymentWebhookVerifier = new WebhookVerifier(
      this.signerFactory(apiKey),
    );
    return this.paymentWebhookVerifier;
  }

  public get payoutWebhook(): WebhookVerifier {
    if (this.payoutWebhookVerifier) {
      return this.payoutWebhookVerifier;
    }
    const apiKey = this.requirePayoutKey('payoutWebhook');
    this.payoutWebhookVerifier = new WebhookVerifier(
      this.signerFactory(apiKey),
    );
    return this.payoutWebhookVerifier;
  }

  private buildExecutor(apiKey: string): CommandExecutor {
    return new CommandExecutor({
      signer: this.signerFactory(apiKey),
      merchantUuid: this.merchantUuid,
      httpClient: this.httpClient,
      retryPolicy: this.retryPolicy,
      caseConverter: this.caseConverter,
      envelopeParser: this.envelopeParser,
      urlBuilder: this.urlBuilder,
      timeoutMs: this.timeoutMs,
    });
  }

  private requirePaymentKey(usedBy: string): string {
    if (!this.paymentKey) {
      throw new Error(
        `HeleketClient.${usedBy}: paymentKey was not provided in the constructor`,
      );
    }
    return this.paymentKey;
  }

  private requirePayoutKey(usedBy: string): string {
    if (!this.payoutKey) {
      throw new Error(
        `HeleketClient.${usedBy}: payoutKey was not provided in the constructor`,
      );
    }
    return this.payoutKey;
  }

  private static assertRequiredOptions(options: HeleketClientOptions): void {
    if (!options.merchantUuid) {
      throw new Error('HeleketClient: merchantUuid is required');
    }
    if (!options.paymentKey && !options.payoutKey) {
      throw new Error(
        'HeleketClient: at least one of paymentKey or payoutKey must be provided',
      );
    }
  }

  private static buildHttpClient(
    customFetch: FetchLike | undefined,
  ): FetchHttpClient {
    const fetchImpl = HeleketClient.resolveFetch(customFetch);
    return new FetchHttpClient(fetchImpl);
  }

  private static buildRetryPolicy(
    userRetry: Partial<RetryOptions> | undefined,
  ): ExponentialBackoffRetryPolicy {
    const config: RetryOptions = {
      retries: userRetry?.retries ?? RETRY_DEFAULTS.RETRIES,
      baseDelayMs: userRetry?.baseDelayMs ?? RETRY_DEFAULTS.BASE_DELAY_MS,
      maxDelayMs: userRetry?.maxDelayMs ?? RETRY_DEFAULTS.MAX_DELAY_MS,
    };
    if (userRetry?.sleep) {
      config.sleep = userRetry.sleep;
    }
    if (userRetry?.random) {
      config.random = userRetry.random;
    }
    return new ExponentialBackoffRetryPolicy(config);
  }

  private static defaultSignerFactory(apiKey: string): ISigner {
    return new Md5Signer(apiKey);
  }

  private static resolveFetch(custom: FetchLike | undefined): FetchLike {
    if (custom) {
      return custom;
    }
    const globalFetch = (globalThis as { fetch?: FetchLike }).fetch;
    if (typeof globalFetch !== 'function') {
      throw new Error(
        'HeleketClient: global fetch is unavailable. Pass options.fetch explicitly or run on Node >= 18.',
      );
    }
    return globalFetch;
  }
}
