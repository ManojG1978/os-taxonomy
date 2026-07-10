import {isSecureEnough} from './mastery.mjs';

const getMasteryState = (masteryByTopic, topicId) => {
  if (!masteryByTopic || typeof masteryByTopic.get !== 'function') {
    return null;
  }
  return masteryByTopic.get(topicId) ?? null;
};

const checkReadiness = (graph, masteryByTopic, topicId) => {
  const prerequisites = graph.getPrerequisites(topicId, {depth: 1}).prerequisites.filter((row) => row.strength === 'hard');
  const blockedBy = [];
  const prerequisiteStatus = {
    secure: 0,
    developing: 0,
    needs_review: 0,
    blocked: 0,
    unseen: 0,
  };

  for (const prerequisite of prerequisites) {
    const masteryState = getMasteryState(masteryByTopic, prerequisite.topicId);
    if (!masteryState) {
      prerequisiteStatus.unseen += 1;
      blockedBy.push({
        topicId: prerequisite.topicId,
        status: 'unseen',
        confidence: 0,
        reason: prerequisite.reason ?? `Unknown evidence for prerequisite topic ${prerequisite.topicId}.`,
        strength: 'hard',
        distance: prerequisite.distance,
      });
      continue;
    }

    prerequisiteStatus[masteryState.status] = (prerequisiteStatus[masteryState.status] ?? 0) + 1;
    if (!isSecureEnough(masteryState)) {
      blockedBy.push({
        topicId: prerequisite.topicId,
        status: masteryState.status,
        confidence: masteryState.confidence,
        reason: prerequisite.reason ?? `Weak mastery evidence for prerequisite topic ${prerequisite.topicId}.`,
        strength: 'hard',
        distance: prerequisite.distance,
      });
    }
  }

  const readyToLearn = blockedBy.length === 0;
  const developStatus = getMasteryState(masteryByTopic, topicId)?.status === 'developing';
  const explanation = readyToLearn
    ? 'Hard prerequisite evidence is sufficient to proceed.'
    : 'Hard prerequisite evidence is missing or weak.';

  return {
    taxonomyVersion: graph.taxonomyVersion,
    topicId,
    readyToLearn,
    prerequisiteStatus,
    blockedBy,
    developing: developStatus,
    explanation,
  };
};

export {checkReadiness};
