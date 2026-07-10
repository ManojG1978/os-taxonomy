import {deriveMasteryState} from './mastery.mjs';

const normalizeTopicIdFilter = (topicIds) => (
  Array.isArray(topicIds)
    ? [...new Set(topicIds.filter((topicId) => typeof topicId === 'string' && topicId.length > 0))].sort((a, b) => a.localeCompare(b))
    : []
);

const buildMasterySummary = (graph, request = {}) => {
  const filteredTopicIds = normalizeTopicIdFilter(request.topicIds);
  for (const topicId of filteredTopicIds) {
    graph.getTopic(topicId);
  }

  const masteryByTopic = deriveMasteryState(request.masteryEvents ?? []);
  const allowedTopicIds = filteredTopicIds.length > 0 ? new Set(filteredTopicIds) : null;
  const topics = Array.from(masteryByTopic.values())
    .filter((state) => allowedTopicIds === null || allowedTopicIds.has(state.topicId))
    .sort((a, b) => a.topicId.localeCompare(b.topicId));

  return {
    taxonomyVersion: graph.taxonomyVersion,
    learnerId: request.learnerId ?? null,
    filter: {
      topicIds: filteredTopicIds,
    },
    count: topics.length,
    topics,
    explanation: 'Mastery summary is derived from submitted synthetic evidence only.',
  };
};

export {buildMasterySummary};
