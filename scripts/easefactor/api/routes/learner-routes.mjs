import {sendMappedError} from '../errors.mjs';
import {sendJson} from '../http-response.mjs';
import {readJsonRequest} from '../request-body.mjs';

const exact = (...expected) => (pathParts) => pathParts.length === expected.length
  && pathParts.every((part, index) => part === expected[index])
  ? {}
  : false;

const learnerTopic = (endpoint) => (pathParts) => pathParts.length === 4
  && pathParts[0] === 'learners'
  && pathParts[1] === 'v1'
  && pathParts[2] === endpoint
  ? {topicId: pathParts[3]}
  : false;

export const createLearnerRoutes = ({
  graph,
  deriveMasteryState,
  buildMasterySummary,
  checkReadiness,
  findLearningGaps,
}) => [
  {
    method: 'POST',
    match: exact('learners', 'v1', 'mastery-summary'),
    handle: async ({req, res}) => {
      const request = await readJsonRequest(req, res);
      if (request === null) return;
      try {
        sendJson(res, 200, buildMasterySummary(graph, request));
      } catch (error) {
        sendMappedError(res, error, {
          fallbackCode: 'invalid_learner_request',
          taxonomyVersion: graph.taxonomyVersion,
        });
      }
    },
  },
  ...[
    ['readiness', checkReadiness],
    ['learning-gaps', findLearningGaps],
  ].map(([endpoint, operation]) => ({
    method: 'POST',
    match: learnerTopic(endpoint),
    handle: async ({req, res, params}) => {
      const request = await readJsonRequest(req, res);
      if (request === null) return;
      try {
        const masteryByTopic = deriveMasteryState(request.masteryEvents ?? []);
        sendJson(res, 200, {
          learnerId: request.learnerId ?? null,
          ...operation(graph, masteryByTopic, params.topicId),
        });
      } catch (error) {
        sendMappedError(res, error, {
          fallbackCode: 'invalid_learner_request',
          taxonomyVersion: graph.taxonomyVersion,
        });
      }
    },
  })),
];
