import {checkReadiness} from './readiness.mjs';

const findLearningGaps = (graph, masteryByTopic, topicId) => {
  const readiness = checkReadiness(graph, masteryByTopic, topicId);
  const sortedGaps = [...readiness.blockedBy].sort((a, b) => {
    if (a.confidence !== b.confidence) {
      return a.confidence - b.confidence;
    }
    return a.topicId.localeCompare(b.topicId);
  });

  const gaps = sortedGaps.map((gap, idx) => ({
    rank: idx + 1,
    topicId: gap.topicId,
    status: gap.status,
    confidence: gap.confidence,
    whyItMatters: gap.reason,
  }));

  return {
    taxonomyVersion: graph.taxonomyVersion,
    topicId,
    gaps,
    explanation: `Learning gaps for ${topicId} are ranked by weakest evidence first.`,
  };
};

export {findLearningGaps};
