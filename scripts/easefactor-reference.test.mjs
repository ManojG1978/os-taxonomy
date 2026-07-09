import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {
  copyFileSync,
  mkdtempSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';

import {
  loadTaxonomyRelease,
  makeGraphStore,
  deriveMasteryState,
  checkReadiness,
  findLearningGaps,
  validateContentMappings,
  recommendNextBestTopics,
} from './easefactor-reference.mjs';

const fixtureDataFiles = [
  'manifest.json',
  'topics.json',
  'dependencies.json',
  'curriculum-standards.json',
  'curriculum-alignments.json',
  'clusters.json',
];

const makeReleaseFixture = () => {
  const rootDir = mkdtempSync(join(tmpdir(), 'easefactor-reference-'));
  const sourceDataDir = join(process.cwd(), 'data');
  const fixtureDataDir = join(rootDir, 'data');
  mkdirSync(fixtureDataDir, {recursive: true});

  for (const fileName of fixtureDataFiles) {
    copyFileSync(join(sourceDataDir, fileName), join(fixtureDataDir, fileName));
  }

  return {
    rootDir,
    cleanup: () => rmSync(rootDir, {recursive: true, force: true}),
  };
};

const setManifestCountAndGetFixture = (countKey, nextCount) => {
  const fixture = makeReleaseFixture();
  const manifestPath = join(fixture.rootDir, 'data', 'manifest.json');
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
  manifest.counts = {...manifest.counts, [countKey]: nextCount};
  writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
  return fixture;
};

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

test('builds a graph store with prerequisite and unlock traversal', () => {
  const graph = makeGraphStore(loadTaxonomyRelease());
  assert.equal(graph.taxonomyVersion, 'v1');

  const topic = graph.getTopic('mt_FHIAv6dfhU');
  assert.equal(topic.id, 'mt_FHIAv6dfhU');
  assert.equal(topic.subject, 'Mathematics');

  const prerequisites = graph.getPrerequisites('mt_FHIAv6dfhU', {depth: 2});
  assert.equal(prerequisites.taxonomyVersion, 'v1');
  assert.equal(prerequisites.topicId, 'mt_FHIAv6dfhU');
  assert.equal(prerequisites.depth, 2);
  assert.ok(Array.isArray(prerequisites.prerequisites));
  assert.ok(prerequisites.prerequisites.length >= 5);

  const unlocks = graph.getUnlocks('mt_nZkL5-XjRX', {depth: 1});
  assert.equal(unlocks.taxonomyVersion, 'v1');
  assert.equal(unlocks.topicId, 'mt_nZkL5-XjRX');
  assert.equal(unlocks.depth, 1);
  assert.ok(Array.isArray(unlocks.unlocks));
});

test('builds strict curriculum rows and includes expected topic', () => {
  const graph = makeGraphStore(loadTaxonomyRelease());

  const response = graph.getCurriculumTopics({
    curriculum: 'ncert-class6-math-2026-27',
    board: 'CBSE',
    class: 6,
    subject: 'Mathematics',
    strand: 'Number System',
  });

  assert.equal(response.taxonomyVersion, 'v1');
  assert.equal(response.filter.mode, 'strictCurriculumView');
  assert.equal(response.topics.length, 18);
  assert.equal(response.topics[0].viewRole, 'aligned');
  assert.ok(response.topics.some((row) => row.topicId === 'mt_FHIAv6dfhU'));
});

test('learningGraphView includes aligned and prerequisite roles', () => {
  const graph = makeGraphStore(loadTaxonomyRelease());

  const response = graph.getCurriculumTopics({
    curriculum: 'ncert-class6-math-2026-27',
    board: 'CBSE',
    class: 6,
    subject: 'Mathematics',
    strand: 'Number System',
    mode: 'learningGraphView',
    prerequisiteDepth: 2,
  });

  const roles = new Set(response.topics.map((row) => row.viewRole));

  assert.equal(response.taxonomyVersion, 'v1');
  assert.equal(response.filter.mode, 'learningGraphView');
  assert.equal(response.filter.prerequisiteDepth, 2);
  assert.ok(roles.has('aligned'), 'learning graph should include aligned rows');
  assert.ok(roles.has('prerequisite'), 'learning graph should include prerequisite rows');
  assert.ok(response.topics.some((row) => row.topicId === 'mt_FHIAv6dfhU' && row.viewRole === 'aligned'));
  assert.ok(response.topics.some((row) => row.viewRole === 'prerequisite'));
  assert.ok(response.topics.length > 18);
});

test('getUnlocks is reverse of dependencies', () => {
  const release = loadTaxonomyRelease();
  const graph = makeGraphStore(release);
  const firstDependency = release.dependencies[0];
  assert.ok(firstDependency);
  const unlocks = graph.getUnlocks(firstDependency.prerequisiteId, {depth: 1});

  assert.ok(unlocks.unlocks.some((row) => row.topicId === firstDependency.topicId && row.distance === 1));
});

test('unknown topic id throws a stable typed error', () => {
  const graph = makeGraphStore(loadTaxonomyRelease());

  assert.throws(
    () => graph.getTopic('mt_missing'),
    /unknown_topic_id: mt_missing/,
  );
});

test('deriveMasteryState classifies secure and developing evidence and keeps latest observedAt', () => {
  const events = [
    {
      learnerId: 'learner_test',
      taxonomyVersion: 'v1',
      topicId: 'mt_FHIAv6dfhU',
      result: 'partial',
      score: 0.52,
      observedAt: '2026-07-01T09:00:00.000Z',
    },
    {
      learnerId: 'learner_test',
      taxonomyVersion: 'v1',
      topicId: 'mt_FHIAv6dfhU',
      result: 'secure',
      score: 0.91,
      observedAt: '2026-07-09T10:00:00.000Z',
    },
    {
      learnerId: 'learner_test',
      topicId: 'mt_y1XCVsIelg',
      result: 'partial',
      score: 0.6,
      observedAt: '2026-07-09T11:00:00.000Z',
    },
  ];

  const masteryByTopic = deriveMasteryState(events);

  const factors = masteryByTopic.get('mt_FHIAv6dfhU');
  const primes = masteryByTopic.get('mt_y1XCVsIelg');

  assert.equal(factors.status, 'secure');
  assert.equal(factors.lastEvidenceAt, '2026-07-09T10:00:00.000Z');
  assert.equal(factors.confidence, 0.91);
  assert.equal(factors.evidenceTrail.length, 2);
  assert.equal(primes.status, 'developing');
  assert.equal(primes.confidence, 0.6);
  assert.equal(primes.lastEvidenceAt, '2026-07-09T11:00:00.000Z');
});

test('checkReadiness blocks learning when hard prerequisites are unseen', () => {
  const graph = makeGraphStore(loadTaxonomyRelease());
  const masteryByTopic = deriveMasteryState([]);

  const readiness = checkReadiness(graph, masteryByTopic, 'mt_FHIAv6dfhU');

  assert.equal(readiness.readyToLearn, false);
  assert.equal(readiness.taxonomyVersion, 'v1');
  assert.equal(readiness.blockedBy.length, 2);
  assert.ok(readiness.blockedBy.every((row) => row.status === 'unseen'));
  assert.ok(readiness.blockedBy.every((row) => row.confidence === 0));
  const blockedTopicIds = readiness.blockedBy.map((row) => row.topicId).sort();
  assert.deepEqual(blockedTopicIds, ['mt_K5jM7vlVhA', 'mt_nZkL5-XjRX'].sort());
  assert.match(readiness.explanation, /hard prerequisite evidence is missing or weak/i);
});

test('findLearningGaps ranks weakest evidence first', () => {
  const graph = makeGraphStore(loadTaxonomyRelease());
  const masteryByTopic = deriveMasteryState([
    {
      learnerId: 'learner_test',
      topicId: 'mt_K5jM7vlVhA',
      result: 'partial',
      score: 0.5,
      observedAt: '2026-07-09T10:00:00.000Z',
    },
    {
      learnerId: 'learner_test',
      topicId: 'mt_nZkL5-XjRX',
      result: 'partial',
      score: 0.73,
      observedAt: '2026-07-09T10:00:00.000Z',
    },
  ]);

  const gaps = findLearningGaps(graph, masteryByTopic, 'mt_FHIAv6dfhU');

  assert.equal(gaps.taxonomyVersion, 'v1');
  assert.equal(gaps.topicId, 'mt_FHIAv6dfhU');
  assert.equal(gaps.gaps.length, 2);
  assert.deepEqual(gaps.gaps.map((row) => row.topicId), ['mt_K5jM7vlVhA', 'mt_nZkL5-XjRX']);
  assert.deepEqual(gaps.gaps.map((row) => row.rank), [1, 2]);
  assert.ok(gaps.gaps.every((row) => row.status === 'developing'));
  assert.ok(gaps.explanation.toLowerCase().includes('gap'));
});

test('validateContentMappings accepts synthetic mappings and rejects unknown topics', () => {
  const graph = makeGraphStore(loadTaxonomyRelease());
  const mappings = [
    {
      contentId: 'content-number-system-1',
      topicId: 'mt_FHIAv6dfhU',
      taxonomyVersion: 'v1',
      role: 'teaches',
      confidence: 'reviewed',
      estimatedMinutes: 12,
    },
    {
      contentId: 'content-number-system-2',
      topicId: 'mt_JwP9QFv6gQ',
      taxonomyVersion: 'v1',
      role: 'practices',
      confidence: 'verified',
      estimatedMinutes: 9,
    },
  ];

  assert.deepEqual(validateContentMappings(graph, mappings), mappings);

  assert.throws(
    () => validateContentMappings(graph, [
      {
        contentId: 'content-missing',
        topicId: 'mt_missing',
        taxonomyVersion: 'v1',
        role: 'teaches',
        confidence: 'reviewed',
        estimatedMinutes: 5,
      },
    ]),
    /unknown_topic_id: mt_missing/,
  );
});

test('recommendNextBestTopics returns a curriculum-linked recommendation with served content', () => {
  const graph = makeGraphStore(loadTaxonomyRelease());
  const masteryByTopic = deriveMasteryState([
    {
      learnerId: 'synthetic-learner',
      topicId: 'mt_K5jM7vlVhA',
      result: 'secure',
      score: 0.96,
      observedAt: '2026-07-09T10:00:00.000Z',
    },
    {
      learnerId: 'synthetic-learner',
      topicId: 'mt_nZkL5-XjRX',
      result: 'secure',
      score: 0.94,
      observedAt: '2026-07-09T10:05:00.000Z',
    },
  ]);

  const contentMappings = validateContentMappings(graph, [
    {
      contentId: 'content-number-system-factor-pairs',
      topicId: 'mt_FHIAv6dfhU',
      taxonomyVersion: 'v1',
      role: 'teaches',
      confidence: 'reviewed',
      estimatedMinutes: 14,
    },
    {
      contentId: 'content-number-system-factor-pairs-practice',
      topicId: 'mt_FHIAv6dfhU',
      taxonomyVersion: 'v1',
      role: 'practices',
      confidence: 'verified',
      estimatedMinutes: 10,
    },
  ]);

  const response = recommendNextBestTopics(graph, {
    learnerId: 'synthetic-learner',
    masteryByTopic,
    contentMappings,
    goal: {
      curriculum: 'ncert-class6-math-2026-27',
      board: 'CBSE',
      class: 6,
      subject: 'Mathematics',
      strand: 'Number System',
    },
    constraints: {
      includeReview: false,
      maxNewTopics: 1,
    },
  });

  assert.equal(response.taxonomyVersion, 'v1');
  assert.equal(response.learnerId, 'synthetic-learner');
  assert.ok(response.recommendations.length > 0);
  assert.equal(response.recommendations[0].rank, 1);
  assert.match(response.recommendations[0].reason, /curriculum/i);
  assert.ok(Object.hasOwn(response.recommendations[0], 'servableNow'));
  assert.equal(response.decisionLog.scoringVersion, 'easefactor-reference-v1');
});

test('recommendNextBestTopics marks missing reviewed content as unservable', () => {
  const graph = makeGraphStore(loadTaxonomyRelease());
  const masteryByTopic = deriveMasteryState([
    {
      learnerId: 'synthetic-learner',
      topicId: 'mt_K5jM7vlVhA',
      result: 'secure',
      score: 0.96,
      observedAt: '2026-07-09T10:00:00.000Z',
    },
    {
      learnerId: 'synthetic-learner',
      topicId: 'mt_nZkL5-XjRX',
      result: 'secure',
      score: 0.94,
      observedAt: '2026-07-09T10:05:00.000Z',
    },
  ]);

  const response = recommendNextBestTopics(graph, {
    learnerId: 'synthetic-learner',
    masteryByTopic,
    contentMappings: [],
    goal: {
      curriculum: 'ncert-class6-math-2026-27',
      board: 'CBSE',
      class: 6,
      subject: 'Mathematics',
      strand: 'Number System',
    },
    constraints: {
      includeReview: false,
      maxNewTopics: 1,
    },
  });

  assert.equal(response.recommendations.length, 1);
  assert.equal(response.recommendations[0].servableNow, false);
  assert.match(response.recommendations[0].reason, /no reviewed teaching content/i);
});

test('recommendNextBestTopics does not return non-recommendable rows when includeReview is false', () => {
  const graph = makeGraphStore(loadTaxonomyRelease());
  const response = recommendNextBestTopics(graph, {
    learnerId: 'synthetic-learner',
    masteryByTopic: deriveMasteryState([]),
    contentMappings: [],
    goal: {
      curriculum: 'ncert-class6-math-2026-27',
      board: 'CBSE',
      class: 6,
      subject: 'Mathematics',
      strand: 'Number System',
    },
    constraints: {
      includeReview: false,
      maxNewTopics: 5,
    },
  });

  assert.ok(
    response.recommendations.every((recommendation) => recommendation.recommendable === true && recommendation.readiness === true),
    'all returned recommendations must be ready and recommendable when review is excluded',
  );
});

test('recommendNextBestTopics keeps high-confidence developing topics when includeReview is false', () => {
  const graph = makeGraphStore(loadTaxonomyRelease());
  const masteryEvents = [
    {
      learnerId: 'synthetic-learner',
      topicId: 'mt_K5jM7vlVhA',
      result: 'secure',
      score: 0.96,
      observedAt: '2026-07-09T10:00:00.000Z',
    },
    {
      learnerId: 'synthetic-learner',
      topicId: 'mt_nZkL5-XjRX',
      result: 'secure',
      score: 0.94,
      observedAt: '2026-07-09T10:05:00.000Z',
    },
    {
      learnerId: 'synthetic-learner',
      topicId: 'mt_FHIAv6dfhU',
      result: 'partial',
      score: 0.81,
      observedAt: '2026-07-09T10:10:00.000Z',
    },
  ];
  const masteryByTopic = deriveMasteryState(masteryEvents);
  const targetCandidate = masteryByTopic.get('mt_FHIAv6dfhU');

  const response = recommendNextBestTopics(graph, {
    learnerId: 'synthetic-learner',
    masteryByTopic,
    contentMappings: validateContentMappings(graph, [
      {
        contentId: 'content-number-system-number-operations',
        topicId: 'mt_FHIAv6dfhU',
        taxonomyVersion: 'v1',
        role: 'teaches',
        confidence: 'reviewed',
        estimatedMinutes: 12,
      },
    ]),
    goal: {
      curriculum: 'ncert-class6-math-2026-27',
      board: 'CBSE',
      class: 6,
      subject: 'Mathematics',
      strand: 'Number System',
    },
    constraints: {
      includeReview: false,
      maxNewTopics: 5,
    },
  });

  assert.equal(targetCandidate.status, 'developing');
  assert.ok(targetCandidate.confidence >= 0.75);
  assert.equal(response.recommendations.length > 0, true);
  assert.ok(
    response.recommendations.some((recommendation) => recommendation.topicId === 'mt_FHIAv6dfhU'),
    'developing high-confidence Number System topic should remain a recommendation candidate',
  );
});

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
