import type { ICommandResponse } from '../../common';
import {
  ACCEPT_JSON,
  CONTENT_TYPE_JSON,
  ERRORS,
  HEADERS,
} from '../../constants';
import type { ErrorEntry } from '../../constants';
import type { ICaseConverter } from '../case';
import { EnvelopeResultKind } from '../envelope';
import type { IEnvelopeParser } from '../envelope';
import { TransportError } from '../http';
import type { IHttpClient, IHttpRequest, IHttpResponse } from '../http';
import { RetryOutcomeKind } from '../retry';
import type { IRetryPolicy, RetryOutcome } from '../retry';
import type { ISigner } from '../signer';
import type { UrlBuilder } from '../url';
import type {
  ICommandDescriptor,
  ICommandExecutorDeps,
  IExecuteOptions,
} from './interfaces';

interface ZodIssue {
  path: ReadonlyArray<PropertyKey>;
  message: string;
}

export class CommandExecutor {
  private readonly signer: ISigner;
  private readonly merchantUuid: string;
  private readonly httpClient: IHttpClient;
  private readonly retryPolicy: IRetryPolicy;
  private readonly caseConverter: ICaseConverter;
  private readonly envelopeParser: IEnvelopeParser;
  private readonly urlBuilder: UrlBuilder;
  private readonly timeoutMs: number;

  constructor(deps: ICommandExecutorDeps) {
    this.signer = deps.signer;
    this.merchantUuid = deps.merchantUuid;
    this.httpClient = deps.httpClient;
    this.retryPolicy = deps.retryPolicy;
    this.caseConverter = deps.caseConverter;
    this.envelopeParser = deps.envelopeParser;
    this.urlBuilder = deps.urlBuilder;
    this.timeoutMs = deps.timeoutMs;
  }

  public async execute<TIn, TOut>(
    command: ICommandDescriptor<TIn, TOut>,
    input: TIn,
    options?: IExecuteOptions,
  ): Promise<ICommandResponse<TOut>> {
    const inputCheck = command.RequestBodySchema.safeParse(input);
    if (!inputCheck.success) {
      const issues = CommandExecutor.formatZodIssues(inputCheck.error.issues);
      return CommandExecutor.fail(ERRORS.VALIDATION_ERROR, issues);
    }

    const requestBody = this.serializeBody(inputCheck.data);
    const signature = this.signer.sign(requestBody);
    const requestUrl = this.urlBuilder.build(command.url, options?.query);
    const headers = this.buildHeaders(signature);

    let httpResponse: IHttpResponse;
    try {
      httpResponse = await this.sendWithRetry(
        requestUrl,
        requestBody,
        headers,
        options?.signal,
      );
    } catch (err) {
      if (err instanceof TransportError) {
        return CommandExecutor.fail(err.error, err.message);
      }
      throw err;
    }

    const envelope = this.envelopeParser.parse(
      httpResponse.body,
      httpResponse.status,
    );
    if (envelope.kind === EnvelopeResultKind.ParseError) {
      return CommandExecutor.fail(ERRORS.PARSE_ERROR);
    }
    if (envelope.kind === EnvelopeResultKind.ApiError) {
      return CommandExecutor.fail(
        ERRORS.API_ERROR,
        envelope.message,
        envelope.errors,
      );
    }

    return this.parseSuccessResult(command, envelope.result);
  }

  private serializeBody(input: unknown): string {
    const wireFormat = this.caseConverter.toWire(input);
    return JSON.stringify(wireFormat);
  }

  private buildHeaders(signature: string): Record<string, string> {
    return {
      [HEADERS.MERCHANT]: this.merchantUuid,
      [HEADERS.SIGN]: signature,
      [HEADERS.CONTENT_TYPE]: CONTENT_TYPE_JSON,
      [HEADERS.ACCEPT]: ACCEPT_JSON,
    };
  }

  private sendWithRetry(
    url: string,
    body: string,
    headers: Record<string, string>,
    signal: AbortSignal | undefined,
  ): Promise<IHttpResponse> {
    const request: IHttpRequest = {
      url,
      headers,
      body,
      timeoutMs: this.timeoutMs,
      signal,
    };
    const performRequest = (): Promise<IHttpResponse> =>
      this.httpClient.post(request);
    return this.retryPolicy.execute(
      performRequest,
      CommandExecutor.isRetryable,
    );
  }

  private parseSuccessResult<TOut>(
    command: ICommandDescriptor<unknown, TOut>,
    rawResult: unknown,
  ): ICommandResponse<TOut> {
    const camelCaseResult = this.caseConverter.fromWire(rawResult);
    const responseCheck = command.ResponseSchema.safeParse(camelCaseResult);
    if (responseCheck.success) {
      return { isSuccess: true, data: responseCheck.data };
    }
    const issues = CommandExecutor.formatZodIssues(responseCheck.error.issues);
    return CommandExecutor.fail(ERRORS.PARSE_ERROR, issues);
  }

  private static isRetryable(outcome: RetryOutcome<IHttpResponse>): boolean {
    if (outcome.kind === RetryOutcomeKind.Error) {
      return outcome.error instanceof TransportError;
    }
    const status = outcome.value.status;
    if (status >= 500) {
      return true;
    }
    if (status === 429) {
      return true;
    }
    return false;
  }

  private static fail<T>(
    error: ErrorEntry,
    message?: string,
    errors?: unknown,
  ): ICommandResponse<T> {
    const response: ICommandResponse<T> = {
      isSuccess: false,
      code: error.code,
      message: message ?? error.message,
    };
    if (errors !== undefined) {
      response.errors = errors;
    }
    return response;
  }

  private static formatZodIssues(issues: ReadonlyArray<ZodIssue>): string {
    return issues
      .map((issue) => {
        const path = issue.path.map(String).join('.');
        return `${path}: ${issue.message}`;
      })
      .join('; ');
  }
}
