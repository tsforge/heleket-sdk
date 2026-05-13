import { ERRORS } from '../../constants';
import type {
  FetchLike,
  IHttpClient,
  IHttpRequest,
  IHttpResponse,
} from './interfaces';
import { TransportError } from './transport-error';

export class FetchHttpClient implements IHttpClient {
  private readonly fetchImpl: FetchLike;

  constructor(fetchImpl: FetchLike) {
    this.fetchImpl = fetchImpl;
  }

  public async post(request: IHttpRequest): Promise<IHttpResponse> {
    const timeoutSignal = AbortSignal.timeout(request.timeoutMs);
    const signal = this.composeSignal(timeoutSignal, request.signal);

    let response: Response;
    try {
      response = await this.fetchImpl(request.url, {
        method: 'POST',
        headers: request.headers,
        body: request.body,
        signal,
      });
    } catch (err) {
      throw this.toTransportError(err, timeoutSignal);
    }

    const body = await response.text();
    return { status: response.status, body };
  }

  private composeSignal(timeout: AbortSignal, user?: AbortSignal): AbortSignal {
    if (!user) {
      return timeout;
    }

    const merged = new AbortController();
    FetchHttpClient.forwardAbort(timeout, merged);
    FetchHttpClient.forwardAbort(user, merged);
    return merged.signal;
  }

  private toTransportError(
    err: unknown,
    timeoutSignal: AbortSignal,
  ): TransportError {
    if (timeoutSignal.aborted) {
      return new TransportError(ERRORS.TIMEOUT_ERROR);
    }
    const message = err instanceof Error ? err.message : String(err);
    return new TransportError(ERRORS.NETWORK_ERROR, message);
  }

  private static forwardAbort(
    source: AbortSignal,
    target: AbortController,
  ): void {
    if (source.aborted) {
      target.abort(source.reason);
      return;
    }
    source.addEventListener('abort', () => target.abort(source.reason));
  }
}
