export interface IExecuteOptions {
  query?: Record<string, string | undefined> | undefined;
  signal?: AbortSignal | undefined;
}
