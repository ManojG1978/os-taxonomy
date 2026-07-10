import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync,} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';

import {
  buildParentCompanionJourney,
  buildRemediationPlan,
  checkReadiness,
  deriveMasteryState,
  findLearningGaps,
  loadTaxonomyRelease,
  makeGraphStore,
  recommendNextBestTopics,
  validateContentMappings,
  validateReviewedHouseholdActivity,
} from './easefactor-reference.mjs';
import {makeParentJourneyRequest} from './easefactor-parent-journey-fixture.test-helper.mjs';

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

test('buildRemediationPlan converts blocked hard prerequisites into ordered repair steps', () => {
    const graph = makeGraphStore(loadTaxonomyRelease());
    const masteryByTopic = deriveMasteryState([
        {
            learnerId: 'learner_test',
            topicId: 'mt_K5jM7vlVhA',
            result: 'partial',
            score: 0.5,
            observedAt: '2026-07-09T10:00:00.000Z',
        },
    ]);

    const plan = buildRemediationPlan(graph, {
        learnerId: 'learner_test',
        targetTopicId: 'mt_FHIAv6dfhU',
        masteryByTopic,
        contentMappings: [
            {
                contentId: 'content-factor-pairs-practice',
                topicId: 'mt_nZkL5-XjRX',
                taxonomyVersion: 'v1',
                role: 'practices',
                confidence: 'reviewed',
                estimatedMinutes: 12,
            },
        ],
    });

    assert.equal(plan.taxonomyVersion, 'v1');
    assert.equal(plan.learnerId, 'learner_test');
    assert.equal(plan.targetTopicId, 'mt_FHIAv6dfhU');
    assert.equal(plan.readyToLearnTarget, false);
    assert.deepEqual(plan.steps.map((step) => step.topicId), ['mt_nZkL5-XjRX', 'mt_K5jM7vlVhA']);
    assert.equal(plan.steps[0].servableNow, true);
    assert.equal(plan.steps[1].servableNow, false);
    assert.match(plan.steps[0].explanation, /missing prerequisite evidence/i);
    assert.match(plan.steps[1].explanation, /weak prerequisite evidence/i);
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

test('buildParentCompanionJourney returns the complete reviewed fractions journey', () => {
  const graph = makeGraphStore(loadTaxonomyRelease());
  const journey = buildParentCompanionJourney(graph, makeParentJourneyRequest());
  assert.equal(journey.taxonomyVersion, 'v1');
  assert.equal(journey.journeyVersion, 'parent-fractions-v1');
  assert.equal(journey.intake.concern, 'My child finds it hard to tell which fraction is bigger.');
  assert.deepEqual(journey.diagnostic.prompts.map((row) => row.topicId), ['mt_vKcxX6iNOA', 'mt_Kr3IyA6m-O', 'mt_IfEgu0X449']);
  assert.equal(journey.foundationalGap.status, 'identified');
  assert.equal(journey.foundationalGap.topicId, 'mt_Kr3IyA6m-O');
  assert.match(journey.explanation, /number line/i);
  assert.deepEqual(journey.remediationSteps.map((row) => row.actionId), ['locate-benchmark-fractions', 'place-fractions-zero-to-one', 'compare-number-line-positions']);
  assert.equal(journey.activity.activityId, 'household-fraction-strip-number-line-v1');
  assert.equal(journey.activity.review.status, 'reviewed');
  assert.equal(journey.recheck.status, 'improved');
  assert.equal(journey.parentOutcome.status, 'passed');
  assert.equal(journey.parentOutcome.understoodGap, true);
  assert.equal(journey.parentOutcome.identifiedFirstAction, true);
});

test('parent journey returns not enough information without number-line evidence', () => {
  const graph = makeGraphStore(loadTaxonomyRelease());
  const journey = buildParentCompanionJourney(graph, makeParentJourneyRequest({diagnosticEvents: [], recheckEvents: []}));
  assert.equal(journey.foundationalGap.status, 'not-enough-information');
  assert.equal(journey.activity, null);
  assert.deepEqual(journey.remediationSteps, []);
  assert.equal(journey.recheck.status, 'not-submitted');
  assert.equal(journey.parentOutcome.status, 'not-measured');
  assert.equal(journey.parentOutcome.understoodGap, null);
  assert.equal(journey.parentOutcome.identifiedFirstAction, null);
});

test('parent journey is deterministic and keeps diagnostic and recheck evidence separate', () => {
  const graph = makeGraphStore(loadTaxonomyRelease());
  const request = makeParentJourneyRequest();
  const first = buildParentCompanionJourney(graph, request);
  assert.deepEqual(first, buildParentCompanionJourney(graph, structuredClone(request)));
  assert.equal(first.foundationalGap.evidenceStatus, 'developing');
  assert.equal(first.recheck.evidenceStatus, 'secure');
});

test('reviewed household activity normalizes draft, unknown-topic, and invalid-mapping failures', () => {
  const graph = makeGraphStore(loadTaxonomyRelease());
  const valid = buildParentCompanionJourney(graph, makeParentJourneyRequest()).activity;
  const expectInvalid = (activity) => assert.throws(
    () => validateReviewedHouseholdActivity(graph, activity),
    (error) => error.code === 'invalid_reviewed_activity',
  );

  expectInvalid({...valid, title: ''});
  expectInvalid({...valid, selectionReason: undefined});
  expectInvalid({...valid, selectionReason: ''});
  expectInvalid({...valid, version: 0});
  expectInvalid({...valid, review: {status: 'reviewed', scope: ''}});
  expectInvalid({...valid, materials: []});
  expectInvalid({...valid, estimatedMinutes: Number.POSITIVE_INFINITY});
  expectInvalid({...valid, topicIds: ['mt_Kr3IyA6m-O']});
  expectInvalid({...valid, topicIds: ['mt_Kr3IyA6m-O', 'mt_Kr3IyA6m-O']});
  expectInvalid({...valid, topicIds: ['mt_Kr3IyA6m-O', 'mt_missing']});
  expectInvalid({...valid, contentMappings: []});
  expectInvalid({...valid, contentMappings: valid.contentMappings.slice(0, 1)});
  expectInvalid({...valid, contentMappings: valid.contentMappings.map((mapping) => ({...mapping, contentId: 'wrong-activity'}))});
  expectInvalid({...valid, contentMappings: valid.contentMappings.map((mapping) => ({...mapping, confidence: 'machine'}))});
  expectInvalid({...valid, contentMappings: valid.contentMappings.map((mapping) => ({...mapping, role: 'unknown'}))});
});

test('parent outcome requires both comprehension and action answers', () => {
  const graph = makeGraphStore(loadTaxonomyRelease());
  const unmeasured = buildParentCompanionJourney(graph, makeParentJourneyRequest({parentOutcomeResponses: undefined}));
  const partial = buildParentCompanionJourney(graph, makeParentJourneyRequest({parentOutcomeResponses: {foundationalGapTopicId: 'mt_Kr3IyA6m-O', firstActionId: 'wrong'}}));
  assert.equal(unmeasured.parentOutcome.status, 'not-measured');
  assert.equal(partial.parentOutcome.status, 'not-passed');
  assert.equal(partial.parentOutcome.understoodGap, true);
  assert.equal(partial.parentOutcome.identifiedFirstAction, false);
});

test('parent journey requires fixed context, synthetic mode, request-only consent, and no private fields', () => {
  const graph = makeGraphStore(loadTaxonomyRelease());
  assert.throws(() => buildParentCompanionJourney(graph, makeParentJourneyRequest({evidenceMode: 'production'})), (error) => error.code === 'synthetic_evidence_required');
  assert.throws(() => buildParentCompanionJourney(graph, makeParentJourneyRequest({consent: {...makeParentJourneyRequest().consent, scope: 'persistent'}})), (error) => error.code === 'invalid_consent_boundary');
  assert.throws(() => buildParentCompanionJourney(graph, makeParentJourneyRequest({context: {...makeParentJourneyRequest().context, language: 'hi-IN'}})), (error) => error.code === 'unsupported_parent_journey_context');
  assert.throws(() => buildParentCompanionJourney(graph, makeParentJourneyRequest({learnerId: 'child-123'})), (error) => error.code === 'private_data_not_allowed');
  for (const field of ['studentId', 'userId', 'guardianId', 'save', 'retain']) {
    assert.throws(() => buildParentCompanionJourney(graph, makeParentJourneyRequest({[field]: 'not-allowed'})), (error) => error.code === 'private_data_not_allowed');
  }
  assert.throws(() => buildParentCompanionJourney(graph, makeParentJourneyRequest({diagnosticEvents: [{topicId: 'mt_cFltwUQi-d', result: 'partial'}]})), (error) => error.code === 'invalid_parent_journey_evidence');
});

test('parent journey types missing and invalid context and consent before field allowlisting', () => {
  const graph = makeGraphStore(loadTaxonomyRelease());
  for (const context of [undefined, null, 'CBSE']) {
    assert.throws(
      () => buildParentCompanionJourney(graph, makeParentJourneyRequest({context})),
      (error) => error.code === 'unsupported_parent_journey_context',
    );
  }
  for (const consent of [undefined, null, 'request-only']) {
    assert.throws(
      () => buildParentCompanionJourney(graph, makeParentJourneyRequest({consent})),
      (error) => error.code === 'invalid_consent_boundary',
    );
  }
  assert.throws(
    () => buildParentCompanionJourney(graph, makeParentJourneyRequest({context: {...makeParentJourneyRequest().context, childName: 'private'}})),
    (error) => error.code === 'private_data_not_allowed',
  );
  assert.throws(
    () => buildParentCompanionJourney(graph, makeParentJourneyRequest({consent: {...makeParentJourneyRequest().consent, retain: true}})),
    (error) => error.code === 'private_data_not_allowed',
  );
});

test('parent journey rejects malformed evidence with one normalized error', () => {
  const graph = makeGraphStore(loadTaxonomyRelease());
  const baseEvent = makeParentJourneyRequest().diagnosticEvents[0];
  const invalidEvents = [
    {...baseEvent, result: undefined},
    {...baseEvent, result: 'mastered'},
    {...baseEvent, score: undefined},
    {...baseEvent, score: Number.NaN},
    {...baseEvent, score: -0.01},
    {...baseEvent, score: 1.01},
    {...baseEvent, observedAt: undefined},
    {...baseEvent, observedAt: 'not-a-timestamp'},
    {...baseEvent, observedAt: '2026-07-10T09:00:00.000'},
    {...baseEvent, observedAt: '2026-02-30T09:00:00.000Z'},
    {...baseEvent, taxonomyVersion: 'v2'},
    {...baseEvent, topicId: 'mt_missing'},
  ];
  for (const event of invalidEvents) {
    assert.throws(
      () => buildParentCompanionJourney(graph, makeParentJourneyRequest({diagnosticEvents: [event]})),
      (error) => error.code === 'invalid_parent_journey_evidence',
    );
  }
});

test('parent journey ordering and output are identical across process timezones', () => {
  const referenceUrl = new URL('./easefactor-reference.mjs', import.meta.url).href;
  const fixtureUrl = new URL('./easefactor-parent-journey-fixture.test-helper.mjs', import.meta.url).href;
  const script = `
    import {buildParentCompanionJourney, deriveMasteryState, loadTaxonomyRelease, makeGraphStore} from ${JSON.stringify(referenceUrl)};
    import {makeParentJourneyRequest} from ${JSON.stringify(fixtureUrl)};
    const diagnosticEvents = [
      {topicId: 'mt_vKcxX6iNOA', result: 'secure', score: 0.92, observedAt: '2026-07-10T09:00:00.000Z'},
      {topicId: 'mt_Kr3IyA6m-O', result: 'partial', score: 0.42, observedAt: '2026-07-10T09:15:00.000+05:30'},
      {topicId: 'mt_Kr3IyA6m-O', result: 'secure', score: 0.86, observedAt: '2026-07-10T04:00:00.000Z'},
    ];
    const graph = makeGraphStore(loadTaxonomyRelease());
    const journey = buildParentCompanionJourney(graph, makeParentJourneyRequest({diagnosticEvents}));
    const evidenceOrder = deriveMasteryState(diagnosticEvents).get('mt_Kr3IyA6m-O').evidenceTrail.map((event) => event.observedAt);
    process.stdout.write(JSON.stringify({journey, evidenceOrder}));
  `;
  const runInTimezone = (TZ) => JSON.parse(execFileSync(
    process.execPath,
    ['--input-type=module', '--eval', script],
    {cwd: process.cwd(), encoding: 'utf8', env: {...process.env, TZ}},
  ));

  const utc = runInTimezone('UTC');
  const kolkata = runInTimezone('Asia/Kolkata');
  assert.deepEqual(utc, kolkata);
  assert.deepEqual(utc.evidenceOrder, ['2026-07-10T09:15:00.000+05:30', '2026-07-10T04:00:00.000Z']);
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
