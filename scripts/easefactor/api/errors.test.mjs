import assert from 'node:assert/strict';
import test from 'node:test';

import {sendMappedError} from './errors.mjs';

const responseDouble = () => ({
  body: undefined,
  statusCode: undefined,
  writeHead(statusCode) {
    this.statusCode = statusCode;
  },
  end(body) {
    this.body = body;
  },
});

test('sendMappedError maps unknown graph topics to the stable 404 response', () => {
  const res = responseDouble();

  assert.equal(sendMappedError(res, new Error('unknown_topic_id: mt_missing'), {}), true);
  assert.equal(res.statusCode, 404);
  assert.deepEqual(JSON.parse(res.body), {
    error: {
      code: 'unknown_topic_id',
      message: 'Unknown topic id: mt_missing',
      details: {topicId: 'mt_missing'},
    },
  });
});

test('sendMappedError maps reviewed parent journey errors with taxonomy context', () => {
  const res = responseDouble();
  const error = Object.assign(new Error('Reviewed activity is invalid.'), {code: 'invalid_reviewed_activity'});

  assert.equal(sendMappedError(res, error, {taxonomyVersion: 'v1'}), true);
  assert.equal(res.statusCode, 500);
  assert.deepEqual(JSON.parse(res.body), {
    error: {
      code: 'invalid_reviewed_activity',
      message: 'Reviewed activity is invalid.',
      details: {taxonomyVersion: 'v1'},
    },
  });
});

test('sendMappedError uses the route-family fallback without changing its code', () => {
  const res = responseDouble();

  assert.equal(sendMappedError(res, new Error('Request is invalid.'), {
    fallbackCode: 'invalid_planner_request',
    taxonomyVersion: 'v1',
  }), true);
  assert.equal(res.statusCode, 400);
  assert.deepEqual(JSON.parse(res.body), {
    error: {
      code: 'invalid_planner_request',
      message: 'Request is invalid.',
      details: {taxonomyVersion: 'v1'},
    },
  });
});

test('sendMappedError returns false when no known mapping or fallback exists', () => {
  assert.equal(sendMappedError(responseDouble(), new Error('unmapped'), {}), false);
});
