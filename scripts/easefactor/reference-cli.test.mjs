import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';

test('CLI --demo emits a valid recommendation payload', () => {
  const output = execFileSync(process.execPath, ['scripts/easefactor-reference.mjs', '--demo'], {encoding: 'utf8'});
  const payload = JSON.parse(output);

  assert.equal(payload.taxonomyVersion, 'v1');
  assert.equal(payload.goal.curriculum, 'ncert-class6-math-2026-27');
  assert.equal(payload.goal.strand, 'Number System');
  assert.ok(Array.isArray(payload.recommendations));
  assert.ok(payload.recommendations.length > 0);
  assert.ok(payload.decisionLog && payload.decisionLog.scoringVersion);
});
