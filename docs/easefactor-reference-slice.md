# EaseFactor Reference Slice

This repository remains a **Marble Skill Taxonomy dataset release**: versioned
JSON data, schemas, provenance, licensing notes, and checksum-verified release
artifacts.

`scripts/easefactor-reference.mjs` is a **dependency-free implementation
example** for wiring a small EaseFactor-style integration slice against this
release data.

`scripts/easefactor-api.mjs` is a thin **local HTTP wrapper** over that reference
module. It uses Node built-ins only and is intended for developer inspection,
integration spikes, and contract testing. It is not a production app backend.

> **Document role:** This file documents behavior that is runnable in this
> repository with synthetic request data. It is not the product backlog. See
> the [EaseFactor product roadmap](easefactor-product-roadmap.md) for current
> status, ownership, and next steps.

## What It Is

- A dependency-free runtime example that demonstrates how a product can use the
  release files (`topics`, `dependencies`, `curriculum-alignments`, and related
  artifacts).
- A documentation asset for a bounded integration path: first-pass planning and
  recommendation flow for **Class 6 Mathematics Number System**.
- A bridge reference that keeps graph logic (`script`), governance
  (`curriculum/manifest`), and product services separated by boundary.

Recommended first-build chain:

```text
Class 6 Mathematics Number System
  -> import taxonomy v1
  -> filter curriculum-aligned topics
  -> compute prerequisite closure
  -> record diagnostic evidence
  -> identify gaps
  -> recommend the next topic with explanation
```

## What It Is Not

- A full product backend.
- A learner database or content marketplace.
- A source of private learner/customer data.
- A place to publish upstream standard text for codes-only curriculums.

This repo does not store observations, user accounts, or RBAC policies.
Product state belongs in product services and product infrastructure.

## Implementation Structure

The reference slice is split into focused module groups under
`scripts/easefactor/`:

| Module group | Responsibility |
|---|---|
| `release/` | Load and verify the released JSON files, manifest counts, and checksums. |
| `graph/` | Build the in-memory taxonomy graph and provide traversal/query operations. |
| `learner/` | Derive request-local mastery, readiness, learning gaps, and mastery summaries. |
| `content/` | Validate synthetic content mappings and select usable mapped content. |
| `planner/` | Build diagnostic and remediation plans and next-best-topic recommendations. |
| `companion/` | Enforce the fixed parent-journey contract and compose its reviewed synthetic journey. |
| `api/` | Provide HTTP primitives, presentation, routing, and route-family factories. |

Dependencies point inward from the executable edges to domain operations:

```text
released JSON -> release loader -> graph -> learner/content -> planner/companion
                                                        ^
HTTP server -> router and route-family factories -------|
```

- Released JSON is read only by the release loader.
- Domain modules do not depend on HTTP.
- Route families translate HTTP contracts and receive domain operations through
  factories.
- The two top-level scripts, `scripts/easefactor-reference.mjs` and
  `scripts/easefactor-api.mjs`, are executable composition roots.
- `scripts/easefactor/architecture.test.mjs` enforces allowed imports, prevents
  domain-to-HTTP and composition-root imports, restricts taxonomy file access
  to the release loader, detects module cycles, and keeps the composition roots
  focused on wiring.

To extend the reference slice, add pure behavior to the closest domain group,
cover it in that group's tests, and expose it from a route-family factory only
when an HTTP contract is needed. Inject the new operation from
`scripts/easefactor-api.mjs`; do not read `data/` directly, import HTTP from a
domain module, or add persistence. Keep examples synthetic and keep real
learner, customer, and product state outside this repository.

## Run It

From the worktree root:

```powershell
npm run validate
npm run test:easefactor
npm run test:easefactor-api
node scripts/easefactor-reference.mjs
$demo = node scripts/easefactor-reference.mjs --demo | ConvertFrom-Json
git diff --check
```

The default CLI prints the learning-graph summary. Parsing the demo output with
`ConvertFrom-Json` verifies that the synthetic recommendation trace is valid
JSON. To inspect the local API after the automated gate, run
`npm run serve:easefactor-api`.

The demo run is intentionally synthetic and prints a deterministic recommendation
trace for inspection.

The local API listens on `http://127.0.0.1:3080` by default. Override the port
with `PORT=3090 npm run serve:easefactor-api` or
`node scripts/easefactor-api.mjs --port 3090`.

## Local API

### Parent companion demo endpoint

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

The only supported context is:

```json
{
  "board": "CBSE",
  "curriculum": "ncert-class6-math-2026-27",
  "class": 6,
  "subject": "Mathematics",
  "language": "en-IN",
  "topicFamily": "fractions-comparison"
}
```

The concern ID is `fraction-size-comparison`. The request must set
`evidenceMode` to `synthetic` and assert all three fixed consent values:
`purpose: "diagnostic-guidance"`, `scope: "request-only"`, and
`observationCapture: "request-only"`.

A compact successful request is:

```json
{
  "context": {
    "board": "CBSE",
    "curriculum": "ncert-class6-math-2026-27",
    "class": 6,
    "subject": "Mathematics",
    "language": "en-IN",
    "topicFamily": "fractions-comparison"
  },
  "concernId": "fraction-size-comparison",
  "evidenceMode": "synthetic",
  "consent": {
    "purpose": "diagnostic-guidance",
    "scope": "request-only",
    "observationCapture": "request-only"
  },
  "diagnosticEvents": [
    {"topicId": "mt_vKcxX6iNOA", "result": "secure", "score": 0.92, "observedAt": "2026-07-10T09:00:00.000Z"},
    {"topicId": "mt_Kr3IyA6m-O", "result": "partial", "score": 0.42, "observedAt": "2026-07-10T09:05:00.000Z"}
  ],
  "recheckEvents": [
    {"topicId": "mt_Kr3IyA6m-O", "result": "secure", "score": 0.86, "observedAt": "2026-07-10T09:30:00.000Z"}
  ],
  "parentOutcomeResponses": {
    "foundationalGapTopicId": "mt_Kr3IyA6m-O",
    "firstActionId": "locate-benchmark-fractions"
  }
}
```

The foundational-gap status is `identified` or `not-enough-information`.
Recheck status is `improved`, `needs-more-evidence`, or `not-submitted`.
Parent outcome status is `passed`, `not-passed`, or `not-measured`; `passed`
requires both the foundational-gap and first-action answers to match the
journey result.

Each submitted evidence event must use one of the three reviewed journey topic
IDs, a `result` of `secure`, `partial`, `review`, or `blocked`, a finite `score`
from `0` through `1`, and a valid `observedAt` timestamp. `taxonomyVersion` is
optional; when present, it must equal the current taxonomy version. Evidence
timestamps require an explicit timezone ending in `Z` or a numeric `+HH:MM` or
`-HH:MM` offset; timezone-less date-times are rejected.

Typed errors are:

| HTTP status | Error code | Meaning |
|---:|---|---|
| 400 | `invalid_json` | The body is malformed JSON. |
| 400 | `unsupported_parent_journey_context` | A fixed context value or the concern is unsupported. |
| 400 | `invalid_consent_boundary` | The consent assertion is missing or differs from the request-only contract. |
| 400 | `synthetic_evidence_required` | `evidenceMode` is not `synthetic`. |
| 400 | `private_data_not_allowed` | The request contains an unsupported, private, or persistence field. |
| 400 | `invalid_parent_journey_evidence` | Evidence is malformed, version-mismatched, or outside the three reviewed journey topics. |
| 413 | `request_body_too_large` | The request exceeds the shared one-megabyte body limit. |
| 500 | `invalid_reviewed_activity` | The built-in activity fails its reviewed mapping contract. |

These request fields only assert the boundary needed to run the reference
contract. This endpoint is not authentication, consent administration, storage,
a production UI, or generalized curriculum routing.

Read-only taxonomy endpoints:

```http
GET /taxonomy/v1/releases/current
GET /taxonomy/v1/topics
GET /taxonomy/v1/topics/:topicId
GET /taxonomy/v1/topics/:topicId/prerequisites?depth=2
GET /taxonomy/v1/topics/:topicId/unlocks?depth=1
GET /taxonomy/v1/curriculum-topics
GET /taxonomy/v1/curricula
GET /taxonomy/v1/standards
GET /taxonomy/v1/curriculum-alignments
GET /taxonomy/v1/clusters
GET /taxonomy/v1/coverage
```

`/taxonomy/v1/topics` supports simple query filters: `subject`, `domain`,
`type`, `standard`, `age`, `limit`, and `offset`.

`/taxonomy/v1/curriculum-topics` accepts the same filter fields as
`makeGraphStore().getCurriculumTopics()`, including `curriculum`, `board`,
`class`, `subject`, `strand`, `mode`, and `prerequisiteDepth`.

`/taxonomy/v1/curricula` returns curriculum source metadata without expanding
all standards. It supports `curriculum`, `country`, and `codesOnly`.

`/taxonomy/v1/standards` returns standards as flattened rows with curriculum
metadata. It supports `curriculum`, `country`, `subject`, `domain`, `board`,
`class`, `strand`, `key`, `code`, `codesOnly`, `limit`, and `offset`. For
codes-only sources, subject, board, class, and strand filters are resolved from
alignment metadata where available; the response still does not add upstream
standard text.

`/taxonomy/v1/curriculum-alignments` supports `topicId`, `standardKey`,
`curriculum`, `country`, `board`, `class`, `subject`, `strand`, `matchType`,
`confidence`, `limit`, and `offset`.

`/taxonomy/v1/clusters` supports `subject`, `domain`, `age`, `limit`, and
`offset`.

`/taxonomy/v1/coverage` summarizes per-curriculum observability: standard
counts, alignment counts, distinct aligned standards/topics, subjects, boards,
classes, and strands.

Planner demo endpoint:

```http
POST /planner/v1/next-best-topics
POST /planner/v1/diagnostic-plan
POST /planner/v1/remediation-plan
```

`/planner/v1/next-best-topics` accepts JSON with `goal`, `constraints`, optional
synthetic `masteryEvents`, and optional `contentMappings`. It derives mastery
state in memory for the request and returns the deterministic
`recommendNextBestTopics` payload. No learner, customer, or content records are
persisted to `data/`.

`/planner/v1/diagnostic-plan` accepts JSON with `targetTopicId`, optional
`learnerId`, optional synthetic `masteryEvents`, and optional synthetic
`contentMappings`. It returns the ordered hard prerequisites where diagnostic
evidence should be collected first, skipping prerequisites that are already
secure or sufficiently strong. Each step includes readiness context, gap context,
an explanation, `assessableNow`, and matching reviewed or verified assessment
content. `assessableNow` is true only when a reviewed or verified `assesses`
mapping exists for that prerequisite. It does not create learner records,
persist observations, authenticate callers, or broaden into a learning-path
endpoint.

`/planner/v1/remediation-plan` accepts JSON with `targetTopicId`, optional
`learnerId`, optional synthetic `masteryEvents`, and optional synthetic
`contentMappings`. It reuses readiness and gap logic to return ordered repair
steps for missing or weak hard prerequisites only. Each step includes readiness
and gap context, an explanation, `servableNow`, and any matching content summary.
`servableNow` is true only when reviewed or verified teaching, practice, or
review content maps to that prerequisite. It does not create learner records,
persist observations, authenticate callers, or broaden into a general learning
path endpoint.

Learner demo endpoints:

```http
POST /learners/v1/mastery-summary
POST /learners/v1/readiness/:topicId
POST /learners/v1/learning-gaps/:topicId
```

These endpoints accept JSON with optional synthetic `masteryEvents` and optional
`learnerId`. They derive mastery state in memory for the single request only.

`/learners/v1/mastery-summary` exposes the raw `deriveMasteryState` result as a
bounded API primitive. It returns the latest status, confidence, last evidence
timestamp, explanation, and full evidence trail per topic. Optional `topicIds`
filters the response and is sorted deterministically; requested topic IDs are
validated against the taxonomy and unknown IDs return `unknown_topic_id`.
Submitted evidence is not persisted.

`/learners/v1/readiness/:topicId` and `/learners/v1/learning-gaps/:topicId`
derive mastery state from the same synthetic request body, then return
`checkReadiness` or `findLearningGaps` for the requested taxonomy topic. They do
not create learner records, persist observations, authenticate callers, or add
database/product backend behavior.

Shared synthetic POST endpoint errors:

- malformed JSON returns `400` with `invalid_json`;
- unknown topic IDs return `404` with `unknown_topic_id`;
- oversized request bodies return `413` with `request_body_too_large`.

## Product Service Mapping

Use this slice as the seam between the taxonomy dataset and EaseFactor services:

| Product Area            | Script Function                                                          |
|-------------------------|--------------------------------------------------------------------------|
| Taxonomy Importer       | `loadTaxonomyRelease`                                                    |
| Taxonomy Graph Store    | `makeGraphStore`                                                         |
| Learner Mastery Service | `deriveMasteryState`, `checkReadiness`, `findLearningGaps`               |
| Content Mapping Service | `validateContentMappings`                                                |
| Planner Service         | `recommendNextBestTopics`, `buildDiagnosticPlan`, `buildRemediationPlan` |
| Local HTTP Reference    | `createEaseFactorApiServer`                                              |

## Licensing And Privacy Boundaries

### Licensing

The script uses taxonomy metadata and alignment codes; it must preserve
curriculum licensing boundaries.

- `ncert-class6-math-2026-27` is treated as **codes-only**.
- Do not display or restore upstream full text for codes-only sources unless rights
  clearance exists for your environment.
- Keep attribution and source semantics from the release manifest and
  `licensing-and-provenance.md`.

### Privacy

All sample learner/content records in this repo are synthetic and
not production data.

Real learner observations belong to product-managed systems with:

- tenant boundaries,
- role-based access control,
- audit logging,
- retention policy,
- deletion/export workflows where required by policy or regulation.

All learner, content, and classroom data remains outside the taxonomy release
files and `docs/` docs.
