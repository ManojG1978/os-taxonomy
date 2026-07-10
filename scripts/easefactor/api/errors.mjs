import {sendError} from './http-response.mjs';

const parentJourneyErrorStatus = {
  unsupported_parent_journey_context: 400,
  invalid_consent_boundary: 400,
  synthetic_evidence_required: 400,
  private_data_not_allowed: 400,
  invalid_parent_journey_evidence: 400,
  invalid_reviewed_activity: 500,
};

export const sendMappedError = (res, error, {fallbackCode, taxonomyVersion} = {}) => {
  const message = String(error?.message ?? '');
  const unknownTopic = message.match(/^unknown_topic_id: (.+)$/);
  if (unknownTopic) {
    sendError(res, 404, 'unknown_topic_id', `Unknown topic id: ${unknownTopic[1]}`, {topicId: unknownTopic[1]});
    return true;
  }

  const statusCode = parentJourneyErrorStatus[error?.code];
  if (statusCode) {
    sendError(res, statusCode, error.code, error.message, {taxonomyVersion});
    return true;
  }

  if (fallbackCode) {
    sendError(res, 400, fallbackCode, error.message, {taxonomyVersion});
    return true;
  }

  return false;
};
