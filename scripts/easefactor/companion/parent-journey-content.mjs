import {validateContentMappings} from '../content/content-mappings.mjs';
import {parentJourneyError} from './parent-journey-contract.mjs';

const parentDiagnosticPrompts = Object.freeze([
  {rank: 1, promptId: 'name-fraction-parts', topicId: 'mt_vKcxX6iNOA', prompt: 'In 3/4, what do 3 and 4 tell us?'},
  {rank: 2, promptId: 'place-fraction-number-line', topicId: 'mt_Kr3IyA6m-O', prompt: 'Place 1/4, 1/2, and 3/4 between zero and one.'},
  {rank: 3, promptId: 'compare-fractions', topicId: 'mt_IfEgu0X449', prompt: 'Which is larger, 2/5 or 4/5, and how do you know?'},
]);
const parentRemediationSteps = Object.freeze([
  {rank: 1, actionId: 'locate-benchmark-fractions', topicId: 'mt_Kr3IyA6m-O', instruction: 'Locate one-half, one-quarter, and three-quarters on a line from zero to one.'},
  {rank: 2, actionId: 'place-fractions-zero-to-one', topicId: 'mt_Kr3IyA6m-O', instruction: 'Place unfamiliar proper fractions between zero and one.'},
  {rank: 3, actionId: 'compare-number-line-positions', topicId: 'mt_IfEgu0X449', instruction: 'Compare two fractions by checking which position is farther to the right.'},
]);
const reviewedHouseholdActivity = Object.freeze({
  activityId: 'household-fraction-strip-number-line-v1',
  version: 1,
  review: {status: 'reviewed', scope: 'Marble-authored Class 6 fraction comparison reference activity'},
  title: 'Build a fraction number line with paper strips',
  purpose: 'Connect fraction size to position between zero and one.',
  topicIds: ['mt_Kr3IyA6m-O', 'mt_IfEgu0X449'],
  materials: ['Two sheets of scrap paper', 'Pencil', 'Ruler or straight edge'],
  estimatedMinutes: 15,
  instructions: ['Mark zero and one at the ends of a paper strip.', 'Fold or measure to mark one-half, one-quarter, and three-quarters.', 'Ask the learner to place two new fractions and explain which is farther to the right.'],
  evidencePrompts: ['The learner places benchmark fractions between zero and one.', 'The learner compares two fractions by referring to their positions.'],
  accessibilityNotes: ['Read each instruction aloud if written directions are a barrier.', 'Use a longer strip and thicker marks if fine visual detail is difficult.'],
  safetyNotes: ['Use child-safe scissors only if strips must be cut; tearing or folding is sufficient.'],
  selectionReason: 'The submitted evidence points to fraction position on a number line as the first concept to strengthen.',
  contentMappings: [
    {contentId: 'household-fraction-strip-number-line-v1', topicId: 'mt_Kr3IyA6m-O', taxonomyVersion: 'v1', role: 'practices', confidence: 'reviewed', estimatedMinutes: 15},
    {contentId: 'household-fraction-strip-number-line-v1', topicId: 'mt_IfEgu0X449', taxonomyVersion: 'v1', role: 'extends', confidence: 'reviewed', estimatedMinutes: 15},
  ],
});

export const getReviewedParentJourneyContent = () => ({
  diagnosticPrompts: structuredClone(parentDiagnosticPrompts),
  remediationSteps: structuredClone(parentRemediationSteps),
  householdActivity: structuredClone(reviewedHouseholdActivity),
});

export const validateReviewedHouseholdActivity = (graph, activity) => {
  try {
    const nonEmptyString = (value) => typeof value === 'string' && value.trim().length > 0;
    const nonEmptyStringArray = (value) => Array.isArray(value) && value.length > 0 && value.every(nonEmptyString);
    if (!activity || typeof activity !== 'object' || Array.isArray(activity)) throw new Error('Household activity must be an object.');
    if (!nonEmptyString(activity.activityId) || !Number.isInteger(activity.version) || activity.version <= 0) throw new Error('Household activity identity and version are required.');
    if (activity.review?.status !== 'reviewed' || !nonEmptyString(activity.review?.scope)) throw new Error('Household activity review metadata is invalid.');
    if (!nonEmptyString(activity.title) || !nonEmptyString(activity.purpose) || !nonEmptyString(activity.selectionReason)) throw new Error('Household activity title, purpose, and selection reason are required.');
    for (const field of ['materials', 'instructions', 'evidencePrompts', 'accessibilityNotes', 'safetyNotes']) {
      if (!nonEmptyStringArray(activity[field])) throw new Error(`Household activity ${field} must contain reviewed text.`);
    }
    if (typeof activity.estimatedMinutes !== 'number' || !Number.isFinite(activity.estimatedMinutes) || activity.estimatedMinutes <= 0) throw new Error('Household activity estimatedMinutes must be positive and finite.');

    const requiredTopicIds = new Set(['mt_Kr3IyA6m-O', 'mt_IfEgu0X449']);
    const activityTopicIds = new Set(activity.topicIds);
    if (!Array.isArray(activity.topicIds) || activity.topicIds.length !== requiredTopicIds.size || activityTopicIds.size !== requiredTopicIds.size || activity.topicIds.some((topicId) => !requiredTopicIds.has(topicId))) throw new Error('Household activity must use the reviewed topic set.');
    for (const topicId of activity.topicIds) graph.getTopic(topicId);
    const mappings = validateContentMappings(graph, activity.contentMappings);
    if (mappings.length === 0) throw new Error('Household activity content mappings are required.');
    const mappedTopicIds = new Set();
    for (const mapping of mappings) {
      if (mapping.contentId !== activity.activityId) throw new Error('Household activity mapping contentId must match activityId.');
      if (mapping.confidence !== 'reviewed' && mapping.confidence !== 'verified') throw new Error('Household activity mappings must be human reviewed.');
      mappedTopicIds.add(mapping.topicId);
    }
    if (mappedTopicIds.size !== requiredTopicIds.size || activity.topicIds.some((topicId) => !mappedTopicIds.has(topicId))) throw new Error('Household activity mapping topics must match activity topics.');
  } catch (error) {
    throw parentJourneyError('invalid_reviewed_activity', error?.message ?? 'Invalid reviewed household activity.');
  }
  return activity;
};
