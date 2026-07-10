# Parent Companion Fractions Vertical Slice Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add one deterministic, synthetic, request-local parent companion journey for reviewed CBSE/NCERT Class 6 fraction comparison.

**Architecture:** Extend the dependency-free EaseFactor reference module with a fixed reviewed activity contract, strict request-boundary validation, and one journey orchestrator that composes existing mastery, diagnostic, gap, and remediation primitives. Expose it through one thin local HTTP endpoint and document it as `reference-only`, not as a production parent product.

**Tech Stack:** Node.js ES modules, Node built-in `node:test`, Node built-in HTTP server, Markdown, and the existing dependency-free taxonomy release.

## Global Constraints

- Use only `Comparing fractions` (`mt_IfEgu0X449`) and its `Fractions on a number line` (`mt_Kr3IyA6m-O`) foundational gap.
- Accept only CBSE, `ncert-class6-math-2026-27`, Class 6, Mathematics, `en-IN`, and `fractions-comparison`.
- Require `evidenceMode: "synthetic"` and request-only diagnostic-guidance consent assertions.
- Reject private identifiers and persistence requests; store nothing.
- Do not copy or reconstruct NCERT text.
- Keep production UI, authentication, storage, consent administration, Hindi, analytics, weekly summaries, and curriculum expansion out of scope.
- Add no runtime dependency, framework, build tool, or lockfile.
- Preserve deterministic ordering, typed errors, and a visible red-green test trail.

## File Structure

- `scripts/easefactor-reference.mjs`: fixed contracts, validators, outcome evaluator, and journey orchestrator.
- `scripts/easefactor-reference.test.mjs`: reference behavior and boundary tests.
- `scripts/easefactor-api.mjs`: thin endpoint and HTTP error mapping.
- `scripts/easefactor-api.test.mjs`: HTTP success and failure contracts.
- `docs/easefactor-reference-slice.md`: runnable request-local contract.
- `docs/easefactor-product-roadmap.md`: honest `reference-only` versus `planned` status.

---

### Task 1: Reference-Layer Journey Contract

**Files:**

- Modify: `scripts/easefactor-reference.test.mjs`
- Modify: `scripts/easefactor-reference.mjs`

**Interfaces:**

- Consumes: `deriveMasteryState`, `buildDiagnosticPlan`, `findLearningGaps`, `buildRemediationPlan`, `validateContentMappings`, and `graph.getTopic`.
- Produces: `validateReviewedHouseholdActivity(graph, activity)`, `buildParentCompanionJourney(graph, request)`, and errors with stable `.code` values.

- [ ] **Step 1: Write the failing successful-journey test**

Add both new exports to the reference-test imports. Add this reusable fixture:

```js
const makeParentJourneyRequest = (overrides = {}) => ({
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
```

Add the test:

```js
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
```

- [ ] **Step 2: Run the test to verify RED**

Run:

```powershell
node --test --test-name-pattern="complete reviewed fractions journey" scripts/easefactor-reference.test.mjs
```

Expected: FAIL because `buildParentCompanionJourney` is not exported.

- [ ] **Step 3: Add fixed context, content, diagnostic, and remediation constants**

Add near the existing content-mapping constants:

```js
const parentJourneyContext = Object.freeze({board: 'CBSE', curriculum: 'ncert-class6-math-2026-27', class: 6, subject: 'Mathematics', language: 'en-IN', topicFamily: 'fractions-comparison'});
const parentConcern = Object.freeze({concernId: 'fraction-size-comparison', text: 'My child finds it hard to tell which fraction is bigger.', targetTopicId: 'mt_IfEgu0X449', foundationalTopicId: 'mt_Kr3IyA6m-O'});
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
```

- [ ] **Step 4: Implement the minimum successful orchestrator**

Add before `makeGraphStore`:

```js
const parentJourneyError = (code, message = code) => Object.assign(new Error(message), {code});

export const validateReviewedHouseholdActivity = (graph, activity) => {
  if (!activity || activity.review?.status !== 'reviewed' || !Array.isArray(activity.topicIds) || activity.topicIds.length === 0) {
    throw parentJourneyError('invalid_reviewed_activity', 'Household activity must be reviewed and map to at least one topic.');
  }
  try {
    for (const topicId of activity.topicIds) graph.getTopic(topicId);
    validateContentMappings(graph, activity.contentMappings);
  } catch (error) {
    throw parentJourneyError('invalid_reviewed_activity', error.message);
  }
  return activity;
};

const buildParentOutcome = (responses) => {
  const expected = {foundationalGapTopicId: parentConcern.foundationalTopicId, firstActionId: parentRemediationSteps[0].actionId};
  if (!responses) return {status: 'not-measured', understoodGap: null, identifiedFirstAction: null, expected};
  const understoodGap = responses.foundationalGapTopicId === expected.foundationalGapTopicId;
  const identifiedFirstAction = responses.firstActionId === expected.firstActionId;
  return {status: understoodGap && identifiedFirstAction ? 'passed' : 'not-passed', understoodGap, identifiedFirstAction, expected};
};

export const buildParentCompanionJourney = (graph, request = {}) => {
  const activity = validateReviewedHouseholdActivity(graph, reviewedHouseholdActivity);
  const diagnosticMastery = deriveMasteryState(request.diagnosticEvents ?? []);
  const recheckMastery = deriveMasteryState(request.recheckEvents ?? []);
  const foundationalState = diagnosticMastery.get(parentConcern.foundationalTopicId) ?? null;
  const gapIdentified = foundationalState !== null && !isSecureEnough(foundationalState);
  const diagnosticPlan = buildDiagnosticPlan(graph, {targetTopicId: parentConcern.targetTopicId, masteryByTopic: diagnosticMastery, contentMappings: activity.contentMappings});
  const learningGaps = findLearningGaps(graph, diagnosticMastery, parentConcern.targetTopicId);
  const remediationPlan = buildRemediationPlan(graph, {targetTopicId: parentConcern.targetTopicId, masteryByTopic: diagnosticMastery, contentMappings: activity.contentMappings});
  const recheckState = recheckMastery.get(parentConcern.foundationalTopicId) ?? null;
  return {
    taxonomyVersion: graph.taxonomyVersion,
    journeyVersion: 'parent-fractions-v1',
    intake: {context: {...parentJourneyContext}, concernId: parentConcern.concernId, concern: parentConcern.text},
    diagnostic: {prompts: parentDiagnosticPrompts.map((row) => ({...row})), evidenceCount: request.diagnosticEvents?.length ?? 0, plan: diagnosticPlan},
    foundationalGap: gapIdentified ? {status: 'identified', topicId: parentConcern.foundationalTopicId, evidenceStatus: foundationalState.status, confidence: foundationalState.confidence, graphGaps: learningGaps.gaps} : {status: 'not-enough-information', topicId: null, evidenceStatus: foundationalState?.status ?? 'unseen', confidence: foundationalState?.confidence ?? 0, nextPromptId: 'place-fraction-number-line'},
    explanation: gapIdentified ? 'Comparing fractions is difficult because the submitted evidence shows that placing fractions by size on a number line is not yet consistent.' : 'There is not enough information to identify a foundational gap. Try the number-line diagnostic prompt first.',
    remediationSteps: gapIdentified ? parentRemediationSteps.map((row) => ({...row})) : [],
    remediationDecision: remediationPlan,
    activity: gapIdentified ? structuredClone(activity) : null,
    recheck: recheckState ? {status: isSecureEnough(recheckState) && gapIdentified ? 'improved' : 'needs-more-evidence', topicId: parentConcern.foundationalTopicId, evidenceStatus: recheckState.status, confidence: recheckState.confidence, prompt: 'Place 2/5 and 4/5 on the same number line, then explain which is larger.'} : {status: 'not-submitted', topicId: parentConcern.foundationalTopicId, evidenceStatus: 'unseen', confidence: 0, prompt: 'Place 2/5 and 4/5 on the same number line, then explain which is larger.'},
    parentOutcome: buildParentOutcome(request.parentOutcomeResponses),
    privacy: {evidenceMode: request.evidenceMode, scope: request.consent?.scope, persistence: 'none'},
  };
};
```

- [ ] **Step 5: Run the success test to verify GREEN**

Run `node --test --test-name-pattern="complete reviewed fractions journey" scripts/easefactor-reference.test.mjs`.

Expected: PASS.

- [ ] **Step 6: Write failing uncertainty, separation, activity, boundary, and outcome tests**

Add these cases:

```js
test('parent journey returns not enough information without number-line evidence', () => {
  const graph = makeGraphStore(loadTaxonomyRelease());
  const journey = buildParentCompanionJourney(graph, makeParentJourneyRequest({diagnosticEvents: [], recheckEvents: []}));
  assert.equal(journey.foundationalGap.status, 'not-enough-information');
  assert.equal(journey.activity, null);
  assert.deepEqual(journey.remediationSteps, []);
  assert.equal(journey.recheck.status, 'not-submitted');
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
  assert.throws(() => validateReviewedHouseholdActivity(graph, {review: {status: 'draft'}, topicIds: ['mt_Kr3IyA6m-O'], contentMappings: []}), (error) => error.code === 'invalid_reviewed_activity');
  assert.throws(() => validateReviewedHouseholdActivity(graph, {review: {status: 'reviewed'}, topicIds: ['mt_missing'], contentMappings: []}), (error) => error.code === 'invalid_reviewed_activity');
  assert.throws(() => validateReviewedHouseholdActivity(graph, {review: {status: 'reviewed'}, topicIds: ['mt_Kr3IyA6m-O'], contentMappings: [{contentId: 'bad', topicId: 'mt_Kr3IyA6m-O', taxonomyVersion: 'v1', role: 'unknown', confidence: 'reviewed'}]}), (error) => error.code === 'invalid_reviewed_activity');
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
});
```

- [ ] **Step 7: Run the focused tests to verify RED**

Run `node --test --test-name-pattern="parent journey|parent outcome|reviewed household activity" scripts/easefactor-reference.test.mjs`.

Expected: FAIL because strict request validation is missing.

- [ ] **Step 8: Implement exact boundary and event-topic validation**

Add before the orchestrator and call `validateParentJourneyBoundary(graph, request)` first:

```js
const prohibitedParentJourneyFields = new Set(['learnerId', 'learnerName', 'childName', 'parentName', 'email', 'phone', 'address', 'customerId', 'accountId', 'persist', 'persistence', 'storage']);
const findProhibitedField = (value) => {
  if (!value || typeof value !== 'object') return null;
  for (const [key, child] of Object.entries(value)) {
    if (prohibitedParentJourneyFields.has(key)) return key;
    const nested = findProhibitedField(child);
    if (nested) return nested;
  }
  return null;
};
const validateEvidenceTopics = (graph, events) => {
  if (!Array.isArray(events)) throw parentJourneyError('invalid_parent_journey_evidence', 'Evidence must be an array.');
  for (const event of events) {
    if (!event || typeof event !== 'object' || typeof event.topicId !== 'string') throw parentJourneyError('invalid_parent_journey_evidence', 'Each evidence event requires a topicId.');
    graph.getTopic(event.topicId);
  }
};
const validateParentJourneyBoundary = (graph, request) => {
  for (const [field, expected] of Object.entries(parentJourneyContext)) {
    if (request.context?.[field] !== expected) throw parentJourneyError('unsupported_parent_journey_context', `Unsupported parent journey ${field}.`);
  }
  if (request.concernId !== parentConcern.concernId) throw parentJourneyError('unsupported_parent_journey_context', 'Unsupported parent concern.');
  if (request.evidenceMode !== 'synthetic') throw parentJourneyError('synthetic_evidence_required', 'Only synthetic evidence is accepted.');
  if (request.consent?.purpose !== 'diagnostic-guidance' || request.consent?.scope !== 'request-only' || request.consent?.observationCapture !== 'request-only') throw parentJourneyError('invalid_consent_boundary', 'Consent must be request-only diagnostic guidance.');
  const prohibitedField = findProhibitedField(request);
  if (prohibitedField) throw parentJourneyError('private_data_not_allowed', `Private or persistent field is not allowed: ${prohibitedField}.`);
  validateEvidenceTopics(graph, request.diagnosticEvents ?? []);
  validateEvidenceTopics(graph, request.recheckEvents ?? []);
};
```

- [ ] **Step 9: Verify GREEN and commit**

Run:

```powershell
node --test --test-name-pattern="parent journey|parent outcome|reviewed household activity" scripts/easefactor-reference.test.mjs
npm run test:easefactor
git add -- scripts/easefactor-reference.mjs scripts/easefactor-reference.test.mjs
git diff --cached --check
git commit -m "feat: add parent companion fractions journey"
```

Expected: focused and full reference tests pass with 0 failures; commit succeeds.

---

### Task 2: Local HTTP Endpoint

**Files:**

- Modify: `scripts/easefactor-api.test.mjs`
- Modify: `scripts/easefactor-api.mjs`

**Interfaces:**

- Consumes: `buildParentCompanionJourney(graph, request)` and its `.code` errors.
- Produces: `POST /companion/v1/parent-journey`.

- [ ] **Step 1: Write the failing endpoint success test**

Copy `makeParentJourneyRequest` into the API test file, then add:

```js
test('POST /companion/v1/parent-journey returns the deterministic parent journey', async () => {
  await withServer(async (baseUrl) => {
    const request = makeParentJourneyRequest();
    const firstResponse = await fetch(`${baseUrl}/companion/v1/parent-journey`, {method: 'POST', headers: {'content-type': 'application/json'}, body: JSON.stringify(request)});
    const secondResponse = await fetch(`${baseUrl}/companion/v1/parent-journey`, {method: 'POST', headers: {'content-type': 'application/json'}, body: JSON.stringify(request)});
    const first = await firstResponse.json();
    const second = await secondResponse.json();
    assert.equal(firstResponse.status, 200);
    assert.deepEqual(first, second);
    assert.equal(first.foundationalGap.topicId, 'mt_Kr3IyA6m-O');
    assert.equal(first.activity.review.status, 'reviewed');
    assert.equal(first.recheck.status, 'improved');
    assert.equal(first.parentOutcome.status, 'passed');
    assert.equal(first.privacy.persistence, 'none');
  });
});
```

- [ ] **Step 2: Verify RED**

Run `node --test --test-name-pattern="deterministic parent journey" scripts/easefactor-api.test.mjs`.

Expected: FAIL with `404 !== 200`.

- [ ] **Step 3: Add the route and typed HTTP mapping**

Import `buildParentCompanionJourney`, then add:

```js
const parentJourneyErrorStatus = {unsupported_parent_journey_context: 400, invalid_consent_boundary: 400, synthetic_evidence_required: 400, private_data_not_allowed: 400, invalid_parent_journey_evidence: 400, invalid_reviewed_activity: 500};
const handleParentJourneyError = (res, error, taxonomyVersion) => {
  if (handleKnownGraphError(res, error)) return true;
  const statusCode = parentJourneyErrorStatus[error?.code];
  if (!statusCode) return false;
  sendError(res, statusCode, error.code, error.message, {taxonomyVersion});
  return true;
};
```

Add first in `routePost`:

```js
if (pathParts.length === 3 && pathParts.join('/') === 'companion/v1/parent-journey') {
  const request = await readSyntheticMasteryRequest(req, res);
  if (request === null) return;
  try {
    sendJson(res, 200, buildParentCompanionJourney(graph, request));
  } catch (error) {
    if (handleParentJourneyError(res, error, release.taxonomyVersion)) return;
    sendError(res, 400, 'invalid_parent_journey_request', error.message, {taxonomyVersion: release.taxonomyVersion});
  }
  return;
}
```

- [ ] **Step 4: Verify GREEN**

Run `node --test --test-name-pattern="deterministic parent journey" scripts/easefactor-api.test.mjs`.

Expected: PASS.

- [ ] **Step 5: Write typed boundary tests**

Add these exact tests:

```js
test('POST parent journey rejects unsupported, non-consented, non-synthetic, and private requests', async () => {
  await withServer(async (baseUrl) => {
    const cases = [
      {patch: {context: {...makeParentJourneyRequest().context, language: 'hi-IN'}}, code: 'unsupported_parent_journey_context'},
      {patch: {consent: {...makeParentJourneyRequest().consent, scope: 'persistent'}}, code: 'invalid_consent_boundary'},
      {patch: {evidenceMode: 'production'}, code: 'synthetic_evidence_required'},
      {patch: {learnerId: 'child-123'}, code: 'private_data_not_allowed'},
      {patch: {storage: true}, code: 'private_data_not_allowed'},
    ];
    for (const {patch, code} of cases) {
      const response = await fetch(`${baseUrl}/companion/v1/parent-journey`, {method: 'POST', headers: {'content-type': 'application/json'}, body: JSON.stringify(makeParentJourneyRequest(patch))});
      const body = await response.json();
      assert.equal(response.status, 400, code);
      assert.equal(body.error.code, code);
    }
  });
});

test('POST parent journey returns unknown topic, malformed JSON, and body-size errors', async () => {
  await withServer(async (baseUrl) => {
    const unknown = await fetch(`${baseUrl}/companion/v1/parent-journey`, {method: 'POST', headers: {'content-type': 'application/json'}, body: JSON.stringify(makeParentJourneyRequest({diagnosticEvents: [{topicId: 'mt_missing', result: 'partial'}]}))});
    assert.equal(unknown.status, 404);
    assert.equal((await unknown.json()).error.code, 'unknown_topic_id');

    const malformed = await fetch(`${baseUrl}/companion/v1/parent-journey`, {method: 'POST', headers: {'content-type': 'application/json'}, body: '{"context":'});
    assert.equal(malformed.status, 400);
    assert.equal((await malformed.json()).error.code, 'invalid_json');

    const oversized = await fetch(`${baseUrl}/companion/v1/parent-journey`, {method: 'POST', headers: {'content-type': 'application/json'}, body: JSON.stringify({padding: 'x'.repeat((1024 * 1024) + 1)})});
    assert.equal(oversized.status, 413);
    assert.equal((await oversized.json()).error.code, 'request_body_too_large');
  });
});
```

- [ ] **Step 6: Verify RED then GREEN and commit**

Run the focused test before any required mapping correction, make only the minimal route/error change, then run:

```powershell
node --test --test-name-pattern="parent journey" scripts/easefactor-api.test.mjs
npm run test:easefactor-api
git add -- scripts/easefactor-api.mjs scripts/easefactor-api.test.mjs
git diff --cached --check
git commit -m "feat: expose parent companion journey endpoint"
```

Expected: all focused and full API tests pass with 0 failures; commit succeeds.

---

### Task 3: Documentation and Roadmap Status

**Files:**

- Modify: `docs/easefactor-reference-slice.md`
- Modify: `docs/easefactor-product-roadmap.md`

**Interfaces:**

- Consumes: the implemented endpoint and exact boundaries from Tasks 1-2.
- Produces: runnable reference documentation and honest capability status.

- [ ] **Step 1: Document the runnable endpoint**

Add a `Parent companion demo endpoint` subsection under `## Local API` with:

````markdown
```http
POST /companion/v1/parent-journey
```

This fixed reference journey covers reviewed CBSE/NCERT Class 6 Mathematics
fraction comparison. It accepts only synthetic diagnostic and recheck evidence,
requires request-only diagnostic-guidance consent, rejects private identifiers
and persistence requests, and stores nothing.

```text
plain-language concern -> short diagnostic -> foundational gap
  -> explanation -> remediation -> reviewed household activity
  -> separate recheck -> parent comprehension/action outcome
```
````

Document the exact context and consent values, compact synthetic request, outcome statuses, and typed errors. State that this is not authentication, consent administration, storage, production UI, or generalized curriculum routing.

- [ ] **Step 2: Update capability and Phase 1 status**

Replace the parent companion matrix row with:

```markdown
| Synthetic parent companion journey contract | `reference-only` | Shared learning intelligence | Fixed Class 6 Fractions slice; request-local synthetic evidence |
| Production parent companion experience | `planned` | EaseFactor | Product UI, private storage, consent operation, and broader routing remain product-owned |
```

In Phase 1, mark plain-language concern, diagnostic, evidence-backed gap, explanation, remediation, reviewed activity, separate recheck, and parent outcome as demonstrated by the reference contract. Keep observation storage, production consent, UI, authentication, weekly summaries, and broader routing planned.

- [ ] **Step 3: Verify docs and commit**

Run:

```powershell
rg -n "parent-journey|fraction-size-comparison|request-only|reference-only|planned" docs/easefactor-reference-slice.md docs/easefactor-product-roadmap.md
rg -n -i "child name|parent name|email|phone|address|chapter text|exercise text|syllabus text|upstream standard text" docs/easefactor-reference-slice.md docs/easefactor-product-roadmap.md
git diff --check
npm run validate
npm run test:easefactor
npm run test:easefactor-api
git add -- docs/easefactor-reference-slice.md docs/easefactor-product-roadmap.md
git diff --cached --check
git commit -m "docs: publish parent companion reference contract"
```

Expected: documentation truth checks are manually clean; validator and both suites pass; commit succeeds.

---

### Task 4: Full Verification and Handoff

**Files:** Verify all six modified implementation and documentation files.

**Interfaces:** Consumes Tasks 1-3 and produces fresh release evidence.

- [ ] **Step 1: Run the complete release gate**

```powershell
npm run validate
npm run test:easefactor
npm run test:easefactor-api
```

Expected: validator reports 1,590 topics, 3,221 dependencies, 3,311 standards, 94 alignments, and 183 clusters; both suites report 0 failures. Record actual test counts.

- [ ] **Step 2: Prove data, schema, dependencies, and lockfiles did not change**

```powershell
git diff 17364f3..HEAD -- data schema package.json package-lock.json
```

Expected: no output.

- [ ] **Step 3: Inspect the scoped diff and repository state**

```powershell
git diff 17364f3..HEAD -- scripts/easefactor-reference.mjs scripts/easefactor-reference.test.mjs scripts/easefactor-api.mjs scripts/easefactor-api.test.mjs docs/easefactor-reference-slice.md docs/easefactor-product-roadmap.md
git diff --check 17364f3..HEAD
git status --short
git log -4 --oneline
```

Expected: only approved journey, tests, and docs; no whitespace errors; clean repository; design plus three implementation commits in recent history.

- [ ] **Step 4: Prepare the handoff**

Report the fixed topic chain, endpoint, request-only synthetic/consent boundary, reviewed household activity, separate recheck, parent outcome statuses, explicit production exclusions, fresh verification counts, final status, and commit IDs.
