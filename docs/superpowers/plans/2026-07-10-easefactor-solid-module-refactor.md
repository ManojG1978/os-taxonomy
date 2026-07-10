# EaseFactor SOLID Module Refactor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the two large EaseFactor implementation files and their two large test files with cohesive, dependency-free modules while preserving every current CLI and HTTP behavior.

**Architecture:** Keep `scripts/easefactor-reference.mjs` and `scripts/easefactor-api.mjs` as thin composition roots. Move release, graph, learner, content, planner, companion, and HTTP responsibilities into focused modules under `scripts/easefactor/`; use injected services in feature route factories and enforce dependency direction with a repository-local architecture test.

**Tech Stack:** Node.js 22 ES modules, `node:http`, `node:test`, `node:assert/strict`, and repository-local JSON data; no third-party runtime or test dependency.

## Global Constraints

- Keep the refactor behavior-preserving: retain every current endpoint, method, response field, HTTP status, error code/message/details object, ordering rule, request-size limit, `createEaseFactorApiServer` contract, and CLI output.
- Preserve coverage of all 60 baseline behavior cases: 28 reference cases and 32 API cases.
- Preserve synthetic request-only evidence and no-persistence boundaries.
- Add no framework, runtime dependency, build tooling, generated lockfile, or class hierarchy.
- Change no released taxonomy JSON, schema, manifest, license, or provenance content.
- Keep domain modules independent of `api/`, composition roots, and `node:http`.
- Use dependency-free architecture checks rather than subjective line-count gates.
- Run the relevant characterization tests after every extraction and the full verification gate before completion.

---

## Target File Map

### Composition roots

- `scripts/easefactor-reference.mjs`: reference exports and executable CLI wiring only.
- `scripts/easefactor-api.mjs`: server construction, injected service wiring, and executable host/port wiring only.

### Domain modules

- `scripts/easefactor/release/load-release.mjs`: release file loading, hashing, manifest checksum, and count checks.
- `scripts/easefactor/graph/traversal.mjs`: breadth-first dependency traversal.
- `scripts/easefactor/graph/graph-store.mjs`: topic lookup, prerequisite/unlock indexes, and curriculum graph views.
- `scripts/easefactor/learner/mastery.mjs`: evidence normalization and mastery derivation.
- `scripts/easefactor/learner/readiness.mjs`: hard-prerequisite readiness.
- `scripts/easefactor/learner/learning-gaps.mjs`: deterministic blocker ranking.
- `scripts/easefactor/learner/mastery-summary.mjs`: topic-filtered mastery summary.
- `scripts/easefactor/content/content-mappings.mjs`: mapping validation.
- `scripts/easefactor/content/content-selection.mjs`: content indexing, predicates, ordering, and summaries.
- `scripts/easefactor/planner/next-best-topics.mjs`: deterministic recommendation scoring.
- `scripts/easefactor/planner/remediation-plan.mjs`: remediation step construction.
- `scripts/easefactor/planner/diagnostic-plan.mjs`: diagnostic step construction.
- `scripts/easefactor/companion/parent-journey-contract.mjs`: fixed request boundary and typed journey errors.
- `scripts/easefactor/companion/parent-journey-content.mjs`: reviewed journey constants and household activity validation.
- `scripts/easefactor/companion/parent-journey.mjs`: journey orchestration and outcome construction.

### HTTP modules

- `scripts/easefactor/api/http-response.mjs`: JSON response and error envelopes.
- `scripts/easefactor/api/request-body.mjs`: streaming JSON body parsing and normalized body errors.
- `scripts/easefactor/api/query.mjs`: query coercion, integer parsing, and pagination.
- `scripts/easefactor/api/errors.mjs`: domain-to-HTTP mappings.
- `scripts/easefactor/api/taxonomy-presenter.mjs`: release/catalog filtering, projection, and coverage views.
- `scripts/easefactor/api/router.mjs`: descriptor matching, 404, 405, and internal-error boundary.
- `scripts/easefactor/api/routes/*.mjs`: taxonomy, learner, planner, and companion HTTP adapters.

### Test support

- `scripts/easefactor/reference-fixtures.test-helper.mjs`: release fixture creation only.
- `scripts/easefactor/api/test-server.test-helper.mjs`: local server lifecycle and JSON request helpers only.
- `scripts/easefactor/reference.test-suite.mjs`: deterministic imports for domain/reference tests.
- `scripts/easefactor/api.test-suite.mjs`: deterministic imports for API contract tests.
- `scripts/easefactor/architecture-rules.mjs`: import graph and boundary rule analyzer.
- `scripts/easefactor/architecture.test.mjs`: analyzer unit tests and live repository boundary check.

---

### Task 1: Split and Preserve the Characterization Suite

**Files:**
- Create: `scripts/easefactor/reference-fixtures.test-helper.mjs`
- Create: `scripts/easefactor/release/load-release.test.mjs`
- Create: `scripts/easefactor/graph/graph-store.test.mjs`
- Create: `scripts/easefactor/learner/learner-state.test.mjs`
- Create: `scripts/easefactor/planner/planning.test.mjs`
- Create: `scripts/easefactor/companion/parent-journey.test.mjs`
- Create: `scripts/easefactor/reference-cli.test.mjs`
- Create: `scripts/easefactor/reference.test-suite.mjs`
- Create: `scripts/easefactor/api/test-server.test-helper.mjs`
- Create: `scripts/easefactor/api/routes/companion-routes.test.mjs`
- Create: `scripts/easefactor/api/routes/taxonomy-routes.test.mjs`
- Create: `scripts/easefactor/api/routes/planner-routes.test.mjs`
- Create: `scripts/easefactor/api/routes/learner-routes.test.mjs`
- Create: `scripts/easefactor/api.test-suite.mjs`
- Move: `scripts/easefactor-parent-journey-fixture.test-helper.mjs` to `scripts/easefactor/companion/parent-journey-fixture.test-helper.mjs`
- Delete: `scripts/easefactor-reference.test.mjs`
- Delete: `scripts/easefactor-api.test.mjs`
- Modify: `package.json`

**Interfaces:**
- Consumes: current exports from `scripts/easefactor-reference.mjs` and `createEaseFactorApiServer()` from `scripts/easefactor-api.mjs`.
- Produces: two suite entrypoints that execute exactly 28 reference tests and 32 API tests.

- [ ] **Step 1: Record the existing baseline**

Run:

```powershell
npm run validate
npm run test:easefactor
npm run test:easefactor-api
```

Expected: validation succeeds; reference reports `tests 28`, `pass 28`; API reports `tests 32`, `pass 32`.

- [ ] **Step 2: Extract the shared release fixture helper**

Move `fixtureDataFiles`, `makeReleaseFixture`, and `setManifestCountAndGetFixture` from the old reference test into `reference-fixtures.test-helper.mjs` with these complete exports:

```js
import {copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';

export const fixtureDataFiles = [
  'manifest.json',
  'topics.json',
  'dependencies.json',
  'curriculum-standards.json',
  'curriculum-alignments.json',
  'clusters.json',
];

export const makeReleaseFixture = () => {
  const rootDir = mkdtempSync(join(tmpdir(), 'easefactor-reference-'));
  const sourceDataDir = join(process.cwd(), 'data');
  const fixtureDataDir = join(rootDir, 'data');
  mkdirSync(fixtureDataDir, {recursive: true});
  for (const fileName of fixtureDataFiles) {
    copyFileSync(join(sourceDataDir, fileName), join(fixtureDataDir, fileName));
  }
  return {
    rootDir,
    cleanup: () => rmSync(rootDir, {recursive: true, force: true}),
  };
};

export const setManifestCountAndGetFixture = (countKey, nextCount) => {
  const fixture = makeReleaseFixture();
  const manifestPath = join(fixture.rootDir, 'data', 'manifest.json');
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
  manifest.counts = {...manifest.counts, [countKey]: nextCount};
  writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
  return fixture;
};
```

- [ ] **Step 3: Split reference tests by the names below**

Copy each complete existing `test(...)` block unchanged, then replace only its imports:

```text
release/load-release.test.mjs
  imports a full release and verifies manifest provenance
  loadTaxonomyRelease verifies curricula manifest count
  loadTaxonomyRelease verifies curriculumStandards manifest count
  loadTaxonomyRelease verifies clusters manifest count

graph/graph-store.test.mjs
  builds a graph store with prerequisite and unlock traversal
  builds strict curriculum rows and includes expected topic
  learningGraphView includes aligned and prerequisite roles
  getUnlocks is reverse of dependencies
  unknown topic id throws a stable typed error

learner/learner-state.test.mjs
  deriveMasteryState classifies secure and developing evidence and keeps latest observedAt
  checkReadiness blocks learning when hard prerequisites are unseen
  findLearningGaps ranks weakest evidence first

planner/planning.test.mjs
  buildRemediationPlan converts blocked hard prerequisites into ordered repair steps
  validateContentMappings accepts synthetic mappings and rejects unknown topics
  recommendNextBestTopics returns a curriculum-linked recommendation with served content
  recommendNextBestTopics marks missing reviewed content as unservable
  recommendNextBestTopics does not return non-recommendable rows when includeReview is false
  recommendNextBestTopics keeps high-confidence developing topics when includeReview is false

companion/parent-journey.test.mjs
  buildParentCompanionJourney returns the complete reviewed fractions journey
  parent journey returns not enough information without number-line evidence
  parent journey is deterministic and keeps diagnostic and recheck evidence separate
  reviewed household activity normalizes draft, unknown-topic, and invalid-mapping failures
  parent outcome requires both comprehension and action answers
  parent journey requires fixed context, synthetic mode, request-only consent, and no private fields
  parent journey types missing and invalid context and consent before field allowlisting
  parent journey rejects malformed evidence with one normalized error
  parent journey ordering and output are identical across process timezones

reference-cli.test.mjs
  CLI --demo emits a valid recommendation payload
```

Each file begins with only the built-ins, fixture helpers, and reference exports its listed tests use. Update relative paths to the composition root, for example:

```js
import {deriveMasteryState} from '../../easefactor-reference.mjs';
```

- [ ] **Step 4: Extract the API test helper and split API cases**

Create the helper with the exact server lifecycle currently used by the API test:

```js
import {createEaseFactorApiServer} from '../../easefactor-api.mjs';

export const withServer = async (run) => {
  const server = createEaseFactorApiServer();
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const {port} = server.address();
  try {
    await run(`http://127.0.0.1:${port}`);
  } finally {
    await new Promise((resolve, reject) => {
      server.close((error) => error ? reject(error) : resolve());
    });
  }
};

export const getJson = async (baseUrl, path) => {
  const response = await fetch(`${baseUrl}${path}`);
  return {status: response.status, body: await response.json()};
};
```

Move complete test blocks unchanged into route-family files:

```text
companion-routes.test.mjs: API tests 1-5
taxonomy-routes.test.mjs: API tests 6-15
planner-routes.test.mjs: API tests 16-23 and 32
learner-routes.test.mjs: API tests 24-31
```

- [ ] **Step 5: Add explicit suite entrypoints and update package scripts**

```js
// scripts/easefactor/reference.test-suite.mjs
import './release/load-release.test.mjs';
import './graph/graph-store.test.mjs';
import './learner/learner-state.test.mjs';
import './planner/planning.test.mjs';
import './companion/parent-journey.test.mjs';
import './reference-cli.test.mjs';
```

```js
// scripts/easefactor/api.test-suite.mjs
import './api/routes/companion-routes.test.mjs';
import './api/routes/taxonomy-routes.test.mjs';
import './api/routes/planner-routes.test.mjs';
import './api/routes/learner-routes.test.mjs';
```

Set the two package commands exactly:

```json
"test:easefactor": "node --test scripts/easefactor/reference.test-suite.mjs",
"test:easefactor-api": "node --test scripts/easefactor/api.test-suite.mjs"
```

- [ ] **Step 6: Verify the split is behavior-neutral**

Run both package test commands. Expected: exactly 28/28 and 32/32 pass with the same test names as the baseline.

- [ ] **Step 7: Commit**

```powershell
git add -- package.json scripts/easefactor scripts/easefactor-reference.test.mjs scripts/easefactor-api.test.mjs scripts/easefactor-parent-journey-fixture.test-helper.mjs
git commit -m "test: split EaseFactor characterization suites"
```

---

### Task 2: Add Enforceable Architecture Rules

**Files:**
- Create: `scripts/easefactor/architecture-rules.mjs`
- Create: `scripts/easefactor/architecture.test.mjs`
- Modify: `scripts/easefactor/reference.test-suite.mjs`

**Interfaces:**
- Produces: `analyzeArchitecture(rootDir) -> {graph: Map<string, string[]>, violations: string[]}` and `findCycles(graph) -> string[][]`.

- [ ] **Step 1: Write failing analyzer tests**

Use temporary fixture modules to assert that a domain-to-API import, a three-file cycle, and `node:http` in a learner module are reported. Assert that the live production modules currently present under `scripts/easefactor/` return no violations; later tasks automatically expand this live check as modules are added.

```js
test('findCycles reports a closed three-module cycle', () => {
  const graph = new Map([
    ['a.mjs', ['b.mjs']],
    ['b.mjs', ['c.mjs']],
    ['c.mjs', ['a.mjs']],
  ]);
  assert.deepEqual(findCycles(graph), [['a.mjs', 'b.mjs', 'c.mjs', 'a.mjs']]);
});
```

- [ ] **Step 2: Run the focused test and confirm red**

Run: `node --test scripts/easefactor/architecture.test.mjs`

Expected: FAIL because `architecture-rules.mjs` does not exist or its exports are missing.

- [ ] **Step 3: Implement the dependency-free analyzer**

Parse static relative `import ... from` and side-effect imports, resolve `.mjs` paths, build an adjacency map, and return stable sorted violations. Enforce:

```js
const rules = {
  domainCannotImportApi: true,
  noCompositionRootImportsBelowRoot: true,
  nodeHttpAllowed: new Set(),
  taxonomyFileAccessAllowed: new Set(['release/load-release.mjs']),
  rejectCycles: true,
};
```

Production analysis excludes `.test.mjs`, `.test-helper.mjs`, and `.test-suite.mjs` files.

- [ ] **Step 4: Add the architecture test to the reference suite**

```js
import './architecture.test.mjs';
```

- [ ] **Step 5: Run focused and aggregate tests**

Expected: analyzer fixture tests pass; the reference suite still reports its 28 behavior cases plus the architecture checks.

- [ ] **Step 6: Commit**

```powershell
git add -- scripts/easefactor/architecture-rules.mjs scripts/easefactor/architecture.test.mjs scripts/easefactor/reference.test-suite.mjs
git commit -m "test: enforce EaseFactor module boundaries"
```

---

### Task 3: Extract Release Loading and Graph Storage

**Files:**
- Create: `scripts/easefactor/release/load-release.mjs`
- Create: `scripts/easefactor/graph/traversal.mjs`
- Create: `scripts/easefactor/graph/graph-store.mjs`
- Modify: `scripts/easefactor-reference.mjs`

**Interfaces:**
- Produces: `loadTaxonomyRelease(rootDir = process.cwd()) -> release`.
- Produces: `traverseGraph(startTopicId, getEdgeTarget, edgesBySource, maxDepth) -> traversal rows`.
- Produces: `makeGraphStore(release) -> {getTopic, getPrerequisites, getUnlocks, getCurriculumTopics, learningGraphView, taxonomyVersion}`.

- [ ] **Step 1: Run release and graph characterization tests**

Run the two focused test files. Expected: 9 tests pass against the legacy module.

- [ ] **Step 2: Move release loading unchanged**

Move `readJson`, `sha256`, `assertManifestChecksum`, `assertCount`, and `loadTaxonomyRelease` into `release/load-release.mjs`. Keep Node filesystem and crypto imports only there.

- [ ] **Step 3: Move graph traversal and storage unchanged**

Rename the private `traversal` export at its new boundary:

```js
export const traverseGraph = (startTopicId, getEdgeTarget, edgesBySource, maxDepth) => {
  const out = [];
  const visited = new Set([startTopicId]);
  let frontier = [startTopicId];
  let depth = 0;
  while (frontier.length && depth < maxDepth) {
    depth += 1;
    const next = [];
    for (const topicId of frontier) {
      for (const edge of edgesBySource[topicId] ?? []) {
        const nextId = getEdgeTarget(edge);
        if (visited.has(nextId)) continue;
        visited.add(nextId);
        out.push({
          topicId: nextId,
          strength: edge.strength,
          reason: edge.reason ?? null,
          distance: depth,
        });
        next.push(nextId);
      }
    }
    frontier = next;
  }
  return out;
};
```

Import it in `graph-store.mjs`, move `makeGraphStore`, and replace both calls from `traversal(...)` to `traverseGraph(...)`.

- [ ] **Step 4: Re-export the public contracts from the composition root**

```js
export {loadTaxonomyRelease} from './easefactor/release/load-release.mjs';
export {makeGraphStore} from './easefactor/graph/graph-store.mjs';
```

Use local imports of the same functions for CLI wiring.

- [ ] **Step 5: Run focused, aggregate, and architecture tests**

Expected: release/graph cases and all 28 reference behavior cases pass; architecture rules report no new violation.

- [ ] **Step 6: Commit**

```powershell
git add -- scripts/easefactor-reference.mjs scripts/easefactor/release scripts/easefactor/graph
git commit -m "refactor: extract EaseFactor release and graph modules"
```

---

### Task 4: Extract Learner and Content Primitives

**Files:**
- Create: `scripts/easefactor/learner/mastery.mjs`
- Create: `scripts/easefactor/learner/readiness.mjs`
- Create: `scripts/easefactor/learner/learning-gaps.mjs`
- Create: `scripts/easefactor/learner/mastery-summary.mjs`
- Create: `scripts/easefactor/content/content-mappings.mjs`
- Create: `scripts/easefactor/content/content-selection.mjs`
- Modify: `scripts/easefactor-reference.mjs`
- Modify: `scripts/easefactor-api.mjs`

**Interfaces:**
- Produces: `deriveMasteryState(events = []) -> Map<topicId, masteryState>` and `isSecureEnough(masteryState) -> boolean`.
- Produces: `checkReadiness(graph, masteryByTopic, topicId) -> readiness`.
- Produces: `findLearningGaps(graph, masteryByTopic, topicId) -> gap response`.
- Produces: `buildMasterySummary(graph, request = {}) -> summary`.
- Produces: content validation, index, selection predicates, summaries, safe numeric coercion, and duration estimates used by planners.

- [ ] **Step 1: Run learner and planner characterization tests**

Expected: learner-state and planning files pass before extraction.

- [ ] **Step 2: Extract mastery, readiness, and gaps**

Move the current helpers with the smallest useful visibility. After the move,
the public module boundaries must be exactly:

```js
// mastery.mjs
export {deriveMasteryState, isSecureEnough};

// readiness.mjs
export {checkReadiness};

// learning-gaps.mjs
export {findLearningGaps};
```

Keep `normalizeConfidence`, evidence sorting, default confidence, and mastery lookup private to the module that owns them unless another module actually imports them.

- [ ] **Step 3: Move mastery-summary behavior out of the API**

Move `normalizeTopicIdFilter` and `buildMasterySummary` unchanged into `learner/mastery-summary.mjs`; import `deriveMasteryState` there. Export only `buildMasterySummary`.

- [ ] **Step 4: Extract content contracts and selection helpers**

`content-mappings.mjs` exports `validateContentMappings`. `content-selection.mjs` exports exactly the helpers needed by planner modules:

```js
export {
  buildContentIndex,
  buildContentSummary,
  estimateMinutes,
  isAssessableDiagnosticContent,
  isReviewedTeachingContent,
  isServableRemediationContent,
  safeNumber,
};
```

- [ ] **Step 5: Replace composition-root implementations with imports/re-exports**

Keep the current public reference export names unchanged. Update the API import of `buildMasterySummary` to its new module; do not change its response construction.

- [ ] **Step 6: Verify**

Run reference and API suites. Expected: all behavior cases pass, including mastery-summary filtering and unknown-topic errors.

- [ ] **Step 7: Commit**

```powershell
git add -- scripts/easefactor-reference.mjs scripts/easefactor-api.mjs scripts/easefactor/learner scripts/easefactor/content
git commit -m "refactor: extract EaseFactor learner and content modules"
```

---

### Task 5: Extract Planner Operations

**Files:**
- Create: `scripts/easefactor/planner/next-best-topics.mjs`
- Create: `scripts/easefactor/planner/remediation-plan.mjs`
- Create: `scripts/easefactor/planner/diagnostic-plan.mjs`
- Modify: `scripts/easefactor-reference.mjs`
- Modify: `scripts/easefactor-api.mjs`

**Interfaces:**
- Produces: `recommendNextBestTopics(graph, request = {})`.
- Produces: `buildRemediationPlan(graph, request = {})`.
- Produces: `buildDiagnosticPlan(graph, request = {})`.

- [ ] **Step 1: Run planner characterization tests**

Expected: six reference planner/content cases and nine API planner cases pass.

- [ ] **Step 2: Move each planner use case unchanged**

Import only the learner and content operations used by that file. Keep scoring helpers such as `buildReason` private to `next-best-topics.mjs`; keep explanation helpers private to their corresponding plan module.

- [ ] **Step 3: Replace root implementations with imports/re-exports**

```js
export {recommendNextBestTopics} from './easefactor/planner/next-best-topics.mjs';
export {buildRemediationPlan} from './easefactor/planner/remediation-plan.mjs';
export {buildDiagnosticPlan} from './easefactor/planner/diagnostic-plan.mjs';
```

- [ ] **Step 4: Verify planner outputs and architecture**

Run both suites and the architecture test. Expected: all recommendation scores, decision logs, plan steps, content summaries, and errors are unchanged.

- [ ] **Step 5: Commit**

```powershell
git add -- scripts/easefactor-reference.mjs scripts/easefactor-api.mjs scripts/easefactor/planner
git commit -m "refactor: extract EaseFactor planner modules"
```

---

### Task 6: Extract the Parent Companion Feature

**Files:**
- Create: `scripts/easefactor/companion/parent-journey-contract.mjs`
- Create: `scripts/easefactor/companion/parent-journey-content.mjs`
- Create: `scripts/easefactor/companion/parent-journey.mjs`
- Modify: `scripts/easefactor-reference.mjs`
- Modify: `scripts/easefactor-api.mjs`

**Interfaces:**
- Produces: `validateParentJourneyBoundary(graph, request)` and stable coded journey errors.
- Produces: `validateReviewedHouseholdActivity(graph, activity)` and `getReviewedParentJourneyContent()`.
- Produces: `buildParentCompanionJourney(graph, request = {})`.

- [ ] **Step 1: Run companion reference and API characterization tests**

Expected: nine reference and five API companion cases pass.

- [ ] **Step 2: Extract the fixed contract**

Move allowed-field sets, explicit-timezone validation, `assertOnlyFields`, evidence validation, fixed context, fixed concern, and boundary validation into `parent-journey-contract.mjs`. Export immutable accessors rather than mutable constants:

```js
export const getParentJourneyContext = () => structuredClone(parentJourneyContext);
export const getParentConcern = () => structuredClone(parentConcern);
```

- [ ] **Step 3: Extract reviewed content and validation**

Move diagnostic prompts, remediation steps, household activity, and activity validation into `parent-journey-content.mjs`:

```js
export const getReviewedParentJourneyContent = () => ({
  diagnosticPrompts: structuredClone(parentDiagnosticPrompts),
  remediationSteps: structuredClone(parentRemediationSteps),
  householdActivity: structuredClone(reviewedHouseholdActivity),
});
```

- [ ] **Step 4: Extract the orchestrator**

Move `buildParentOutcome` and `buildParentCompanionJourney` into `parent-journey.mjs`. Inject no HTTP values; import only contract, content, mastery, readiness/gap, and planner operations.

- [ ] **Step 5: Re-export public companion contracts and verify**

Run both suites. Expected: exact journey content/order, timezone determinism, privacy errors, activity errors, and no-persistence response are unchanged.

- [ ] **Step 6: Commit**

```powershell
git add -- scripts/easefactor-reference.mjs scripts/easefactor-api.mjs scripts/easefactor/companion
git commit -m "refactor: extract EaseFactor parent companion modules"
```

---

### Task 7: Extract HTTP Primitives and Taxonomy Presentation

**Files:**
- Create: `scripts/easefactor/api/http-response.mjs`
- Create: `scripts/easefactor/api/request-body.mjs`
- Create: `scripts/easefactor/api/query.mjs`
- Create: `scripts/easefactor/api/errors.mjs`
- Create: `scripts/easefactor/api/taxonomy-presenter.mjs`
- Modify: `scripts/easefactor-api.mjs`

**Interfaces:**
- Produces: `sendJson`, `sendError`, `errorBody`.
- Produces: `readJsonBody(req, {maxBytes = 1048576})` and `readJsonRequest(req, res)`.
- Produces: `parseQuery`, `parseNonNegativeInt`, and `paginate`.
- Produces: `sendMappedError(res, error, {fallbackCode, taxonomyVersion}) -> boolean`.
- Produces: catalog projection/filter functions consumed by taxonomy routes.

- [ ] **Step 1: Run the complete API characterization suite**

Expected: all 32 cases pass, including JSON error envelopes, malformed JSON,
the 1 MB request limit, pagination, filtering, and route-specific errors.

- [ ] **Step 2: Move HTTP mechanics without semantic edits**

Use these stable boundaries:

```js
export const errorBody = (code, message, details = undefined) => ({
  error: {code, message, ...(details === undefined ? {} : {details})},
});

export const parseNonNegativeInt = (value, fallback, {max = 1000} = {}) => {
  const parsed = Number.parseInt(value, 10);
  return !Number.isFinite(parsed) || parsed < 0 ? fallback : Math.min(parsed, max);
};
```

Preserve the existing pretty-printed JSON and `cache-control: no-store` header.

- [ ] **Step 3: Centralize error mappings without changing responses**

Map known graph and parent-journey codes in `errors.mjs`; accept the route-family fallback code so planner failures remain `invalid_planner_request` and learner failures remain `invalid_learner_request`.

- [ ] **Step 4: Move taxonomy projections and filters**

Move `releaseEnvelope`, topic/curriculum/standard/alignment/cluster filters, `standardRows`, `buildCoverage`, and set-value projection into `taxonomy-presenter.mjs`. Keep query coercion and pagination in `query.mjs`.

- [ ] **Step 5: Verify all API contracts**

Run `npm run test:easefactor-api`. Expected: all existing and added characterization cases pass.

- [ ] **Step 6: Commit**

```powershell
git add -- scripts/easefactor-api.mjs scripts/easefactor/api
git commit -m "refactor: extract EaseFactor HTTP primitives"
```

---

### Task 8: Replace Conditional Routers with Injected Route Families

**Files:**
- Create: `scripts/easefactor/api/router.mjs`
- Create: `scripts/easefactor/api/router.test.mjs`
- Create: `scripts/easefactor/api/routes/taxonomy-routes.mjs`
- Create: `scripts/easefactor/api/routes/learner-routes.mjs`
- Create: `scripts/easefactor/api/routes/planner-routes.mjs`
- Create: `scripts/easefactor/api/routes/companion-routes.mjs`
- Modify: `scripts/easefactor-api.mjs`
- Modify: `scripts/easefactor-reference.mjs`
- Modify: `scripts/easefactor/architecture.test.mjs`
- Modify: `scripts/easefactor/api.test-suite.mjs`

**Interfaces:**
- Route descriptor: `{method: 'GET'|'POST', match(pathParts) -> false|params, handle({req, res, url, pathParts, params}) -> Promise<void>|void}`.
- Produces: four `create*Routes(dependencies) -> routeDescriptor[]` factories.
- Produces: `createRouter({routes}) -> async (req, res) => void`.
- Preserves: `createEaseFactorApiServer({rootDir = process.cwd()} = {})`.

- [ ] **Step 1: Write router unit tests**

Test exact match selection, path parameters, unmatched `404`, unsupported-method `405`, and thrown-error `500` with in-memory request/response doubles.

```js
const route = {
  method: 'GET',
  match: (parts) => parts.join('/') === 'health' ? {} : false,
  handle: ({res}) => sendJson(res, 200, {ok: true}),
};
```

- [ ] **Step 2: Run router tests and confirm red**

Expected: FAIL because `createRouter` and route factories do not exist.

- [ ] **Step 3: Implement the small descriptor router**

The router parses the URL once, decodes path segments, selects descriptors by method and matcher, distinguishes known-path/wrong-method from unknown path, and wraps handler execution in the existing internal-error envelope.

Add the focused test to `api.test-suite.mjs`:

```js
import './api/router.test.mjs';
```

- [ ] **Step 4: Move endpoints into feature factories**

Construct factories with narrow dependencies:

```js
createTaxonomyRoutes({release, graph, presenter})
createLearnerRoutes({graph, deriveMasteryState, buildMasterySummary, checkReadiness, findLearningGaps})
createPlannerRoutes({graph, deriveMasteryState, recommendNextBestTopics, buildRemediationPlan, buildDiagnosticPlan})
createCompanionRoutes({graph, taxonomyVersion, buildParentCompanionJourney})
```

Each descriptor preserves the current path matching and response construction. Do not import either composition root from a route module.

- [ ] **Step 5: Reduce the API entrypoint to composition**

```js
export const createEaseFactorApiServer = ({rootDir = process.cwd()} = {}) => {
  const release = loadTaxonomyRelease(rootDir);
  const graph = makeGraphStore(release);
  const taxonomyPresenter = {
    buildCoverage,
    filterAlignments,
    filterClusters,
    filterCurricula,
    filterStandards,
    filterTopics,
    releaseEnvelope,
  };
  const routes = [
    ...createTaxonomyRoutes({release, graph, presenter: taxonomyPresenter}),
    ...createLearnerRoutes({
      graph,
      deriveMasteryState,
      buildMasterySummary,
      checkReadiness,
      findLearningGaps,
    }),
    ...createPlannerRoutes({
      graph,
      deriveMasteryState,
      recommendNextBestTopics,
      buildRemediationPlan,
      buildDiagnosticPlan,
    }),
    ...createCompanionRoutes({
      graph,
      taxonomyVersion: release.taxonomyVersion,
      buildParentCompanionJourney,
    }),
  ];
  return createServer(createRouter({routes}));
};
```

Retain the current direct-execution host/port block unchanged.

- [ ] **Step 6: Reduce the reference entrypoint to exports and CLI composition**

Delete all remaining domain implementation bodies. Keep explicit re-exports of the current public functions plus the existing CLI goal, fixture, and output construction.

- [ ] **Step 7: Tighten the live architecture assertion**

Remove any temporary legacy allowances. Assert `analyzeArchitecture(resolve('scripts/easefactor')).violations` is exactly `[]` and that neither composition root contains route/domain function declarations other than its exported server factory and CLI wiring.

- [ ] **Step 8: Run all tests**

Expected: domain/reference suite, architecture checks, and all API contracts pass with unchanged behavior.

- [ ] **Step 9: Commit**

```powershell
git add -- scripts/easefactor-api.mjs scripts/easefactor-reference.mjs scripts/easefactor/api scripts/easefactor/architecture.test.mjs
git commit -m "refactor: compose EaseFactor routes from focused modules"
```

---

### Task 9: Document and Verify the Completed Refactor

**Files:**
- Modify: `docs/easefactor-reference-slice.md`
- Modify: `package.json` only if final suite wiring needs correction

**Interfaces:**
- Produces: reader-facing module map, responsibility/dependency explanation, extension guidance, and exact verification commands.

- [ ] **Step 1: Update the reference-slice documentation**

Add a concise “Implementation structure” section containing the final module groups and these rules:

```text
- Released JSON is read only by the release loader.
- Domain modules do not depend on HTTP.
- Route families translate HTTP contracts and receive domain operations through factories.
- The two top-level scripts are executable composition roots.
- architecture.test.mjs enforces imports and cycles.
```

Keep the local reference-only, synthetic, and no-persistence framing unchanged.

- [ ] **Step 2: Run the full verification gate**

```powershell
npm run validate
npm run test:easefactor
npm run test:easefactor-api
node scripts/easefactor-reference.mjs
node scripts/easefactor-reference.mjs --demo | Out-Null
git diff --check
```

Expected:

- validation succeeds with 1,590 topics, 3,221 dependencies, 3,311 standards, 94 alignments, and 183 clusters;
- all reference/domain behavior and architecture tests pass;
- all 32 baseline API behaviors plus any added characterization assertions pass;
- default CLI prints the learning graph summary;
- demo CLI exits zero with valid JSON; and
- `git diff --check` prints nothing.

- [ ] **Step 3: Audit scope and repository state**

```powershell
git diff --name-only HEAD~8..HEAD
git status --short
```

Confirm no files under `data/` or `schema/` and no manifest, license, or provenance files changed. Confirm the worktree is clean except for the documentation update being committed in the next step.

- [ ] **Step 4: Commit**

```powershell
git add -- docs/easefactor-reference-slice.md package.json
git commit -m "docs: explain EaseFactor module boundaries"
```

- [ ] **Step 5: Final verification after commit**

Run the three npm commands and `git status --short` again. Expected: all commands succeed and the worktree is clean.
