import {validateContentMappings} from '../content/content-mappings.mjs';
import {buildContentIndex, buildContentSummary, isServableRemediationContent} from '../content/content-selection.mjs';
import {checkReadiness} from '../learner/readiness.mjs';

const remediationStepExplanation = (gap) => {
    const evidenceLabel = gap.status === 'unseen'
        ? 'missing prerequisite evidence'
        : `weak prerequisite evidence (${gap.status}, confidence ${gap.confidence.toFixed(2)})`;
    return `Repair this hard prerequisite first because ${evidenceLabel} blocks readiness for the target topic. ${gap.reason}`;
};

export const buildRemediationPlan = (graph, request = {}) => {
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
        const servableContent = contentRows.filter(isServableRemediationContent);
        return {
            rank: index + 1,
            topicId: gap.topicId,
            status: gap.status,
            confidence: gap.confidence,
            strength: gap.strength,
            distance: gap.distance,
            servableNow: servableContent.length > 0,
            readiness: {
                targetTopicId,
                readyToLearnTarget: readiness.readyToLearn,
                blockerStatus: gap.status,
                blockerConfidence: gap.confidence,
            },
            gap: {
                whyItMatters: gap.reason,
                evidenceStatus: gap.status,
            },
            explanation: remediationStepExplanation(gap),
            content: buildContentSummary(contentRows),
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
            ? `No hard prerequisite remediation is needed for ${targetTopicId}.`
            : `Repair ${steps.length} hard prerequisite${steps.length === 1 ? '' : 's'} before teaching ${targetTopicId}.`,
    };
};
