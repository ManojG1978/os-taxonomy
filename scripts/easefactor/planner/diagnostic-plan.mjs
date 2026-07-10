import {validateContentMappings} from '../content/content-mappings.mjs';
import {buildContentIndex, buildContentSummary, isAssessableDiagnosticContent} from '../content/content-selection.mjs';
import {checkReadiness} from '../learner/readiness.mjs';

const diagnosticStepExplanation = (gap) => {
  const evidenceLabel = gap.status === 'unseen'
      ? 'missing prerequisite evidence'
      : `weak prerequisite evidence (${gap.status}, confidence ${gap.confidence.toFixed(2)})`;
  return `Collect diagnostic evidence first because ${evidenceLabel} blocks readiness for the target topic. ${gap.reason}`;
};

export const buildDiagnosticPlan = (graph, request = {}) => {
  const targetTopicId = request.targetTopicId;
  if (typeof targetTopicId !== 'string' || targetTopicId.length === 0) {
    throw new Error('missing_target_topic_id');
  }

  const masteryByTopic = request.masteryByTopic ?? new Map();
  const readiness = checkReadiness(graph, masteryByTopic, targetTopicId);
  const validatedContentMappings = validateContentMappings(graph, request.contentMappings ?? []);
  const contentByTopic = buildContentIndex(validatedContentMappings);
  const orderedGaps = [...readiness.blockedBy].sort((a, b) => {
    if (a.confidence !== b.confidence) {
      return a.confidence - b.confidence;
    }
    return a.topicId.localeCompare(b.topicId);
  });

  const steps = orderedGaps.map((gap, index) => {
    const contentRows = contentByTopic.get(gap.topicId) || [];
    const assessableContent = contentRows.filter(isAssessableDiagnosticContent);
    const evidenceLabel = gap.status === 'unseen'
        ? 'missing prerequisite evidence'
        : `weak prerequisite evidence (${gap.status}, confidence ${gap.confidence.toFixed(2)})`;

    return {
      rank: index + 1,
      topicId: gap.topicId,
      status: gap.status,
      confidence: gap.confidence,
      strength: gap.strength,
      distance: gap.distance,
      assessableNow: assessableContent.length > 0,
      readiness: {
        targetTopicId,
        readyToLearnTarget: readiness.readyToLearn,
        blockerStatus: gap.status,
        blockerConfidence: gap.confidence,
        explanation: `Readiness is blocked by ${evidenceLabel}.`,
      },
      gap: {
        whyItMatters: gap.reason,
        evidenceStatus: gap.status,
        explanation: `This hard prerequisite blocks readiness for ${targetTopicId}.`,
      },
      explanation: diagnosticStepExplanation(gap),
      content: buildContentSummary(assessableContent),
    };
  });

  return {
    taxonomyVersion: graph.taxonomyVersion,
    learnerId: request.learnerId ?? null,
    targetTopicId,
    readyToLearnTarget: readiness.readyToLearn,
    prerequisiteStatus: readiness.prerequisiteStatus,
    steps,
    explanation: steps.length === 0
        ? `No diagnostic evidence is needed before teaching ${targetTopicId}.`
        : `Collect diagnostic evidence for ${steps.length} hard prerequisite${steps.length === 1 ? '' : 's'} before teaching ${targetTopicId}.`,
  };
};
