import test from 'node:test';
import assert from 'node:assert/strict';

import {loadTaxonomyRelease} from '../release/load-release.mjs';
import {makeGraphStore} from '../graph/graph-store.mjs';
import {deriveMasteryState} from './mastery.mjs';
import {checkReadiness} from './readiness.mjs';
import {findLearningGaps} from './learning-gaps.mjs';

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
