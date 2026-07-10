import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync} from 'node:fs';
import {join, resolve} from 'node:path';
import {tmpdir} from 'node:os';

import {analyzeArchitecture, findCycles} from './architecture-rules.mjs';

const functionDeclarations = (source) => [
  ...[...source.matchAll(/(?:export\s+)?const\s+(\w+)\s*=\s*(?:async\s*)?\(/g)].map((match) => match[1]),
  ...[...source.matchAll(/(?:export\s+)?const\s+(\w+)\s*=\s*(?:async\s+)?[A-Za-z_$][\w$]*\s*=>/g)].map((match) => match[1]),
  ...[...source.matchAll(/(?:export\s+)?const\s+(\w+)\s*=\s*(?:async\s+)?function(?:\s+\w+)?\s*\(/g)].map((match) => match[1]),
  ...[...source.matchAll(/^\s*(?:export\s+)?(?:async\s+)?function\s+(\w+)\s*\(/gm)].map((match) => match[1]),
];

function makeFixture(files) {
  const rootDir = mkdtempSync(join(tmpdir(), 'easefactor-architecture-'));

  for (const [relativePath, source] of Object.entries(files)) {
    const filePath = join(rootDir, relativePath);
    mkdirSync(resolve(filePath, '..'), {recursive: true});
    writeFileSync(filePath, source);
  }

  return {
    rootDir,
    cleanup: () => rmSync(rootDir, {recursive: true, force: true}),
  };
}

test('findCycles reports a closed three-module cycle', () => {
  const graph = new Map([
    ['a.mjs', ['b.mjs']],
    ['b.mjs', ['c.mjs']],
    ['c.mjs', ['a.mjs']],
  ]);

  assert.deepEqual(findCycles(graph), [['a.mjs', 'b.mjs', 'c.mjs', 'a.mjs']]);
});

test('analyzeArchitecture reports domain-to-API imports and module cycles', () => {
  const fixture = makeFixture({
    'domain/topic.mjs': "import '../api/server.mjs';\n",
    'api/server.mjs': 'export const server = {};\n',
    'a.mjs': "import {b} from './b.mjs';\nexport const a = b;\n",
    'b.mjs': "import {c} from './c.mjs';\nexport const b = c;\n",
    'c.mjs': "import {a} from './a.mjs';\nexport const c = a;\n",
  });

  try {
    const result = analyzeArchitecture(fixture.rootDir);

    assert.deepEqual(result.graph.get('domain/topic.mjs'), ['api/server.mjs']);
    assert.deepEqual(result.violations, [
      'cycle: a.mjs -> b.mjs -> c.mjs -> a.mjs',
      'domain-to-api: domain/topic.mjs -> api/server.mjs',
    ]);
  } finally {
    fixture.cleanup();
  }
});

test('analyzeArchitecture treats named and star re-exports as dependency edges', () => {
  const fixture = makeFixture({
    'domain/topic.mjs': "export {server} from '../api/server.mjs';\n",
    'api/server.mjs': 'export const server = {};\n',
    'a.mjs': "export {b} from './b.mjs';\n",
    'b.mjs': "export * from './a.mjs';\n",
  });

  try {
    const result = analyzeArchitecture(fixture.rootDir);

    assert.deepEqual(result.graph.get('domain/topic.mjs'), ['api/server.mjs']);
    assert.deepEqual(result.graph.get('a.mjs'), ['b.mjs']);
    assert.deepEqual(result.graph.get('b.mjs'), ['a.mjs']);
    assert.deepEqual(result.violations, [
      'cycle: a.mjs -> b.mjs -> a.mjs',
      'domain-to-api: domain/topic.mjs -> api/server.mjs',
    ]);
  } finally {
    fixture.cleanup();
  }
});

test('analyzeArchitecture reports node:http in a learner module', () => {
  const fixture = makeFixture({
    'learner/state.mjs': "import {createServer} from 'node:http';\nexport {createServer};\n",
  });

  try {
    assert.deepEqual(analyzeArchitecture(fixture.rootDir).violations, [
      'node:http: learner/state.mjs',
    ]);
  } finally {
    fixture.cleanup();
  }
});

test('analyzeArchitecture reports composition-root imports below the root', () => {
  const fixture = makeFixture({
    'planner/planning.mjs': "import '../../easefactor-reference.mjs';\n",
  });

  try {
    assert.deepEqual(analyzeArchitecture(fixture.rootDir).violations, [
      'composition-root: planner/planning.mjs -> ../easefactor-reference.mjs',
    ]);
  } finally {
    fixture.cleanup();
  }
});

test('analyzeArchitecture allows taxonomy file access only in the release loader', () => {
  const fixture = makeFixture({
    'release/load-release.mjs': "import {readFileSync} from 'node:fs';\nimport {resolve} from 'node:path';\nreadFileSync(resolve('data', 'topics.json'));\n",
    'graph/graph-store.mjs': "import {readFileSync} from 'node:fs';\nimport {resolve} from 'node:path';\nreadFileSync(resolve('data', 'topics.json'));\n",
    'content/cache.mjs': "import {readFileSync} from 'node:fs';\nexport {readFileSync};\n",
  });

  try {
    assert.deepEqual(analyzeArchitecture(fixture.rootDir).violations, [
      'taxonomy-file-access: graph/graph-store.mjs',
    ]);
  } finally {
    fixture.cleanup();
  }
});

test('analyzeArchitecture reports direct taxonomy JSON imports outside the release loader', () => {
  const fixture = makeFixture({
    'release/load-release.mjs': "import topics from '../../../data/topics.json' with {type: 'json'};\nexport {topics};\n",
    'domain/topic.mjs': "import topics from '../../../data/topics.json' with {type: 'json'};\nexport {topics};\n",
  });

  try {
    assert.deepEqual(analyzeArchitecture(fixture.rootDir).violations, [
      'taxonomy-file-access: domain/topic.mjs',
    ]);
  } finally {
    fixture.cleanup();
  }
});

test('analyzeArchitecture ignores import-shaped text that is not a static import declaration', () => {
  const fixture = makeFixture({
    'api/server.mjs': 'export const server = {};\n',
    'domain/examples.mjs': [
      "// import '../api/server.mjs';",
      "/* import '../api/server.mjs'; */",
      "const doubleQuoted = \"import '../api/server.mjs'\";",
      "const singleQuoted = 'import \\\"../api/server.mjs\\\"';",
      "const template = `import '../api/server.mjs'`;",
      "const dynamic = import('../api/server.mjs');",
      "const httpExample = \"import 'node:http'\";",
      'export {doubleQuoted, singleQuoted, template, dynamic, httpExample};',
      '',
    ].join('\n'),
  });

  try {
    const result = analyzeArchitecture(fixture.rootDir);

    assert.deepEqual(result.graph.get('domain/examples.mjs'), []);
    assert.deepEqual(result.violations, []);
  } finally {
    fixture.cleanup();
  }
});

test('live EaseFactor production modules satisfy architecture rules', () => {
  assert.deepEqual(analyzeArchitecture(resolve('scripts/easefactor')).violations, []);
});

test('composition roots contain composition only', () => {
  const declarations = (relativePath) => functionDeclarations(readFileSync(resolve(relativePath), 'utf8'));

  assert.deepEqual(declarations('scripts/easefactor-api.mjs'), ['createEaseFactorApiServer']);
  assert.deepEqual(declarations('scripts/easefactor-reference.mjs'), []);
});

test('composition-root declaration guard catches unparenthesized arrows and function expressions', () => {
  const source = [
    'const singleParameter = value => value;',
    'const asyncSingleParameter = async value => value;',
    'const expression = function (value) { return value; };',
    'const namedExpression = function inner(value) { return value; };',
  ].join('\n');

  assert.deepEqual(functionDeclarations(source), [
    'singleParameter',
    'asyncSingleParameter',
    'expression',
    'namedExpression',
  ]);
});
