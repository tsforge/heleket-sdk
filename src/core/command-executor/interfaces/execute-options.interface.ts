export interface IExecuteOptions {
  path?: string | undefined;
  query?: Record<string, string | undefined> | undefined;
  signal?: AbortSignal | undefined;
}
