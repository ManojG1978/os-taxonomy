import test from 'node:test';
import assert from 'node:assert/strict';

import {createCompanionRoutes} from './companion-routes.mjs';
import {createLearnerRoutes} from './learner-routes.mjs';
import {createPlannerRoutes} from './planner-routes.mjs';
import {createTaxonomyRoutes} from './taxonomy-routes.mjs';

const findMatch = (routes, method, pathParts) => {
  for (const route of routes) {
    if (route.method !== method) continue;
    const params = route.match(pathParts);
    if (params !== false) return {route, params};
  }
  return undefined;
};

test('route factories construct from narrow dependencies and expose representative matches', () => {
  const taxonomy = createTaxonomyRoutes({release: {}, graph: {}, presenter: {}});
  const learner = createLearnerRoutes({
    graph: {},
    deriveMasteryState() {},
    buildMasterySummary() {},
    checkReadiness() {},
    findLearningGaps() {},
  });
  const planner = createPlannerRoutes({
    graph: {},
    deriveMasteryState() {},
    recommendNextBestTopics() {},
    buildRemediationPlan() {},
    buildDiagnosticPlan() {},
  });
  const companion = createCompanionRoutes({
    graph: {},
    taxonomyVersion: 'v1',
    buildParentCompanionJourney() {},
  });

  assert.deepEqual(
    findMatch(taxonomy, 'GET', ['taxonomy', 'v1', 'topics', 'mt_fraction']).params,
    {topicId: 'mt_fraction'},
  );
  assert.deepEqual(
    findMatch(learner, 'POST', ['learners', 'v1', 'readiness', 'mt_fraction']).params,
    {topicId: 'mt_fraction'},
  );
  assert.deepEqual(
    findMatch(planner, 'POST', ['planner', 'v1', 'diagnostic-plan']).params,
    {},
  );
  assert.deepEqual(
    findMatch(companion, 'POST', ['companion', 'v1', 'parent-journey']).params,
    {},
  );

  for (const routes of [taxonomy, learner, planner, companion]) {
    assert.ok(routes.every((route) => ['GET', 'POST'].includes(route.method)));
    assert.ok(routes.every((route) => typeof route.match === 'function'));
    assert.ok(routes.every((route) => typeof route.handle === 'function'));
  }
});
