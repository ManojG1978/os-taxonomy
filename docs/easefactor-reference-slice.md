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

## Run It

From the worktree root:

- `npm run validate`
- `npm run test:easefactor`
- `npm run test:easefactor-api`
- `node scripts/easefactor-reference.mjs --demo`
- `npm run serve:easefactor-api`

The demo run is intentionally synthetic and prints a deterministic recommendation
trace for inspection.

The local API listens on `http://127.0.0.1:3080` by default. Override the port
with `PORT=3090 npm run serve:easefactor-api` or
`node scripts/easefactor-api.mjs --port 3090`.

## Local API

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
POST /learners/v1/readiness/:topicId
POST /learners/v1/learning-gaps/:topicId
```

These endpoints accept JSON with optional synthetic `masteryEvents` and optional
`learnerId`. They derive mastery state in memory for the single request, then
return `checkReadiness` or `findLearningGaps` for the requested taxonomy topic.
They do not create learner records, persist observations, authenticate callers,
or add database/product backend behavior.

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
