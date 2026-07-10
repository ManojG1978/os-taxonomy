export const makeParentJourneyRequest = (overrides = {}) => ({
  context: {
    board: 'CBSE',
    curriculum: 'ncert-class6-math-2026-27',
    class: 6,
    subject: 'Mathematics',
    language: 'en-IN',
    topicFamily: 'fractions-comparison',
  },
  concernId: 'fraction-size-comparison',
  evidenceMode: 'synthetic',
  consent: {
    purpose: 'diagnostic-guidance',
    scope: 'request-only',
    observationCapture: 'request-only',
  },
  diagnosticEvents: [
    {topicId: 'mt_vKcxX6iNOA', result: 'secure', score: 0.92, observedAt: '2026-07-10T09:00:00.000Z'},
    {topicId: 'mt_Kr3IyA6m-O', result: 'partial', score: 0.42, observedAt: '2026-07-10T09:05:00.000Z'},
  ],
  recheckEvents: [
    {topicId: 'mt_Kr3IyA6m-O', result: 'secure', score: 0.86, observedAt: '2026-07-10T09:30:00.000Z'},
  ],
  parentOutcomeResponses: {
    foundationalGapTopicId: 'mt_Kr3IyA6m-O',
    firstActionId: 'locate-benchmark-fractions',
  },
  ...overrides,
});
