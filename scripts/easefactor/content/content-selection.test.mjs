import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildContentIndex,
  buildContentSummary,
  estimateMinutes,
  isAssessableDiagnosticContent,
  isReviewedTeachingContent,
  isServableRemediationContent,
  safeNumber,
} from './content-selection.mjs';

const mappings = [
  {contentId: 'practice-reviewed', topicId: 'mt_a', role: 'practices', confidence: 'reviewed', estimatedMinutes: 12},
  {contentId: 'teach-machine', topicId: 'mt_a', role: 'teaches', confidence: 'machine', estimatedMinutes: 8},
  {contentId: 'teach-verified', topicId: 'mt_a', role: 'teaches', confidence: 'verified', estimatedMinutes: 10},
  {contentId: 'assessment-reviewed', topicId: 'mt_b', role: 'assesses', confidence: 'reviewed', estimatedMinutes: 6},
  {contentId: 'review-reviewed', topicId: 'mt_b', role: 'reviews', confidence: 'reviewed', estimatedMinutes: 14},
];

test('buildContentIndex groups mappings by topic without changing row order', () => {
  const contentByTopic = buildContentIndex(mappings);

  assert.deepEqual(contentByTopic.get('mt_a'), mappings.slice(0, 3));
  assert.deepEqual(contentByTopic.get('mt_b'), mappings.slice(3));
});

test('buildContentSummary applies planner ordering and strips topic metadata', () => {
  assert.deepEqual(buildContentSummary(mappings), [
    {contentId: 'teach-verified', role: 'teaches', confidence: 'verified', estimatedMinutes: 10},
    {contentId: 'teach-machine', role: 'teaches', confidence: 'machine', estimatedMinutes: 8},
    {contentId: 'practice-reviewed', role: 'practices', confidence: 'reviewed', estimatedMinutes: 12},
    {contentId: 'assessment-reviewed', role: 'assesses', confidence: 'reviewed', estimatedMinutes: 6},
    {contentId: 'review-reviewed', role: 'reviews', confidence: 'reviewed', estimatedMinutes: 14},
  ]);
});

test('content predicates preserve planner eligibility rules', () => {
  assert.equal(isReviewedTeachingContent(mappings[0]), true);
  assert.equal(isReviewedTeachingContent(mappings[1]), false);
  assert.equal(isServableRemediationContent(mappings[4]), true);
  assert.equal(isAssessableDiagnosticContent(mappings[3]), true);
  assert.equal(isAssessableDiagnosticContent({...mappings[3], confidence: 'machine'}), false);
});

test('safeNumber and estimateMinutes preserve planner fallback behavior', () => {
  assert.equal(safeNumber(Number.NaN, 7), 7);
  assert.equal(estimateMinutes([], {readyToLearn: true}), 18);
  assert.equal(estimateMinutes([{estimatedMinutes: null}], {readyToLearn: false}), 20);
  assert.equal(estimateMinutes([{estimatedMinutes: 3}, {estimatedMinutes: 8}], {readyToLearn: true}), 6);
});
