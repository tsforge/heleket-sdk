import type { IHttpRequest } from './http-request.interface';
import type { IHttpResponse } from './http-response.interface';

export interface IHttpClient {
  post(request: IHttpRequest): Promise<IHttpResponse>;
}
