# EaseFactor SOLID Module Refactor Design

**Status:** Approved design for a behavior-preserving structural refactor.

## Decision

Refactor the EaseFactor reference implementation and local HTTP API into
small, dependency-free ES modules organized around cohesive responsibilities.
Keep `scripts/easefactor-reference.mjs` and `scripts/easefactor-api.mjs` as
thin executable composition roots. Reorganize the tests around the same module
and endpoint-family boundaries.

This is a structural change only. All current HTTP endpoints, response JSON,
error codes, deterministic ordering, request limits, CLI behavior, synthetic
evidence boundaries, and no-persistence behavior remain unchanged.

## Current Baseline

Before this design, the repository passes:

- `npm run validate`: 1,590 topics, 3,221 dependencies, 3,311 standards,
  94 alignments, and 183 clusters;
- `npm run test:easefactor`: 28 passing reference tests; and
- `npm run test:easefactor-api`: 32 passing HTTP contract tests.

These 60 tests form the initial characterization suite for the refactor.

## Goals

- Give each module one clear reason to change.
- Make dependencies flow from infrastructure and graph primitives toward
  learner, planner, companion, and HTTP adapters without cycles.
- Keep shared domain rules independent of HTTP.
- Make route families independently understandable and testable.
- Allow a new route family or domain operation to be added without extending
  a single large conditional function.
- Preserve the dependency-free runtime and built-in Node test runner.
- Verify both observable behavior and architectural dependency rules.

## Non-Goals

- No new endpoint, request field, response field, or product behavior.
- No change to scoring, readiness, diagnostic, remediation, or parent-journey
  rules.
- No framework, runtime dependency, build tooling, generated lockfile, or
  class hierarchy.
- No taxonomy data, schema, manifest, licensing, or provenance changes.
- No production storage, authentication, consent system, or private data.
- No general-purpose plugin system or speculative abstraction.

## Selected Architecture

Use layered domain modules plus feature-oriented HTTP route modules:

```text
scripts/
  easefactor-reference.mjs
  easefactor-api.mjs
  easefactor/
    release/load-release.mjs
    graph/traversal.mjs
    graph/graph-store.mjs
    learner/mastery.mjs
    learner/readiness.mjs
    learner/learning-gaps.mjs
    learner/mastery-summary.mjs
    content/content-mappings.mjs
    content/content-selection.mjs
    planner/next-best-topics.mjs
    planner/remediation-plan.mjs
    planner/diagnostic-plan.mjs
    companion/parent-journey-contract.mjs
    companion/parent-journey-content.mjs
    companion/parent-journey.mjs
    api/http-response.mjs
    api/request-body.mjs
    api/query.mjs
    api/errors.mjs
    api/router.mjs
    api/routes/taxonomy-routes.mjs
    api/routes/learner-routes.mjs
    api/routes/planner-routes.mjs
    api/routes/companion-routes.mjs
```

The exact test filenames may combine closely related cases, but test ownership
must mirror these responsibility boundaries rather than recreate two large
test files.

## Module Responsibilities

### Release and graph

`release/load-release.mjs` is the only domain module that reads released JSON
files. It calculates source hashes, checks manifest entries and counts, and
returns the current in-memory release object.

`graph/traversal.mjs` owns dependency traversal. `graph/graph-store.mjs` owns
topic lookup, prerequisite and unlock adjacency, curriculum views, and stable
unknown-topic errors. Neither module knows about learners, planning, HTTP, or
the CLI.

### Learner

`learner/mastery.mjs` derives deterministic mastery state from submitted
events. `learner/readiness.mjs` evaluates hard-prerequisite readiness.
`learner/learning-gaps.mjs` ranks readiness blockers.
`learner/mastery-summary.mjs` validates optional topic filters and formats the
current submitted-evidence summary.

### Content and planner

`content/content-mappings.mjs` validates mapping shape, topic existence,
taxonomy version, role, and confidence. `content/content-selection.mjs` owns
content indexing, ordering, summaries, and reviewed-content predicates shared
by planner operations.

Each planner module owns one use case: next-best-topic ranking, remediation
planning, or diagnostic planning. The modules compose graph, learner, and
content operations through narrow imports. They do not parse HTTP requests or
write responses.

### Companion

`parent-journey-contract.mjs` owns the fixed request boundary, allowed fields,
timestamp validation, stable journey error codes, and reviewed context.
`parent-journey-content.mjs` owns the reviewed prompts, remediation steps,
household activity, and its validation. `parent-journey.mjs` composes mastery,
diagnostic, gap, remediation, recheck, and parent-outcome operations into the
existing deterministic response.

### HTTP API

HTTP primitives have single owners:

- `http-response.mjs`: JSON headers and success/error envelopes;
- `request-body.mjs`: streaming JSON parsing and the 1 MB limit;
- `query.mjs`: query normalization, integer parsing, and pagination;
- `errors.mjs`: domain-to-HTTP error mapping while preserving current public
  errors; and
- `router.mjs`: URL parsing, route matching, 404 handling, and 405 handling.

Each route-family factory receives only the release, graph, or domain
operations it uses. It returns route descriptors containing an HTTP method,
path matcher, and handler. Route handlers translate HTTP inputs to domain
requests and domain results to HTTP responses; they contain no domain rules.

### Composition roots

`scripts/easefactor-reference.mjs` constructs the release and graph needed by
the existing default and `--demo` CLI flows. It may import domain modules but
contains no domain implementation.

`scripts/easefactor-api.mjs` constructs the release, graph, domain service
set, route families, router, and Node HTTP server. It retains the current
`createEaseFactorApiServer` export and executable port/host behavior but owns
no route or domain implementation.

## Dependency Direction

Allowed dependencies flow in this direction:

```text
release -> graph -> learner/content -> planner/companion
                                           ^
HTTP routes -> injected domain operations -+
HTTP server -> router -> route families
```

Additional rules:

- Domain modules must never import from `api/` or either composition root.
- Only the release loader may read taxonomy data files.
- Only API infrastructure and executable composition roots may import
  `node:http`.
- Route factories must use injected domain operations rather than importing a
  composition root.
- Lower-level modules must not import higher-level feature modules.
- Imports within `scripts/easefactor/` must remain acyclic.

These boundaries apply SOLID pragmatically:

- **Single responsibility:** each module has one reason to change.
- **Open/closed:** route families and domain operations extend through new
  descriptors or modules rather than a growing central conditional.
- **Liskov substitution:** no subtype hierarchy is introduced because the
  current functional design does not need one.
- **Interface segregation:** factories and functions receive only the values
  and operations they use.
- **Dependency inversion:** HTTP depends on injected domain operations while
  domain code remains independent of HTTP.

## Request and Error Flow

```text
HTTP request
  -> router parses method and path
  -> matching route normalizes query or body
  -> route invokes an injected domain operation
  -> route serializes the existing response

Domain error
  -> API error adapter
  -> existing HTTP status, code, message, and details
```

Domain errors carry stable codes and domain details but no HTTP status. The API
adapter owns status mapping. Family-specific fallback errors remain explicit
so learner, planner, and companion requests preserve their current public
error contracts. Unmatched paths return `404 not_found`; unsupported methods
return `405 method_not_allowed`; unhandled faults retain the existing
`500 internal_error` envelope.

## Behavioral Compatibility

The refactor must preserve:

- every current path and allowed method;
- every successful response field and nesting shape;
- pagination defaults, maximums, counts, and filtering behavior;
- deterministic topic, evidence, recommendation, plan, and journey ordering;
- all current error status codes, codes, messages, and detail objects;
- malformed JSON and oversized-body behavior;
- the fixed parent-journey context, reviewed activity, privacy checks, and
  timestamp validation;
- the `createEaseFactorApiServer` programmatic contract;
- default CLI summary behavior and `--demo` JSON output; and
- synthetic request-only evidence with no persistence.

## Test Organization

Move characterization cases into focused files before changing the underlying
implementation. Suggested ownership is:

```text
scripts/easefactor/
  release/load-release.test.mjs
  graph/graph-store.test.mjs
  learner/mastery.test.mjs
  learner/readiness.test.mjs
  planner/planning.test.mjs
  companion/parent-journey.test.mjs
  api/routes/taxonomy-routes.test.mjs
  api/routes/learner-routes.test.mjs
  api/routes/planner-routes.test.mjs
  api/routes/companion-routes.test.mjs
  architecture.test.mjs
```

Shared synthetic fixtures may live in narrowly named test-helper modules. A
helper must not become a second implementation of production behavior.
Package scripts will be updated to execute the reorganized reference/domain
tests and API contract tests deterministically on Windows and other supported
environments.

## Architecture Verification

Add a dependency-free architecture test that reads local ESM imports and
fails on a forbidden boundary. It must verify at least:

- no domain import from `api/`;
- no composition-root import from a domain or route module;
- no `node:http` import outside approved API infrastructure and entrypoints;
- no taxonomy-file access outside the release loader; and
- no cycle among modules under `scripts/easefactor/`.

The test checks dependency direction, not subjective line-count targets.
Cohesion is demonstrated by focused module contracts, narrow imports, and
tests that exercise each responsibility without booting unrelated layers.

## Refactor Sequence

1. Record the current green baseline and move tests into their intended
   ownership groups without changing assertions.
2. Add the architecture test with rules suitable for the target structure.
3. Extract release and graph primitives.
4. Extract learner and content primitives.
5. Extract planner operations.
6. Extract the parent companion contract, content, and orchestrator.
7. Extract HTTP primitives and feature route factories.
8. Reduce both top-level scripts to composition roots.
9. Update package scripts and `docs/easefactor-reference-slice.md`.
10. Run all behavioral, architectural, CLI, API, and release checks.

Each extraction must leave its relevant characterization tests green before
the next responsibility moves.

## Verification Gate

The completed refactor must pass:

```powershell
npm run validate
npm run test:easefactor
npm run test:easefactor-api
git diff --check
```

The EaseFactor test commands must include the architecture test and preserve
coverage of all 60 baseline behaviors. CLI tests must exercise both executable
paths, and HTTP tests must continue to start the real local server.

## Documentation

Update `docs/easefactor-reference-slice.md` with the final module map,
responsibility boundaries, extension path, and verification commands. Do not
describe unimplemented production infrastructure or change the reference-only
status of this local slice.

## Acceptance Criteria

- Both top-level EaseFactor scripts contain composition and executable wiring,
  not domain or route-family implementations.
- Every responsibility named in this design has one clear owning module.
- Domain modules do not depend on HTTP.
- Route families receive narrow injected dependencies.
- Architecture tests reject forbidden imports and cycles.
- All 60 baseline cases remain covered and passing after reorganization.
- Release validation, both EaseFactor test commands, CLI contract checks, and
  `git diff --check` pass.
- No released data, manifest, schema, license, or provenance content changes.
