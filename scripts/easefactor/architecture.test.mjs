import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdirSync, mkdtempSync, rmSync, writeFileSync} from 'node:fs';
import {join, resolve} from 'node:path';
import {tmpdir} from 'node:os';

import {analyzeArchitecture, findCycles} from './architecture-rules.mjs';

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
