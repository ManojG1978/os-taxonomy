import {fileURLToPath} from 'node:url';
import {loadTaxonomyRelease} from './easefactor/release/load-release.mjs';
import {makeGraphStore} from './easefactor/graph/graph-store.mjs';
import {deriveMasteryState} from './easefactor/learner/mastery.mjs';
import {checkReadiness} from './easefactor/learner/readiness.mjs';
import {findLearningGaps} from './easefactor/learner/learning-gaps.mjs';
import {validateContentMappings} from './easefactor/content/content-mappings.mjs';
import {buildDiagnosticPlan} from './easefactor/planner/diagnostic-plan.mjs';
import {recommendNextBestTopics} from './easefactor/planner/next-best-topics.mjs';
import {buildRemediationPlan} from './easefactor/planner/remediation-plan.mjs';

export {
  checkReadiness,
  deriveMasteryState,
  findLearningGaps,
  loadTaxonomyRelease,
  makeGraphStore,
  validateContentMappings,
};

export {buildDiagnosticPlan, buildRemediationPlan, recommendNextBestTopics};
export {getParentConcern, getParentJourneyContext, validateParentJourneyBoundary} from './easefactor/companion/parent-journey-contract.mjs';
export {getReviewedParentJourneyContent, validateReviewedHouseholdActivity} from './easefactor/companion/parent-journey-content.mjs';
export {buildParentCompanionJourney} from './easefactor/companion/parent-journey.mjs';

if (process.argv[1] && process.argv[1] === fileURLToPath(import.meta.url)) {
  const release = loadTaxonomyRelease(process.cwd());
  const graph = makeGraphStore(release);
  const goal = {
    curriculum: 'ncert-class6-math-2026-27',
    board: 'CBSE',
    class: 6,
    subject: 'Mathematics',
    strand: 'Number System',
  };
  const args = process.argv.slice(2);
  const isDemo = args.includes('--demo');

  if (isDemo) {
    const masteryByTopic = deriveMasteryState([
      {
        learnerId: 'synthetic-learner',
        topicId: 'mt_nZkL5-XjRX',
        taxonomyVersion: release.taxonomyVersion,
        result: 'secure',
        score: 0.9,
        observedAt: '2026-07-09T10:00:00.000Z',
      },
    ]);

    const response = recommendNextBestTopics(graph, {
      learnerId: 'synthetic-learner',
      goal,
      masteryByTopic,
      contentMappings: [
        {
          contentId: 'content-number-system-review',
          topicId: 'mt_FHIAv6dfhU',
          taxonomyVersion: release.taxonomyVersion,
          role: 'teaches',
          confidence: 'reviewed',
          estimatedMinutes: 14,
        },
      ],
      constraints: {
        includeReview: true,
        maxNewTopics: 3,
      },
    });

    console.log(JSON.stringify({
      taxonomyVersion: response.taxonomyVersion,
      goal,
      recommendations: response.recommendations,
      decisionLog: response.decisionLog,
    }, null, 2));
  } else {
    const view = graph.getCurriculumTopics({
      ...goal,
      mode: 'learningGraphView',
      prerequisiteDepth: 2,
    });
    console.log('learningGraphView summary:', {
      taxonomyVersion: view.taxonomyVersion,
      rowCount: view.topics.length,
      roleCounts: view.topics.reduce((counts, row) => {
        counts[row.viewRole] = (counts[row.viewRole] ?? 0) + 1;
        return counts;
      }, {}),
    });
  }
}
