import assert from 'node:assert/strict';
import {Readable} from 'node:stream';
import test from 'node:test';

import {readJsonBody, readJsonRequest} from './request-body.mjs';

const requestFrom = (...chunks) => Readable.from(chunks.map((chunk) => Buffer.from(chunk)));

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

test('readJsonBody returns an empty object for an empty request body', async () => {
  assert.deepEqual(await readJsonBody(requestFrom()), {});
});

test('readJsonBody parses valid JSON split across request chunks', async () => {
  assert.deepEqual(await readJsonBody(requestFrom('{"learnerId":', '"synthetic-001"}')), {
    learnerId: 'synthetic-001',
  });
});

test('readJsonBody marks malformed JSON with invalid_json', async () => {
  await assert.rejects(
    readJsonBody(requestFrom('{"learnerId":')),
    (error) => error.code === 'invalid_json',
  );
});

test('readJsonBody rejects a request larger than 1 MB', async () => {
  await assert.rejects(
    readJsonBody(requestFrom('x'.repeat(1048577))),
    (error) => error.code === 'request_body_too_large',
  );
});

test('readJsonBody accepts exactly 1 MB of valid JSON', async () => {
  const body = JSON.stringify({value: 'x'.repeat(1048564)});

  assert.equal(Buffer.byteLength(body), 1048576);
  assert.deepEqual(await readJsonBody(requestFrom(body)), {
    value: 'x'.repeat(1048564),
  });
});

test('readJsonRequest converts body errors into stable HTTP envelopes', async () => {
  const malformedRes = responseDouble();
  const oversizedRes = responseDouble();

  assert.equal(await readJsonRequest(requestFrom('{'), malformedRes), null);
  assert.equal(malformedRes.statusCode, 400);
  assert.deepEqual(JSON.parse(malformedRes.body), {
    error: {code: 'invalid_json', message: 'Request body must be valid JSON.'},
  });

  assert.equal(await readJsonRequest(requestFrom('x'.repeat(1048577)), oversizedRes), null);
  assert.equal(oversizedRes.statusCode, 413);
  assert.deepEqual(JSON.parse(oversizedRes.body), {
    error: {code: 'request_body_too_large', message: 'Request body exceeds 1 MB.'},
  });
});
