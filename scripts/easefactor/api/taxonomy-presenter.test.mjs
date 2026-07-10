import assert from 'node:assert/strict';
import test from 'node:test';

import {loadTaxonomyRelease} from '../release/load-release.mjs';
import {
  buildCoverage,
  filterAlignments,
  filterClusters,
  filterCurricula,
  filterStandards,
  filterTopics,
  releaseEnvelope,
  standardRows,
} from './taxonomy-presenter.mjs';

const release = loadTaxonomyRelease();

test('releaseEnvelope presents the current release contract', () => {
  assert.deepEqual(releaseEnvelope(release), {
    taxonomyVersion: release.taxonomyVersion,
    release: {
      taxonomyVersion: release.taxonomyVersion,
      counts: release.manifest.counts,
      subjects: release.manifest.subjects,
      files: release.manifest.files,
      codesOnlySources: release.codesOnlySources,
      sourceFileHashes: release.sourceFileHashes,
    },
  });
});

test('cluster presentation filters by subject, domain, and age', () => {
  const clusters = filterClusters(release, {
    subject: 'English',
    domain: 'Grammar & Punctuation',
    age: 7,
  });

  assert.equal(clusters.length, 1);
  assert.equal(clusters[0].subject, 'English');
  assert.equal(clusters[0].domain, 'Grammar & Punctuation');
  assert.equal(clusters[0].ageRangeStart, 7);
});

test('topic presentation filters the real release by subject and age', () => {
  const topics = filterTopics(release.topics, {subject: 'Mathematics', age: 5});

  assert.ok(topics.length > 0);
  assert.ok(topics.every((topic) => topic.subject === 'Mathematics'));
  assert.ok(topics.every((topic) => topic.ageRangeStart <= 5 && topic.ageRangeEnd >= 5));
});

test('curriculum and standard presentation preserves codes-only filtering', () => {
  const curricula = filterCurricula(release, {country: 'IN', codesOnly: true});
  const standards = filterStandards(release, {curriculum: 'ncert-class6-math-2026-27', board: 'CBSE', class: 6});

  assert.deepEqual(curricula.map((row) => row.slug), ['ncert-class6-math-2026-27']);
  assert.equal(standards.length, 50);
  assert.ok(standards.every((row) => row.codesOnly && row.textIncluded === false));
  assert.equal(standardRows(release).length, release.manifest.counts.curriculumStandards);
});

test('alignment and coverage presentation filters the real release', () => {
  const alignments = filterAlignments(release, {curriculum: 'ncert-class6-math-2026-27', strand: 'Number System'});
  const coverage = buildCoverage(release, {curriculum: 'ncert-class6-math-2026-27'});

  assert.ok(alignments.length > 0);
  assert.ok(alignments.every((row) => row.strand === 'Number System'));
  assert.equal(coverage.length, 1);
  assert.equal(coverage[0].curriculum, 'ncert-class6-math-2026-27');
  assert.equal(coverage[0].alignmentCount, release.alignments.length);
  assert.deepEqual(coverage[0].boards, ['CBSE']);
  assert.deepEqual(coverage[0].classes, [6]);
});
