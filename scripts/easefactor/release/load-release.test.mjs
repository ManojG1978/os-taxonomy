import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {join} from 'node:path';

import {loadTaxonomyRelease} from './load-release.mjs';
import {setManifestCountAndGetFixture} from '../reference-fixtures.test-helper.mjs';

test('imports a full release and verifies manifest provenance', () => {
  const release = loadTaxonomyRelease();
  const expectedCurriculumStandards = release.curricula.reduce(
    (count, curriculum) => count + (Array.isArray(curriculum.topics) ? curriculum.topics.length : (curriculum.topicCount ?? 0)),
    0,
  );

  assert.equal(release.taxonomyVersion, 'v1');
  assert.equal(release.topics.length, release.manifest.counts.topics);
  assert.equal(release.dependencies.length, release.manifest.counts.dependencies);
  assert.equal(release.alignments.length, release.manifest.counts.curriculumAlignments);
  assert.equal(release.curricula.length, release.manifest.counts.curricula);
  assert.equal(release.manifest.counts.curriculumStandards, expectedCurriculumStandards);
  assert.equal(release.manifest.counts.clusters, release.clusters.length);
  assert.ok(typeof release.sourceFileHashes['topics.json'] === 'string');
  assert.ok(typeof release.sourceFileHashes['curriculum-alignments.json'] === 'string');
  assert.ok(release.codesOnlySources.includes('ncert-class6-math-2026-27'));
});

test('loadTaxonomyRelease verifies curricula manifest count', () => {
  const fixture = setManifestCountAndGetFixture('curricula', 0);
  try {
    assert.throws(
      () => loadTaxonomyRelease(fixture.rootDir),
      /manifest_count_mismatch: curricula/,
    );
  } finally {
    fixture.cleanup();
  }
});

test('loadTaxonomyRelease verifies curriculumStandards manifest count', () => {
  const expectedCurriculumStandards = loadTaxonomyRelease().curricula.reduce(
    (count, curriculum) => count + (Array.isArray(curriculum.topics) ? curriculum.topics.length : (curriculum.topicCount ?? 0)),
    0,
  );
  const fixture = setManifestCountAndGetFixture('curriculumStandards', expectedCurriculumStandards + 1);

  try {
    assert.throws(
      () => loadTaxonomyRelease(fixture.rootDir),
      /manifest_count_mismatch: curriculumStandards/,
    );
  } finally {
    fixture.cleanup();
  }
});

test('loadTaxonomyRelease verifies clusters manifest count', () => {
  const clusters = JSON.parse(readFileSync(join(process.cwd(), 'data', 'clusters.json'), 'utf8'));
  const fixture = setManifestCountAndGetFixture('clusters', clusters.clusters.length + 1);

  try {
    assert.throws(
      () => loadTaxonomyRelease(fixture.rootDir),
      /manifest_count_mismatch: clusters/,
    );
  } finally {
    fixture.cleanup();
  }
});
