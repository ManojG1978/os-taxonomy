import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';

import {loadTaxonomyRelease, makeGraphStore} from '../../easefactor-reference.mjs';
import {getParentConcern, getParentJourneyContext} from './parent-journey-contract.mjs';
import {validateReviewedHouseholdActivity} from './parent-journey-content.mjs';
import {buildParentCompanionJourney} from './parent-journey.mjs';
import {makeParentJourneyRequest} from './parent-journey-fixture.test-helper.mjs';

test('buildParentCompanionJourney returns the complete reviewed fractions journey', () => {
  const graph = makeGraphStore(loadTaxonomyRelease());
  const journey = buildParentCompanionJourney(graph, makeParentJourneyRequest());
  assert.equal(journey.taxonomyVersion, 'v1');
  assert.equal(journey.journeyVersion, 'parent-fractions-v1');
  assert.equal(journey.intake.concern, 'My child finds it hard to tell which fraction is bigger.');
  assert.deepEqual(journey.diagnostic.prompts.map((row) => row.topicId), ['mt_vKcxX6iNOA', 'mt_Kr3IyA6m-O', 'mt_IfEgu0X449']);
  assert.equal(journey.foundationalGap.status, 'identified');
  assert.equal(journey.foundationalGap.topicId, 'mt_Kr3IyA6m-O');
  assert.match(journey.explanation, /number line/i);
  assert.deepEqual(journey.remediationSteps.map((row) => row.actionId), ['locate-benchmark-fractions', 'place-fractions-zero-to-one', 'compare-number-line-positions']);
  assert.equal(journey.activity.activityId, 'household-fraction-strip-number-line-v1');
  assert.equal(journey.activity.review.status, 'reviewed');
  assert.equal(journey.recheck.status, 'improved');
  assert.equal(journey.parentOutcome.status, 'passed');
  assert.equal(journey.parentOutcome.understoodGap, true);
  assert.equal(journey.parentOutcome.identifiedFirstAction, true);
});

test('parent journey fixed contract accessors return isolated copies', () => {
  const context = getParentJourneyContext();
  const concern = getParentConcern();
  context.language = 'hi-IN';
  concern.text = 'changed';
  assert.equal(getParentJourneyContext().language, 'en-IN');
  assert.equal(getParentConcern().text, 'My child finds it hard to tell which fraction is bigger.');
});

test('parent journey returns not enough information without number-line evidence', () => {
  const graph = makeGraphStore(loadTaxonomyRelease());
  const journey = buildParentCompanionJourney(graph, makeParentJourneyRequest({diagnosticEvents: [], recheckEvents: []}));
  assert.equal(journey.foundationalGap.status, 'not-enough-information');
  assert.equal(journey.activity, null);
  assert.deepEqual(journey.remediationSteps, []);
  assert.equal(journey.recheck.status, 'not-submitted');
  assert.equal(journey.parentOutcome.status, 'not-measured');
  assert.equal(journey.parentOutcome.understoodGap, null);
  assert.equal(journey.parentOutcome.identifiedFirstAction, null);
});

test('parent journey is deterministic and keeps diagnostic and recheck evidence separate', () => {
  const graph = makeGraphStore(loadTaxonomyRelease());
  const request = makeParentJourneyRequest();
  const first = buildParentCompanionJourney(graph, request);
  assert.deepEqual(first, buildParentCompanionJourney(graph, structuredClone(request)));
  assert.equal(first.foundationalGap.evidenceStatus, 'developing');
  assert.equal(first.recheck.evidenceStatus, 'secure');
});

test('reviewed household activity normalizes draft, unknown-topic, and invalid-mapping failures', () => {
  const graph = makeGraphStore(loadTaxonomyRelease());
  const valid = buildParentCompanionJourney(graph, makeParentJourneyRequest()).activity;
  const expectInvalid = (activity) => assert.throws(
    () => validateReviewedHouseholdActivity(graph, activity),
    (error) => error.code === 'invalid_reviewed_activity',
  );

  expectInvalid({...valid, title: ''});
  expectInvalid({...valid, selectionReason: undefined});
  expectInvalid({...valid, selectionReason: ''});
  expectInvalid({...valid, version: 0});
  expectInvalid({...valid, review: {status: 'reviewed', scope: ''}});
  expectInvalid({...valid, materials: []});
  expectInvalid({...valid, estimatedMinutes: Number.POSITIVE_INFINITY});
  expectInvalid({...valid, topicIds: ['mt_Kr3IyA6m-O']});
  expectInvalid({...valid, topicIds: ['mt_Kr3IyA6m-O', 'mt_Kr3IyA6m-O']});
  expectInvalid({...valid, topicIds: ['mt_Kr3IyA6m-O', 'mt_missing']});
  expectInvalid({...valid, contentMappings: []});
  expectInvalid({...valid, contentMappings: valid.contentMappings.slice(0, 1)});
  expectInvalid({...valid, contentMappings: valid.contentMappings.map((mapping) => ({...mapping, contentId: 'wrong-activity'}))});
  expectInvalid({...valid, contentMappings: valid.contentMappings.map((mapping) => ({...mapping, confidence: 'machine'}))});
  expectInvalid({...valid, contentMappings: valid.contentMappings.map((mapping) => ({...mapping, role: 'unknown'}))});
});

test('parent outcome requires both comprehension and action answers', () => {
  const graph = makeGraphStore(loadTaxonomyRelease());
  const unmeasured = buildParentCompanionJourney(graph, makeParentJourneyRequest({parentOutcomeResponses: undefined}));
  const partial = buildParentCompanionJourney(graph, makeParentJourneyRequest({parentOutcomeResponses: {foundationalGapTopicId: 'mt_Kr3IyA6m-O', firstActionId: 'wrong'}}));
  assert.equal(unmeasured.parentOutcome.status, 'not-measured');
  assert.equal(partial.parentOutcome.status, 'not-passed');
  assert.equal(partial.parentOutcome.understoodGap, true);
  assert.equal(partial.parentOutcome.identifiedFirstAction, false);
});

test('parent journey requires fixed context, synthetic mode, request-only consent, and no private fields', () => {
  const graph = makeGraphStore(loadTaxonomyRelease());
  assert.throws(() => buildParentCompanionJourney(graph, makeParentJourneyRequest({evidenceMode: 'production'})), (error) => error.code === 'synthetic_evidence_required');
  assert.throws(() => buildParentCompanionJourney(graph, makeParentJourneyRequest({consent: {...makeParentJourneyRequest().consent, scope: 'persistent'}})), (error) => error.code === 'invalid_consent_boundary');
  assert.throws(() => buildParentCompanionJourney(graph, makeParentJourneyRequest({context: {...makeParentJourneyRequest().context, language: 'hi-IN'}})), (error) => error.code === 'unsupported_parent_journey_context');
  assert.throws(() => buildParentCompanionJourney(graph, makeParentJourneyRequest({learnerId: 'child-123'})), (error) => error.code === 'private_data_not_allowed');
  for (const field of ['studentId', 'userId', 'guardianId', 'save', 'retain']) {
    assert.throws(() => buildParentCompanionJourney(graph, makeParentJourneyRequest({[field]: 'not-allowed'})), (error) => error.code === 'private_data_not_allowed');
  }
  assert.throws(() => buildParentCompanionJourney(graph, makeParentJourneyRequest({diagnosticEvents: [{topicId: 'mt_cFltwUQi-d', result: 'partial'}]})), (error) => error.code === 'invalid_parent_journey_evidence');
});

test('parent journey types missing and invalid context and consent before field allowlisting', () => {
  const graph = makeGraphStore(loadTaxonomyRelease());
  for (const context of [undefined, null, 'CBSE']) {
    assert.throws(
      () => buildParentCompanionJourney(graph, makeParentJourneyRequest({context})),
      (error) => error.code === 'unsupported_parent_journey_context',
    );
  }
  for (const consent of [undefined, null, 'request-only']) {
    assert.throws(
      () => buildParentCompanionJourney(graph, makeParentJourneyRequest({consent})),
      (error) => error.code === 'invalid_consent_boundary',
    );
  }
  assert.throws(
    () => buildParentCompanionJourney(graph, makeParentJourneyRequest({context: {...makeParentJourneyRequest().context, childName: 'private'}})),
    (error) => error.code === 'private_data_not_allowed',
  );
  assert.throws(
    () => buildParentCompanionJourney(graph, makeParentJourneyRequest({consent: {...makeParentJourneyRequest().consent, retain: true}})),
    (error) => error.code === 'private_data_not_allowed',
  );
});

test('parent journey rejects malformed evidence with one normalized error', () => {
  const graph = makeGraphStore(loadTaxonomyRelease());
  const baseEvent = makeParentJourneyRequest().diagnosticEvents[0];
  const invalidEvents = [
    {...baseEvent, result: undefined},
    {...baseEvent, result: 'mastered'},
    {...baseEvent, score: undefined},
    {...baseEvent, score: Number.NaN},
    {...baseEvent, score: -0.01},
    {...baseEvent, score: 1.01},
    {...baseEvent, observedAt: undefined},
    {...baseEvent, observedAt: 'not-a-timestamp'},
    {...baseEvent, observedAt: '2026-07-10T09:00:00.000'},
    {...baseEvent, observedAt: '2026-02-30T09:00:00.000Z'},
    {...baseEvent, taxonomyVersion: 'v2'},
    {...baseEvent, topicId: 'mt_missing'},
  ];
  for (const event of invalidEvents) {
    assert.throws(
      () => buildParentCompanionJourney(graph, makeParentJourneyRequest({diagnosticEvents: [event]})),
      (error) => error.code === 'invalid_parent_journey_evidence',
    );
  }
});

test('parent journey ordering and output are identical across process timezones', () => {
  const referenceUrl = new URL('../../easefactor-reference.mjs', import.meta.url).href;
  const fixtureUrl = new URL('./parent-journey-fixture.test-helper.mjs', import.meta.url).href;
  const script = `
    import {deriveMasteryState, loadTaxonomyRelease, makeGraphStore} from ${JSON.stringify(referenceUrl)};
    import {buildParentCompanionJourney} from ${JSON.stringify(new URL('./parent-journey.mjs', import.meta.url).href)};
    import {makeParentJourneyRequest} from ${JSON.stringify(fixtureUrl)};
    const diagnosticEvents = [
      {topicId: 'mt_vKcxX6iNOA', result: 'secure', score: 0.92, observedAt: '2026-07-10T09:00:00.000Z'},
      {topicId: 'mt_Kr3IyA6m-O', result: 'partial', score: 0.42, observedAt: '2026-07-10T09:15:00.000+05:30'},
      {topicId: 'mt_Kr3IyA6m-O', result: 'secure', score: 0.86, observedAt: '2026-07-10T04:00:00.000Z'},
    ];
    const graph = makeGraphStore(loadTaxonomyRelease());
    const journey = buildParentCompanionJourney(graph, makeParentJourneyRequest({diagnosticEvents}));
    const evidenceOrder = deriveMasteryState(diagnosticEvents).get('mt_Kr3IyA6m-O').evidenceTrail.map((event) => event.observedAt);
    process.stdout.write(JSON.stringify({journey, evidenceOrder}));
  `;
  const runInTimezone = (TZ) => JSON.parse(execFileSync(
    process.execPath,
    ['--input-type=module', '--eval', script],
    {cwd: process.cwd(), encoding: 'utf8', env: {...process.env, TZ}},
  ));

  const utc = runInTimezone('UTC');
  const kolkata = runInTimezone('Asia/Kolkata');
  assert.deepEqual(utc, kolkata);
  assert.deepEqual(utc.evidenceOrder, ['2026-07-10T09:15:00.000+05:30', '2026-07-10T04:00:00.000Z']);
});
