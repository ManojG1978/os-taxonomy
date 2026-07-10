import assert from 'node:assert/strict';
import test from 'node:test';

import {errorBody, sendError, sendJson} from './http-response.mjs';

const responseDouble = () => ({
  body: undefined,
  headers: undefined,
  statusCode: undefined,
  writeHead(statusCode, headers) {
    this.statusCode = statusCode;
    this.headers = headers;
  },
  end(body) {
    this.body = body;
  },
});

test('sendJson writes exact JSON headers and pretty-printed JSON', () => {
  const res = responseDouble();

  sendJson(res, 200, {taxonomyVersion: 'v1', count: 2});

  assert.equal(res.statusCode, 200);
  assert.deepEqual(res.headers, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
  });
  assert.equal(res.body, '{\n  "taxonomyVersion": "v1",\n  "count": 2\n}');
});

test('errorBody omits absent details and includes supplied details', () => {
  assert.deepEqual(errorBody('not_found', 'Endpoint not found.'), {
    error: {code: 'not_found', message: 'Endpoint not found.'},
  });
  assert.deepEqual(errorBody('unknown_topic_id', 'Unknown topic id: mt_missing', {topicId: 'mt_missing'}), {
    error: {
      code: 'unknown_topic_id',
      message: 'Unknown topic id: mt_missing',
      details: {topicId: 'mt_missing'},
    },
  });
});

test('sendError writes the standard error envelope', () => {
  const res = responseDouble();

  sendError(res, 404, 'not_found', 'Endpoint not found.');

  assert.equal(res.statusCode, 404);
  assert.deepEqual(JSON.parse(res.body), {
    error: {code: 'not_found', message: 'Endpoint not found.'},
  });
});
