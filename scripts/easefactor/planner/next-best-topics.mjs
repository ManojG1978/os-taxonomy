import {validateContentMappings} from '../content/content-mappings.mjs';
import {
  buildContentIndex,
  buildContentSummary,
  estimateMinutes,
  isReviewedTeachingContent,
  safeNumber,
} from '../content/content-selection.mjs';
import {checkReadiness} from '../learner/readiness.mjs';

const getMasteryState = (masteryByTopic, topicId) => {
  if (!masteryByTopic || typeof masteryByTopic.get !== 'function') {
    return null;
  }
  return masteryByTopic.get(topicId) ?? null;
};

const buildReason = ({goal, readiness, directUnlocks, twoHopUnlocks, reviewedContentCount, includeReview}) => {
  const parts = [];
  const curriculumLabel = goal.curriculum ? `Curriculum-aligned to ${goal.curriculum}.` : 'Curriculum-aligned recommendation for the requested slice.';
  parts.push(curriculumLabel);

  if (readiness.readyToLearn) {
    parts.push('Readiness is sufficient.');
  } else {
    parts.push(`Blocked by ${readiness.blockedBy.length} prerequisite${readiness.blockedBy.length === 1 ? '' : 's'}.`);
  }

  parts.push(`Unlock value: ${directUnlocks} direct and ${twoHopUnlocks} two-hop unlocks.`);

  if (reviewedContentCount > 0) {
    parts.push('Reviewed teaching content is available.');
  } else if (includeReview) {
    parts.push('No reviewed teaching content is available, so this is a review-only recommendation.');
  } else {
    parts.push('No reviewed teaching content is available.');
  }

  return parts.join(' ');
};

export const recommendNextBestTopics = (graph, request = {}) => {
  const goal = request.goal ?? {};
  const constraints = request.constraints ?? {};
  const includeReview = Boolean(constraints.includeReview);
  const masteryByTopic = request.masteryByTopic ?? new Map();
  const validatedContentMappings = validateContentMappings(graph, request.contentMappings ?? []);
  const contentByTopic = buildContentIndex(validatedContentMappings);
  const curriculumView = graph.getCurriculumTopics({
    ...goal,
    mode: 'strictCurriculumView',
  });

  const dedupedCandidates = [];
  const seenTopicIds = new Set();
  for (const row of curriculumView.topics) {
    if (!row?.topicId || seenTopicIds.has(row.topicId)) {
      continue;
    }
    seenTopicIds.add(row.topicId);
    dedupedCandidates.push(row);
  }

  const scoredCandidates = [];
  for (const candidate of dedupedCandidates) {
    const masteryState = getMasteryState(masteryByTopic, candidate.topicId);
    if (!includeReview && masteryState?.status === 'secure') {
      continue;
    }

    const readiness = checkReadiness(graph, masteryByTopic, candidate.topicId);
    const unlocks1 = graph.getUnlocks(candidate.topicId, {depth: 1}).unlocks;
    const unlocks2 = graph.getUnlocks(candidate.topicId, {depth: 2}).unlocks;
    const directUnlocks = unlocks1.length;
    const twoHopUnlocks = unlocks2.filter((row) => row.distance === 2).length;
    const contentRows = contentByTopic.get(candidate.topicId) || [];
    const reviewableContent = contentRows.filter(isReviewedTeachingContent);
    const contentAvailability = reviewableContent.length > 0
      ? 20 + (reviewableContent.length * 4)
      : contentRows.length > 0
        ? 6
        : 0;
    const curriculumFit = 25;
    const unlockValue = (directUnlocks * 5) + (twoHopUnlocks * 2);
    const evidenceNeed = readiness.readyToLearn ? 0 : Math.min(16, 8 + (readiness.blockedBy.length * 2));
    const goalClass = safeNumber(goal.class, null);
    const candidateClass = safeNumber(candidate.alignment?.class ?? candidate.topic?.class, null);
    const ageFit = goalClass !== null && candidateClass !== null
      ? Math.max(0, 10 - (Math.abs(goalClass - candidateClass) * 2))
      : 0;
    const teacherPriority = safeNumber(constraints.teacherPriority, 0);
    const blockerPenalty = readiness.blockedBy.length * 6;
    const readinessScore = readiness.readyToLearn ? 45 : Math.max(4, 18 - (readiness.blockedBy.length * 4));
    const score = readinessScore + curriculumFit + unlockValue + evidenceNeed + contentAvailability + ageFit + teacherPriority - blockerPenalty;

    const servedContent = buildContentSummary(contentRows);
    const estimatedMinutes = estimateMinutes(servedContent, readiness);
    const recommendable = readiness.readyToLearn || includeReview;
    const servableNow = recommendable && reviewableContent.length > 0;
    const reason = buildReason({
      goal,
      readiness,
      directUnlocks,
      twoHopUnlocks,
      reviewedContentCount: reviewableContent.length,
      includeReview,
    });

    scoredCandidates.push({
      topicId: candidate.topicId,
      candidate,
      score,
      readiness,
      estimatedMinutes,
      prerequisiteStatus: readiness.prerequisiteStatus,
      unlockValue: {
        directUnlocks,
        twoHopUnlocks,
      },
      recommendable,
      servableNow,
      reason,
      content: servedContent,
      scoring: {
        readinessScore,
        curriculumFit,
        unlockValue,
        evidenceNeed,
        contentAvailability,
        ageFit,
        teacherPriority,
        blockerPenalty,
      },
    });
  }

  scoredCandidates.sort((a, b) => {
    if (b.score !== a.score) {
      return b.score - a.score;
    }
    return a.topicId.localeCompare(b.topicId);
  });

  const maxNewTopics = Number.isInteger(request.constraints?.maxNewTopics)
    ? request.constraints.maxNewTopics
    : 3;
  const eligibleCandidates = includeReview
    ? scoredCandidates
    : scoredCandidates.filter((row) => row.recommendable);
  const selectedCandidates = eligibleCandidates.slice(0, Math.max(0, maxNewTopics));

  const recommendations = selectedCandidates.map((row, index) => ({
    topicId: row.topicId,
    rank: index + 1,
    score: row.score,
    readiness: row.readiness.readyToLearn,
    estimatedMinutes: row.estimatedMinutes,
    prerequisiteStatus: row.prerequisiteStatus,
    unlockValue: row.unlockValue,
    recommendable: row.recommendable,
    servableNow: row.servableNow,
    reason: row.reason,
    content: row.content,
  }));

  return {
    taxonomyVersion: graph.taxonomyVersion,
    learnerId: request.learnerId ?? null,
    recommendations,
    decisionLog: {
      candidateTopics: scoredCandidates.map((row) => ({
        topicId: row.topicId,
        score: row.score,
        readiness: row.readiness.readyToLearn,
        recommendable: row.recommendable,
        servableNow: row.servableNow,
      })),
      selectedTopics: recommendations.map((row) => ({
        topicId: row.topicId,
        rank: row.rank,
        score: row.score,
      })),
      scoringVersion: 'easefactor-reference-v1',
      explanation: 'Deterministic ranking prefers readiness, curriculum fit, unlock value, evidence need, content availability, age fit, teacher priority, and blocker pressure.',
    },
  };
};
