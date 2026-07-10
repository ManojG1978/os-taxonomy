import test from 'node:test';
import assert from 'node:assert/strict';

import {deriveMasteryState, loadTaxonomyRelease, makeGraphStore} from '../../easefactor-reference.mjs';
import {validateContentMappings} from '../content/content-mappings.mjs';
import {buildDiagnosticPlan} from './diagnostic-plan.mjs';
import {recommendNextBestTopics} from './next-best-topics.mjs';
import {buildRemediationPlan} from './remediation-plan.mjs';

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
