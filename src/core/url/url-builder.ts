export class UrlBuilder {
  private readonly baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
  }

  public build(
    endpoint: string,
    query?: Record<string, string | undefined>,
  ): string {
    const fullPath = this.combineWithBase(endpoint);

    if (!query) {
      return fullPath;
    }

    const queryString = UrlBuilder.buildQueryString(query);
    if (queryString === '') {
      return fullPath;
    }

    return `${fullPath}?${queryString}`;
  }

  private combineWithBase(endpoint: string): string {
    const path = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    return `${this.baseUrl}${path}`;
  }

  private static buildQueryString(
    query: Record<string, string | undefined>,
  ): string {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined) {
        params.append(key, value);
      }
    }
    return params.toString();
  }
}
