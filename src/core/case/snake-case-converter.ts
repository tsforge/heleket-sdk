import type { ICaseConverter } from './interfaces';

type KeyTransform = (key: string) => string;

export class SnakeCaseConverter implements ICaseConverter {
  public toWire(value: unknown): unknown {
    return this.transform(value, SnakeCaseConverter.camelToSnakeKey);
  }

  public fromWire(value: unknown): unknown {
    return this.transform(value, SnakeCaseConverter.snakeToCamelKey);
  }

  private transform(value: unknown, keyFn: KeyTransform): unknown {
    if (Array.isArray(value)) {
      return value.map((item) => this.transform(item, keyFn));
    }

    if (value === null || typeof value !== 'object') {
      return value;
    }

    const result: Record<string, unknown> = {};
    for (const [key, nestedValue] of Object.entries(value)) {
      const newKey = keyFn(key);
      result[newKey] = this.transform(nestedValue, keyFn);
    }
    return result;
  }

  private static camelToSnakeKey(key: string): string {
    return key.replace(/[A-Z]/g, (match) => `_${match.toLowerCase()}`);
  }

  private static snakeToCamelKey(key: string): string {
    return key.replace(/_([a-z0-9])/g, (_, char: string) => char.toUpperCase());
  }
}
