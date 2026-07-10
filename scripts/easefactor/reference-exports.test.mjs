import test from 'node:test';
import assert from 'node:assert/strict';

import * as reference from '../easefactor-reference.mjs';
import {buildParentCompanionJourney} from './companion/parent-journey.mjs';
import {getReviewedParentJourneyContent, validateReviewedHouseholdActivity} from './companion/parent-journey-content.mjs';
import {getParentConcern, getParentJourneyContext, validateParentJourneyBoundary} from './companion/parent-journey-contract.mjs';
import {validateContentMappings} from './content/content-mappings.mjs';
import {makeGraphStore} from './graph/graph-store.mjs';
import {findLearningGaps} from './learner/learning-gaps.mjs';
import {deriveMasteryState} from './learner/mastery.mjs';
import {checkReadiness} from './learner/readiness.mjs';
import {buildDiagnosticPlan} from './planner/diagnostic-plan.mjs';
import {recommendNextBestTopics} from './planner/next-best-topics.mjs';
import {buildRemediationPlan} from './planner/remediation-plan.mjs';
import {loadTaxonomyRelease} from './release/load-release.mjs';

test('reference composition exports are the extracted domain and planner functions', () => {
  const expected = {
    buildDiagnosticPlan,
    buildParentCompanionJourney,
    buildRemediationPlan,
    checkReadiness,
    deriveMasteryState,
    findLearningGaps,
    getParentConcern,
    getParentJourneyContext,
    getReviewedParentJourneyContent,
    loadTaxonomyRelease,
    makeGraphStore,
    recommendNextBestTopics,
    validateContentMappings,
    validateParentJourneyBoundary,
    validateReviewedHouseholdActivity,
  };

  for (const [name, implementation] of Object.entries(expected)) {
    assert.equal(reference[name], implementation, name);
  }
});
