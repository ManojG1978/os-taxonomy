import test from 'node:test';
import assert from 'node:assert/strict';

import {sendJson} from './http-response.mjs';
import {createRouter} from './router.mjs';

const makeResponse = () => ({
  statusCode: undefined,
  headers: undefined,
  body: undefined,
  writeHead(statusCode, headers) {
    this.statusCode = statusCode;
    this.headers = headers;
  },
  end(body) {
    this.body = body;
  },
});

const bodyOf = (res) => JSON.parse(res.body);

test('createRouter dispatches the matching descriptor with decoded path parameters', async () => {
  const res = makeResponse();
  const router = createRouter({routes: [{
    method: 'GET',
    match: (parts) => parts.length === 2 && parts[0] === 'topics'
      ? {topicId: parts[1]}
      : false,
    handle: ({res: response, params, pathParts, url}) => sendJson(response, 200, {
      topicId: params.topicId,
      pathParts,
      mode: url.searchParams.get('mode'),
    }),
  }]});

  await router({method: 'GET', url: '/topics/fractions%20intro?mode=detail'}, res);

  assert.equal(res.statusCode, 200);
  assert.deepEqual(bodyOf(res), {
    topicId: 'fractions intro',
    pathParts: ['topics', 'fractions intro'],
    mode: 'detail',
  });
});

for (const method of ['GET', 'POST']) {
  test(`${method} unmatched paths return the legacy 404 envelope`, async () => {
    const res = makeResponse();
    const router = createRouter({routes: []});

    await router({method, url: '/missing'}, res);

    assert.equal(res.statusCode, 404);
    assert.deepEqual(bodyOf(res), {
      error: {code: 'not_found', message: 'Endpoint not found.'},
    });
  });
}

test('GET and POST do not match descriptors belonging to the other supported method', async () => {
  const routes = [
    {method: 'GET', match: (parts) => parts.join('/') === 'health' ? {} : false, handle() {}},
    {method: 'POST', match: (parts) => parts.join('/') === 'submit' ? {} : false, handle() {}},
  ];

  for (const request of [
    {method: 'POST', url: '/health'},
    {method: 'GET', url: '/submit'},
  ]) {
    const res = makeResponse();
    await createRouter({routes})(request, res);
    assert.equal(res.statusCode, 404);
    assert.equal(bodyOf(res).error.code, 'not_found');
  }
});

test('methods other than GET and POST return 405 regardless of path', async () => {
  const routes = [{method: 'GET', match: (parts) => parts.join('/') === 'health' ? {} : false, handle() {}}];
  const res = makeResponse();

  await createRouter({routes})({method: 'PATCH', url: '/health'}, res);

  assert.equal(res.statusCode, 405);
  assert.deepEqual(bodyOf(res), {
    error: {code: 'method_not_allowed', message: 'Method not allowed.'},
  });
});

test('thrown handlers return the existing internal error envelope', async () => {
  const res = makeResponse();
  const router = createRouter({routes: [{
    method: 'POST',
    match: (parts) => parts.join('/') === 'explode' ? {} : false,
    handle() {
      throw new Error('boom');
    },
  }]});

  await router({method: 'POST', url: '/explode'}, res);

  assert.equal(res.statusCode, 500);
  assert.deepEqual(bodyOf(res), {
    error: {code: 'internal_error', message: 'boom'},
  });
});
