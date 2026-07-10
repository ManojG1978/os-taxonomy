import test from 'node:test';
import assert from 'node:assert/strict';

import {loadTaxonomyRelease} from '../release/load-release.mjs';
import {makeGraphStore} from '../graph/graph-store.mjs';
import {buildMasterySummary} from './mastery-summary.mjs';

test('buildMasterySummary filters and sorts requested topics', () => {
  const graph = makeGraphStore(loadTaxonomyRelease());
  const summary = buildMasterySummary(graph, {
    learnerId: 'synthetic-learner',
    topicIds: ['mt_y1XCVsIelg', 'mt_FHIAv6dfhU', 'mt_y1XCVsIelg', '', null],
    masteryEvents: [
      {topicId: 'mt_y1XCVsIelg', result: 'review', observedAt: '2026-07-09T10:10:00.000Z'},
      {topicId: 'mt_nZkL5-XjRX', result: 'secure', score: 0.95, observedAt: '2026-07-09T10:05:00.000Z'},
      {topicId: 'mt_FHIAv6dfhU', result: 'partial', score: 0.52, observedAt: '2026-07-09T10:00:00.000Z'},
    ],
  });

  assert.equal(summary.learnerId, 'synthetic-learner');
  assert.deepEqual(summary.filter.topicIds, ['mt_FHIAv6dfhU', 'mt_y1XCVsIelg']);
  assert.deepEqual(summary.topics.map((row) => row.topicId), ['mt_FHIAv6dfhU', 'mt_y1XCVsIelg']);
  assert.deepEqual(summary.topics.map((row) => row.status), ['developing', 'needs_review']);
});

test('buildMasterySummary rejects unknown requested topics', () => {
  const graph = makeGraphStore(loadTaxonomyRelease());

  assert.throws(
    () => buildMasterySummary(graph, {topicIds: ['mt_missing']}),
    /unknown_topic_id: mt_missing/,
  );
});
