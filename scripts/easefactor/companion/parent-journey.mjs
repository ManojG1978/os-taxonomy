import {deriveMasteryState, isSecureEnough} from '../learner/mastery.mjs';
import {findLearningGaps} from '../learner/learning-gaps.mjs';
import {buildDiagnosticPlan} from '../planner/diagnostic-plan.mjs';
import {buildRemediationPlan} from '../planner/remediation-plan.mjs';
import {getParentConcern, getParentJourneyContext, validateParentJourneyBoundary} from './parent-journey-contract.mjs';
import {getReviewedParentJourneyContent, validateReviewedHouseholdActivity} from './parent-journey-content.mjs';

const buildParentOutcome = (responses, foundationalGap, remediationSteps) => {
  const expected = {
    foundationalGapTopicId: foundationalGap?.status === 'identified' ? foundationalGap.topicId : null,
    firstActionId: remediationSteps?.[0]?.actionId ?? null,
  };
  if (!responses || !expected.foundationalGapTopicId || !expected.firstActionId) return {status: 'not-measured', understoodGap: null, identifiedFirstAction: null, expected};
  const understoodGap = responses.foundationalGapTopicId === expected.foundationalGapTopicId;
  const identifiedFirstAction = responses.firstActionId === expected.firstActionId;
  return {status: understoodGap && identifiedFirstAction ? 'passed' : 'not-passed', understoodGap, identifiedFirstAction, expected};
};

export const buildParentCompanionJourney = (graph, request = {}) => {
  validateParentJourneyBoundary(graph, request);
  const parentJourneyContext = getParentJourneyContext();
  const parentConcern = getParentConcern();
  const {diagnosticPrompts, remediationSteps: reviewedRemediationSteps, householdActivity} = getReviewedParentJourneyContent();
  const activity = validateReviewedHouseholdActivity(graph, householdActivity);
  const diagnosticMastery = deriveMasteryState(request.diagnosticEvents ?? []);
  const recheckMastery = deriveMasteryState(request.recheckEvents ?? []);
  const foundationalState = diagnosticMastery.get(parentConcern.foundationalTopicId) ?? null;
  const gapIdentified = foundationalState !== null && !isSecureEnough(foundationalState);
  const diagnosticPlan = buildDiagnosticPlan(graph, {targetTopicId: parentConcern.targetTopicId, masteryByTopic: diagnosticMastery, contentMappings: activity.contentMappings});
  const learningGaps = findLearningGaps(graph, diagnosticMastery, parentConcern.targetTopicId);
  const remediationPlan = buildRemediationPlan(graph, {targetTopicId: parentConcern.targetTopicId, masteryByTopic: diagnosticMastery, contentMappings: activity.contentMappings});
  const recheckState = recheckMastery.get(parentConcern.foundationalTopicId) ?? null;
  const foundationalGap = gapIdentified ? {status: 'identified', topicId: parentConcern.foundationalTopicId, evidenceStatus: foundationalState.status, confidence: foundationalState.confidence, graphGaps: learningGaps.gaps} : {status: 'not-enough-information', topicId: null, evidenceStatus: foundationalState?.status ?? 'unseen', confidence: foundationalState?.confidence ?? 0, nextPromptId: 'place-fraction-number-line'};
  const remediationSteps = gapIdentified ? reviewedRemediationSteps.map((row) => ({...row})) : [];
  return {
    taxonomyVersion: graph.taxonomyVersion,
    journeyVersion: 'parent-fractions-v1',
    intake: {context: {...parentJourneyContext}, concernId: parentConcern.concernId, concern: parentConcern.text},
    diagnostic: {prompts: diagnosticPrompts.map((row) => ({...row})), evidenceCount: request.diagnosticEvents?.length ?? 0, plan: diagnosticPlan},
    foundationalGap,
    explanation: gapIdentified ? 'Comparing fractions is difficult because the submitted evidence shows that placing fractions by size on a number line is not yet consistent.' : 'There is not enough information to identify a foundational gap. Try the number-line diagnostic prompt first.',
    remediationSteps,
    remediationDecision: remediationPlan,
    activity: gapIdentified ? structuredClone(activity) : null,
    recheck: recheckState ? {status: isSecureEnough(recheckState) && gapIdentified ? 'improved' : 'needs-more-evidence', topicId: parentConcern.foundationalTopicId, evidenceStatus: recheckState.status, confidence: recheckState.confidence, prompt: 'Place 2/5 and 4/5 on the same number line, then explain which is larger.'} : {status: 'not-submitted', topicId: parentConcern.foundationalTopicId, evidenceStatus: 'unseen', confidence: 0, prompt: 'Place 2/5 and 4/5 on the same number line, then explain which is larger.'},
    parentOutcome: buildParentOutcome(request.parentOutcomeResponses, foundationalGap, remediationSteps),
    privacy: {evidenceMode: request.evidenceMode, scope: request.consent?.scope, persistence: 'none'},
  };
};
