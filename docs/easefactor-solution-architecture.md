# EaseFactor Solution Architecture

This document explains how the runnable EaseFactor reference slice is
structured in this repository. It describes implementation boundaries and
data flow; it is not a production deployment design.

For the behavior contract and runnable examples, see
[EaseFactor Reference Slice](easefactor-reference-slice.md). For the design
rationale and refactor history, see the
[SOLID module-refactor design](superpowers/specs/2026-07-10-easefactor-solid-module-refactor-design.md)
and the [implementation plan](superpowers/plans/2026-07-10-easefactor-solid-module-refactor.md).

## Architectural Shape

The solution has two executable composition roots over shared, pure reference
operations:

```text
scripts/easefactor-reference.mjs  ─┐
                                   ├─ release → graph → learner/content
scripts/easefactor-api.mjs        ─┘                         ↓
                                      planner / companion operations
                                                ↓
                                      HTTP route-family adapters
```

The top-level scripts assemble dependencies and preserve the command-line and
local-server entrypoints. Domain modules do not import HTTP or the composition
roots.

## Composition Roots

| Entry point | Role | Reference |
|---|---|---|
| `scripts/easefactor-reference.mjs` | Re-exports the public reference functions and runs the default or `--demo` CLI. | [reference entrypoint](../scripts/easefactor-reference.mjs) |
| `scripts/easefactor-api.mjs` | Loads the release, constructs the graph and services, creates route descriptors, and starts the Node HTTP server. | [API entrypoint](../scripts/easefactor-api.mjs) |

These files should remain wiring-oriented. New domain behavior belongs under
the relevant `scripts/easefactor/` group and is then injected into a route
factory only when an HTTP contract is required.

## Domain Modules

### Release loading

[`release/load-release.mjs`](../scripts/easefactor/release/load-release.mjs)
is the only module that reads released taxonomy JSON. It loads the manifest and
source files, computes SHA-256 hashes, and verifies manifest checksums and
counts before returning an in-memory release object.

### Graph storage

[`graph/traversal.mjs`](../scripts/easefactor/graph/traversal.mjs) owns bounded
prerequisite/unlock traversal.

[`graph/graph-store.mjs`](../scripts/easefactor/graph/graph-store.mjs) builds
topic and dependency indexes and exposes:

- `getTopic(topicId)`;
- `getPrerequisites(topicId, {depth})`;
- `getUnlocks(topicId, {depth})`; and
- `getCurriculumTopics(query)` / `learningGraphView(query)`.

Unknown topic IDs are rejected here so all consumers receive the same stable
`unknown_topic_id` behavior.

### Learner state

The learner group contains request-local evidence logic:

- [`learner/mastery.mjs`](../scripts/easefactor/learner/mastery.mjs) derives
  latest mastery state and evidence trails from submitted events.
- [`learner/readiness.mjs`](../scripts/easefactor/learner/readiness.mjs)
  evaluates hard prerequisites.
- [`learner/learning-gaps.mjs`](../scripts/easefactor/learner/learning-gaps.mjs)
  ranks blocked prerequisites deterministically.
- [`learner/mastery-summary.mjs`](../scripts/easefactor/learner/mastery-summary.mjs)
  builds the topic-filtered summary response.

None of these modules persist evidence or require a learner database.

### Content contracts

[`content/content-mappings.mjs`](../scripts/easefactor/content/content-mappings.mjs)
validates topic IDs, taxonomy versions, roles, and confidence levels.

[`content/content-selection.mjs`](../scripts/easefactor/content/content-selection.mjs)
indexes mappings and owns deterministic summaries, duration estimates, and
reviewed/servable/assessable predicates used by the planner.

### Planner operations

Each planner use case has one owner:

| Operation | Module |
|---|---|
| `recommendNextBestTopics` | [`planner/next-best-topics.mjs`](../scripts/easefactor/planner/next-best-topics.mjs) |
| `buildRemediationPlan` | [`planner/remediation-plan.mjs`](../scripts/easefactor/planner/remediation-plan.mjs) |
| `buildDiagnosticPlan` | [`planner/diagnostic-plan.mjs`](../scripts/easefactor/planner/diagnostic-plan.mjs) |

Planner modules compose graph, learner, and content operations. They do not
parse HTTP requests, format HTTP errors, or write responses.

### Parent companion

The bounded parent journey is split into:

- [`companion/parent-journey-contract.mjs`](../scripts/easefactor/companion/parent-journey-contract.mjs)
  for fixed context, field allowlists, timestamp validation, and coded errors;
- [`companion/parent-journey-content.mjs`](../scripts/easefactor/companion/parent-journey-content.mjs)
  for reviewed prompts, remediation steps, and household activity; and
- [`companion/parent-journey.mjs`](../scripts/easefactor/companion/parent-journey.mjs)
  for deterministic orchestration.

The journey accepts synthetic, request-only evidence and never persists
parent, learner, household, or customer data.

## HTTP Solution

The API layer is an adapter around the domain operations.

```text
HTTP request
  → router parses method/path
  → route family reads query/body
  → injected domain operation runs
  → route serializes response
```

### Shared HTTP primitives

- [`api/http-response.mjs`](../scripts/easefactor/api/http-response.mjs)
  owns JSON headers, success envelopes, and error envelopes.
- [`api/request-body.mjs`](../scripts/easefactor/api/request-body.mjs)
  owns streaming JSON parsing, empty-body behavior, malformed JSON, and the
  one-megabyte limit.
- [`api/query.mjs`](../scripts/easefactor/api/query.mjs) owns query coercion
  and pagination.
- [`api/errors.mjs`](../scripts/easefactor/api/errors.mjs) maps domain errors
  to the existing HTTP status/code/message/details contract.
- [`api/taxonomy-presenter.mjs`](../scripts/easefactor/api/taxonomy-presenter.mjs)
  owns release, topic, curriculum, standard, alignment, cluster, and coverage
  projections.
- [`api/router.mjs`](../scripts/easefactor/api/router.mjs) dispatches route
  descriptors and owns the 404/405/500 boundary.

### Route families

Each factory receives only the services it needs and returns descriptors with a
method, matcher, and handler:

- [`routes/taxonomy-routes.mjs`](../scripts/easefactor/api/routes/taxonomy-routes.mjs)
  serves release and read-only taxonomy views.
- [`routes/learner-routes.mjs`](../scripts/easefactor/api/routes/learner-routes.mjs)
  serves mastery summary, readiness, and learning gaps.
- [`routes/planner-routes.mjs`](../scripts/easefactor/api/routes/planner-routes.mjs)
  serves recommendations, diagnostic plans, and remediation plans.
- [`routes/companion-routes.mjs`](../scripts/easefactor/api/routes/companion-routes.mjs)
  serves the parent-journey contract.

The current method behavior is intentionally stable: unmatched GET/POST paths
return `404 not_found`; methods other than GET and POST return
`405 method_not_allowed`.

## Dependency Rules

The executable edges depend on domain operations, never the reverse:

```text
release → graph → learner/content → planner/companion
                                      ↑
HTTP server → router → route factories ┘
```

The rules are executable in
[`architecture.test.mjs`](../scripts/easefactor/architecture.test.mjs) and
[`architecture-rules.mjs`](../scripts/easefactor/architecture-rules.mjs):

- domain modules cannot import `api/` or a composition root;
- taxonomy file access is restricted to the release loader;
- HTTP dependencies stay in the API layer;
- static import and re-export edges must remain acyclic; and
- composition roots cannot accumulate route/domain implementations.

## Test Architecture

Tests mirror the solution boundaries. The suite entrypoints are:

- [`reference.test-suite.mjs`](../scripts/easefactor/reference.test-suite.mjs)
  for release, graph, learner, content, planner, companion, CLI, exports, and
  architecture behavior;
- [`api.test-suite.mjs`](../scripts/easefactor/api.test-suite.mjs) for HTTP
  primitives, route factories, and real-server endpoint contracts.

Focused tests sit beside the modules they protect. API contract tests start the
real local server; domain tests call pure functions directly. The full gate is:

```powershell
npm run validate
npm run test:easefactor
npm run test:easefactor-api
node scripts/easefactor-reference.mjs
$demo = node scripts/easefactor-reference.mjs --demo | ConvertFrom-Json
git diff --check
```

## Extension Rules

When adding a capability:

1. Put the behavior in the closest domain group.
2. Add a focused test beside that module and preserve deterministic ordering.
3. Inject the operation into a route factory only if a public HTTP contract is
   needed.
4. Add or update the route-family contract test.
5. Run the architecture and full verification suites.

Do not read `data/` directly from a planner, learner, companion, or route
module. Do not add persistence, authentication, private identifiers, or
upstream full standard text to this reference slice.

## Related References

- [EaseFactor reference slice](easefactor-reference-slice.md)
- [EaseFactor product roadmap](easefactor-product-roadmap.md)
- [EaseFactor taxonomy integration spec](easefactor-taxonomy-integration-spec.md)
- [SOLID refactor design](superpowers/specs/2026-07-10-easefactor-solid-module-refactor-design.md)
- [SOLID refactor implementation plan](superpowers/plans/2026-07-10-easefactor-solid-module-refactor.md)
