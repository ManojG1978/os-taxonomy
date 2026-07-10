import {sendMappedError} from '../errors.mjs';
import {sendJson} from '../http-response.mjs';
import {readJsonRequest} from '../request-body.mjs';

export const createCompanionRoutes = ({graph, taxonomyVersion, buildParentCompanionJourney}) => [{
  method: 'POST',
  match: (pathParts) => pathParts.length === 3
    && pathParts[0] === 'companion'
    && pathParts[1] === 'v1'
    && pathParts[2] === 'parent-journey'
    ? {}
    : false,
  handle: async ({req, res}) => {
    const request = await readJsonRequest(req, res);
    if (request === null) return;
    try {
      sendJson(res, 200, buildParentCompanionJourney(graph, request));
    } catch (error) {
      sendMappedError(res, error, {
        fallbackCode: 'invalid_parent_journey_request',
        taxonomyVersion,
      });
    }
  },
}];
