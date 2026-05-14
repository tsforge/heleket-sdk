import { describe, expect, test } from 'vitest';

import { HeleketEnvelopeParser } from './heleket-envelope-parser';
import { EnvelopeResultKind } from './interfaces';

const parser = new HeleketEnvelopeParser();

describe('HeleketEnvelopeParser.parse', () => {
  test('returns ParseError on malformed JSON', () => {
    const res = parser.parse('{not json', 200);
    expect(res.kind).toBe(EnvelopeResultKind.ParseError);
  });

  test('returns Success on state=0 envelope', () => {
    const res = parser.parse(
      JSON.stringify({ state: 0, result: { x: 1 } }),
      200,
    );
    expect(res).toEqual({
      kind: EnvelopeResultKind.Success,
      result: { x: 1 },
    });
  });

  test('returns Success when body is empty and status is 2xx', () => {
    const res = parser.parse('', 200);
    expect(res.kind).toBe(EnvelopeResultKind.Success);
  });

  test('returns ApiError when state != 0 even on 2xx status', () => {
    const res = parser.parse(JSON.stringify({ state: 1, message: 'bad' }), 200);
    expect(res).toMatchObject({
      kind: EnvelopeResultKind.ApiError,
      message: 'bad',
    });
  });

  test('returns ApiError on non-2xx status', () => {
    const res = parser.parse(JSON.stringify({ message: 'unauthorized' }), 401);
    expect(res).toMatchObject({
      kind: EnvelopeResultKind.ApiError,
      message: 'unauthorized',
    });
  });

  test('includes errors object when both message and errors are present', () => {
    const res = parser.parse(
      JSON.stringify({
        state: 1,
        message: 'Validation error',
        errors: { amount: ['too small'] },
      }),
      422,
    );
    expect(res).toEqual({
      kind: EnvelopeResultKind.ApiError,
      message: 'Validation error',
      errors: { amount: ['too small'] },
    });
  });

  test('returns ApiError with only errors when message is absent', () => {
    const res = parser.parse(
      JSON.stringify({ errors: { field: ['bad'] } }),
      422,
    );
    expect(res).toEqual({
      kind: EnvelopeResultKind.ApiError,
      errors: { field: ['bad'] },
    });
  });

  test('returns bare ApiError when neither message nor errors are present', () => {
    const res = parser.parse(JSON.stringify({}), 500);
    expect(res).toEqual({ kind: EnvelopeResultKind.ApiError });
  });

  test('treats null errors as absent', () => {
    const res = parser.parse(
      JSON.stringify({ message: 'oops', errors: null }),
      400,
    );
    expect(res).toEqual({
      kind: EnvelopeResultKind.ApiError,
      message: 'oops',
    });
  });
});
