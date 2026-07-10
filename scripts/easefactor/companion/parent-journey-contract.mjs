const parentJourneyContext = Object.freeze({board: 'CBSE', curriculum: 'ncert-class6-math-2026-27', class: 6, subject: 'Mathematics', language: 'en-IN', topicFamily: 'fractions-comparison'});
const parentConcern = Object.freeze({concernId: 'fraction-size-comparison', text: 'My child finds it hard to tell which fraction is bigger.', targetTopicId: 'mt_IfEgu0X449', foundationalTopicId: 'mt_Kr3IyA6m-O'});

const allowedParentJourneyFields = new Set(['context', 'concernId', 'evidenceMode', 'consent', 'diagnosticEvents', 'recheckEvents', 'parentOutcomeResponses']);
const allowedContextFields = new Set(['board', 'curriculum', 'class', 'subject', 'language', 'topicFamily']);
const allowedConsentFields = new Set(['purpose', 'scope', 'observationCapture']);
const allowedEvidenceFields = new Set(['topicId', 'taxonomyVersion', 'result', 'score', 'observedAt']);
const allowedOutcomeFields = new Set(['foundationalGapTopicId', 'firstActionId']);
const allowedParentJourneyEvidenceTopics = new Set(['mt_vKcxX6iNOA', 'mt_Kr3IyA6m-O', 'mt_IfEgu0X449']);

export const parentJourneyError = (code, message = code) => Object.assign(new Error(message), {code});

export const getParentJourneyContext = () => structuredClone(parentJourneyContext);
export const getParentConcern = () => structuredClone(parentConcern);

const isValidExplicitTimezoneTimestamp = (value) => {
  if (typeof value !== 'string') return false;
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2})(?:\.(\d+))?)?(Z|[+-](\d{2}):(\d{2}))$/);
  if (!match) return false;
  const [, yearText, monthText, dayText, hourText, minuteText, secondText = '0', , , offsetHourText = '0', offsetMinuteText = '0'] = match;
  const [year, month, day, hour, minute, second, offsetHour, offsetMinute] = [yearText, monthText, dayText, hourText, minuteText, secondText, offsetHourText, offsetMinuteText].map(Number);
  const leapYear = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const daysInMonth = [31, leapYear ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month - 1] ?? 0;
  return day >= 1 && day <= daysInMonth
    && hour <= 23 && minute <= 59 && second <= 59
    && offsetHour <= 23 && offsetMinute <= 59
    && Number.isFinite(Date.parse(value));
};

const assertOnlyFields = (value, allowedFields) => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw parentJourneyError('private_data_not_allowed', 'Journey sections must be objects with reviewed fields only.');
  const unexpected = Object.keys(value).find((field) => !allowedFields.has(field));
  if (unexpected) throw parentJourneyError('private_data_not_allowed', `Private, persistent, or unsupported field is not allowed: ${unexpected}.`);
};

const validateEvidenceTopics = (graph, events) => {
  if (!Array.isArray(events)) throw parentJourneyError('invalid_parent_journey_evidence', 'Evidence must be an array.');
  for (const event of events) {
    if (!event || typeof event !== 'object' || typeof event.topicId !== 'string') throw parentJourneyError('invalid_parent_journey_evidence', 'Each evidence event requires a topicId.');
    assertOnlyFields(event, allowedEvidenceFields);
    if (!allowedParentJourneyEvidenceTopics.has(event.topicId)) throw parentJourneyError('invalid_parent_journey_evidence', `Evidence topic is outside the reviewed parent journey: ${event.topicId}.`);
    if (!['secure', 'partial', 'review', 'blocked'].includes(event.result)) throw parentJourneyError('invalid_parent_journey_evidence', 'Evidence result is invalid.');
    if (typeof event.score !== 'number' || !Number.isFinite(event.score) || event.score < 0 || event.score > 1) throw parentJourneyError('invalid_parent_journey_evidence', 'Evidence score must be finite and between zero and one.');
    if (!isValidExplicitTimezoneTimestamp(event.observedAt)) throw parentJourneyError('invalid_parent_journey_evidence', 'Evidence observedAt must be a valid timestamp with an explicit timezone.');
    if (event.taxonomyVersion !== undefined && event.taxonomyVersion !== graph.taxonomyVersion) throw parentJourneyError('invalid_parent_journey_evidence', 'Evidence taxonomyVersion does not match the current taxonomy.');
    try {
      graph.getTopic(event.topicId);
    } catch (error) {
      throw parentJourneyError('invalid_parent_journey_evidence', error?.message ?? 'Evidence topic is invalid.');
    }
  }
};

export const validateParentJourneyBoundary = (graph, request) => {
  assertOnlyFields(request, allowedParentJourneyFields);
  if (!request.context || typeof request.context !== 'object' || Array.isArray(request.context)) throw parentJourneyError('unsupported_parent_journey_context', 'Parent journey context is required.');
  if (!request.consent || typeof request.consent !== 'object' || Array.isArray(request.consent)) throw parentJourneyError('invalid_consent_boundary', 'Consent must be request-only diagnostic guidance.');
  assertOnlyFields(request.context, allowedContextFields);
  assertOnlyFields(request.consent, allowedConsentFields);
  if (request.parentOutcomeResponses !== undefined) assertOnlyFields(request.parentOutcomeResponses, allowedOutcomeFields);
  for (const [field, expected] of Object.entries(parentJourneyContext)) {
    if (request.context?.[field] !== expected) throw parentJourneyError('unsupported_parent_journey_context', `Unsupported parent journey ${field}.`);
  }
  if (request.concernId !== parentConcern.concernId) throw parentJourneyError('unsupported_parent_journey_context', 'Unsupported parent concern.');
  if (request.evidenceMode !== 'synthetic') throw parentJourneyError('synthetic_evidence_required', 'Only synthetic evidence is accepted.');
  if (request.consent?.purpose !== 'diagnostic-guidance' || request.consent?.scope !== 'request-only' || request.consent?.observationCapture !== 'request-only') throw parentJourneyError('invalid_consent_boundary', 'Consent must be request-only diagnostic guidance.');
  validateEvidenceTopics(graph, request.diagnosticEvents === undefined ? [] : request.diagnosticEvents);
  validateEvidenceTopics(graph, request.recheckEvents === undefined ? [] : request.recheckEvents);
};
