import {sendMappedError} from '../errors.mjs';
import {sendJson} from '../http-response.mjs';
import {readJsonRequest} from '../request-body.mjs';

const exact = (...expected) => (pathParts) => pathParts.length === expected.length
  && pathParts.every((part, index) => part === expected[index])
  ? {}
  : false;

export const createPlannerRoutes = ({
  graph,
  deriveMasteryState,
  recommendNextBestTopics,
  buildRemediationPlan,
  buildDiagnosticPlan,
}) => [
  ['next-best-topics', recommendNextBestTopics],
  ['remediation-plan', buildRemediationPlan],
  ['diagnostic-plan', buildDiagnosticPlan],
].map(([endpoint, operation]) => ({
  method: 'POST',
  match: exact('planner', 'v1', endpoint),
  handle: async ({req, res}) => {
    const request = await readJsonRequest(req, res);
    if (request === null) return;
    try {
      const masteryByTopic = deriveMasteryState(request.masteryEvents ?? []);
      sendJson(res, 200, operation(graph, {...request, masteryByTopic}));
    } catch (error) {
      sendMappedError(res, error, {
        fallbackCode: 'invalid_planner_request',
        taxonomyVersion: graph.taxonomyVersion,
      });
    }
  },
}));
