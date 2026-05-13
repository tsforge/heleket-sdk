import { describe, expect, test } from 'vitest';

import { SnakeCaseConverter } from './snake-case-converter';

const converter = new SnakeCaseConverter();

describe('SnakeCaseConverter.toWire', () => {
  test('converts camelCase keys recursively', () => {
    expect(converter.toWire({ orderId: '1', urlCallback: 'a' })).toEqual({
      order_id: '1',
      url_callback: 'a',
    });
  });

  test('handles nested objects and arrays', () => {
    expect(
      converter.toWire({
        orderId: '1',
        nested: { fooBar: 1, deepDeep: { theKey: 2 } },
        list: [{ itemId: 'x' }],
      }),
    ).toEqual({
      order_id: '1',
      nested: { foo_bar: 1, deep_deep: { the_key: 2 } },
      list: [{ item_id: 'x' }],
    });
  });

  test('passes primitives through unchanged', () => {
    expect(converter.toWire('hello')).toBe('hello');
    expect(converter.toWire(42)).toBe(42);
    expect(converter.toWire(null)).toBeNull();
  });
});

describe('SnakeCaseConverter.fromWire', () => {
  test('converts snake_case keys recursively', () => {
    expect(converter.fromWire({ order_id: '1', url_callback: 'a' })).toEqual({
      orderId: '1',
      urlCallback: 'a',
    });
  });

  test('handles nested objects and arrays', () => {
    expect(
      converter.fromWire({
        order_id: '1',
        nested: { foo_bar: 1, deep_deep: { the_key: 2 } },
        list: [{ item_id: 'x' }],
      }),
    ).toEqual({
      orderId: '1',
      nested: { fooBar: 1, deepDeep: { theKey: 2 } },
      list: [{ itemId: 'x' }],
    });
  });
});
