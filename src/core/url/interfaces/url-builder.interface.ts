export interface IUrlBuilder {
  build(endpoint: string, query?: Record<string, string | undefined>): string;
}
