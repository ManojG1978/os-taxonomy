import {createServer} from 'node:http';
import {fileURLToPath} from 'node:url';

import {buildParentCompanionJourney} from './easefactor/companion/parent-journey.mjs';
import {makeGraphStore} from './easefactor/graph/graph-store.mjs';
import {findLearningGaps} from './easefactor/learner/learning-gaps.mjs';
import {buildMasterySummary} from './easefactor/learner/mastery-summary.mjs';
import {deriveMasteryState} from './easefactor/learner/mastery.mjs';
import {checkReadiness} from './easefactor/learner/readiness.mjs';
import {buildDiagnosticPlan} from './easefactor/planner/diagnostic-plan.mjs';
import {recommendNextBestTopics} from './easefactor/planner/next-best-topics.mjs';
import {buildRemediationPlan} from './easefactor/planner/remediation-plan.mjs';
import {loadTaxonomyRelease} from './easefactor/release/load-release.mjs';
import {createRouter} from './easefactor/api/router.mjs';
import {createCompanionRoutes} from './easefactor/api/routes/companion-routes.mjs';
import {createLearnerRoutes} from './easefactor/api/routes/learner-routes.mjs';
import {createPlannerRoutes} from './easefactor/api/routes/planner-routes.mjs';
import {createTaxonomyRoutes} from './easefactor/api/routes/taxonomy-routes.mjs';
import {
  buildCoverage,
  filterAlignments,
  filterClusters,
  filterCurricula,
  filterStandards,
  filterTopics,
  releaseEnvelope,
} from './easefactor/api/taxonomy-presenter.mjs';

export const createEaseFactorApiServer = ({rootDir = process.cwd()} = {}) => {
  const release = loadTaxonomyRelease(rootDir);
  const graph = makeGraphStore(release);
  const presenter = {
    buildCoverage,
    filterAlignments,
    filterClusters,
    filterCurricula,
    filterStandards,
    filterTopics,
    releaseEnvelope,
  };
  const routes = [
    ...createTaxonomyRoutes({release, graph, presenter}),
    ...createLearnerRoutes({
      graph,
      deriveMasteryState,
      buildMasterySummary,
      checkReadiness,
      findLearningGaps,
    }),
    ...createPlannerRoutes({
      graph,
      deriveMasteryState,
      recommendNextBestTopics,
      buildRemediationPlan,
      buildDiagnosticPlan,
    }),
    ...createCompanionRoutes({
      graph,
      taxonomyVersion: release.taxonomyVersion,
      buildParentCompanionJourney,
    }),
  ];
  return createServer(createRouter({routes}));
};

if (process.argv[1] && process.argv[1] === fileURLToPath(import.meta.url)) {
  const portArgIndex = process.argv.indexOf('--port');
  const port = portArgIndex >= 0
    ? Number.parseInt(process.argv[portArgIndex + 1], 10)
    : Number.parseInt(process.env.PORT ?? '3080', 10);
  const host = process.env.HOST ?? '127.0.0.1';
  const server = createEaseFactorApiServer();

  server.listen(port, host, () => {
    const address = server.address();
    console.log(`EaseFactor reference API listening on http://${address.address}:${address.port}`);
  });
}
