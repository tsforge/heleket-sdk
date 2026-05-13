export interface IHttpRequest {
  url: string;
  headers: Record<string, string>;
  body: string;
  timeoutMs: number;
  signal?: AbortSignal | undefined;
}
