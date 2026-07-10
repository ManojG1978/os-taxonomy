import assert from 'node:assert/strict';
import test from 'node:test';

import {paginate, parseNonNegativeInt, parseQuery} from './query.mjs';

test('parseQuery coerces numeric and boolean query fields only', () => {
  const query = parseQuery(new URLSearchParams([
    ['class', '6'],
    ['age', '11'],
    ['depth', '2'],
    ['prerequisiteDepth', '3'],
    ['limit', '25'],
    ['offset', '5'],
    ['codesOnly', 'true'],
    ['subject', 'Mathematics'],
  ]));

  assert.deepEqual(query, {
    class: 6,
    age: 11,
    depth: 2,
    prerequisiteDepth: 3,
    limit: 25,
    offset: 5,
    codesOnly: true,
    subject: 'Mathematics',
  });
  assert.equal(parseQuery(new URLSearchParams('codesOnly=maybe')).codesOnly, 'maybe');
});

test('parseNonNegativeInt falls back for invalid or negative values and caps the maximum', () => {
  assert.equal(parseNonNegativeInt(undefined, 7), 7);
  assert.equal(parseNonNegativeInt('invalid', 7), 7);
  assert.equal(parseNonNegativeInt('-1', 7), 7);
  assert.equal(parseNonNegativeInt('12', 7), 12);
  assert.equal(parseNonNegativeInt('2000', 7), 1000);
  assert.equal(parseNonNegativeInt('15', 7, {max: 10}), 10);
});

test('paginate applies stable defaults, maximum limit, and offsets', () => {
  const rows = Array.from({length: 600}, (_, index) => index);

  assert.deepEqual(paginate(rows, {}), {
    offset: 0,
    limit: 100,
    rows: rows.slice(0, 100),
  });
  assert.deepEqual(paginate(rows, {offset: 3, limit: 999}), {
    offset: 3,
    limit: 500,
    rows: rows.slice(3, 503),
  });
});
