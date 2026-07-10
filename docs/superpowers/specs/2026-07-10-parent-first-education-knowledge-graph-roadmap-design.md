# Parent-First Education Knowledge Graph Roadmap Design

## Decision

Create a hub-and-spoke documentation system for using the Marble Skill
Taxonomy in learning products. The work serves both EaseFactor's internal
product and engineering teams and public downstream integrators.

The first product audience is parents supporting children at home in India.
The initial curriculum slice is CBSE-facing, codes-only NCERT Class 6
Mathematics. Shared services and data contracts must remain audience-neutral so
independent-student and teacher experiences can reuse them later.

## Current Baseline

The approved design starts from the live repository state on 2026-07-10:

- 1,590 canonical topics;
- 3,221 directed prerequisite relationships;
- 3,311 curriculum standards or standard codes;
- 50 codes-only NCERT Class 6 Mathematics source keys;
- 94 reviewed NCERT/CBSE alignment rows;
- a dependency-free EaseFactor reference library;
- a local HTTP reference API covering taxonomy reads, synthetic mastery,
  readiness, learning gaps, diagnostics, remediation, and next-best topics;
- a curriculum-aware graph visualizer.

The root validator and the 19-test EaseFactor reference suite pass. The
27-test HTTP API suite currently has two stale assertions that expect 26 NCERT
source keys instead of the live count of 50. Several public and historical
documents also contain superseded 50- or 76-alignment snapshots.

## Product Outcome

The first parent-facing experience should help a parent answer four questions:

1. What is my child learning?
2. Where is the difficulty?
3. What useful activity can we do next?
4. Is the concept becoming more secure?

The experience must translate graph reasoning into plain-language guidance. It
must not expose the raw graph as the primary interface or treat sparse evidence
as a definitive judgment about a child.

## Architecture

### Public knowledge layer

Marble remains the public, versioned learning map. It owns canonical topic IDs,
prerequisite relationships, evidence prompts, clusters, curriculum references,
alignment metadata, provenance, licensing declarations, and release checksums.

### Shared EaseFactor learning-intelligence layer

Audience-neutral product services own:

- learner evidence and derived mastery state;
- readiness, prerequisite, learning-gap, and unlock reasoning;
- reviewed mappings between learning content and topic IDs;
- diagnostic, remediation, next-step, and review planning;
- human-readable explanations and decision logs.

### Experience layer

The parent companion is the first consumer of the shared layer. Future
independent-student and teacher experiences reuse the same learner-state, graph,
content-mapping, and planning services while presenting different workflows and
permissions.

Private learner, household, classroom, school, and customer data must never be
written to the taxonomy release files.

## Documentation Architecture

### Generic education report

Create `docs/knowledge-graph-in-education.md`, titled **Using a Learning
Knowledge Graph in Education and Study**.

This is an evergreen, reader-facing report for parents and educators. It is not
a design document, implementation specification, or product roadmap. It should
explain:

- topics, prerequisite relationships, observable evidence, and curriculum
  mappings in approachable language;
- the advantage of a connected learning map over a flat syllabus;
- uses in home learning, classrooms, tutoring, independent study, diagnostics,
  remediation, personalized pathways, revision, curriculum transitions,
  content organization, and mixed-ability support;
- explainable recommendations and responsible AI assistance;
- inclusion, accessibility, language, and low-resource considerations;
- practical Indian examples using CBSE/NCERT while remaining internationally
  useful;
- privacy, fairness, uncertainty, licensing, and human-oversight boundaries;
- practical scenarios for parents, teachers, tutors, and students;
- a concise responsible-adoption checklist.

The report should be mostly count-free so that it remains accurate as the
dataset grows. Where live coverage matters, it should link to
`docs/curriculum-coverage.md`.

### Canonical EaseFactor roadmap

Create `docs/easefactor-product-roadmap.md` as the authoritative source for:

- current EaseFactor-facing capabilities;
- taxonomy-owned versus product-owned responsibilities;
- implementation status;
- the India parent-first sequence;
- internal product work and public-integration work;
- later student and teacher reuse.

Each roadmap item must have an explicit status and owner. Supported status
values are `available`, `reference-only`, `planned`, `product-owned`, and
`out-of-scope`.

### Stable technical architecture

Keep `docs/easefactor-taxonomy-integration-spec.md` as the durable technical
integration reference. Remove or redirect current-status and backlog material
that would compete with the canonical roadmap.

### Runnable reference implementation

Keep `docs/easefactor-reference-slice.md` limited to behavior that is runnable
in this repository, its synthetic-data contract, and its verification commands.

### Dataset truth

Keep current curriculum counts, alignment coverage, pilot limitations, and
codes-only details in `docs/curriculum-coverage.md`. Other durable documents
should link to this source rather than copying volatile counts.

### Historical implementation records

Retain dated files under `docs/superpowers/specs/` and
`docs/superpowers/plans/` as implementation history. Add clear `completed`,
`superseded`, or `historical` status notes where an older snapshot could be
mistaken for the current roadmap.

### Documentation navigation

Update `docs/README.md` to route:

- parents and educators to the generic education report;
- product teams to the canonical EaseFactor roadmap;
- technical integrators to the stable integration spec and runnable reference;
- curriculum and licensing readers to the coverage and provenance documents.

## Capability Roadmap

### Phase 0: repair and consolidate

- Fix the two stale HTTP API assertions.
- Reconcile current counts and links across public documentation.
- Add the canonical roadmap and generic education report.
- Clarify the roles of the integration spec, runnable reference, curriculum
  coverage document, and historical planning records.
- Add a status-and-ownership capability matrix.

### Phase 1: parent companion vertical slice

Use one real Class 6 Mathematics topic family to prove the complete journey:

- parent-friendly setup for class, board, subject, language, and concern;
- plain-language topic discovery;
- a short prerequisite-aware diagnostic;
- an evidence-backed mastery summary;
- root-cause and readiness explanations;
- a small ordered remediation path;
- one reviewed household activity and a reason for recommending it;
- parent observation capture;
- a recheck after practice;
- a weekly parent-readable summary.

This phase is a product plan, not authorization to add private learner storage
or production authentication to the taxonomy repository.

### Phase 2: Indian-home usability

- English and Hindi parent terminology with an extensible language model;
- Indian contexts, units, number formatting, currency, and examples;
- common-household-material activities;
- printable, low-bandwidth, and messaging-friendly summaries;
- 10-, 20-, and 30-minute session options;
- shared-device and sibling support in product-owned storage;
- consent, child privacy, deletion, and export controls;
- confidence-aware language and age-appropriate content review;
- spaced-review, revision, and parent-feedback loops.

### Phase 3: curriculum and content expansion

- Complete the remaining Class 6 algebraic-patterning cleanup.
- Review the full Class 6 mapping before making broad-coverage claims.
- Expand to adjacent mathematics classes before adding a second subject.
- Add other Indian boards as reviewed mappings over canonical topic IDs.
- Preserve codes-only source boundaries unless rights are cleared.
- Add visible coverage-gap reporting and a reviewed content inventory.
- Offer content alternatives by language, format, difficulty, duration, and
  accessibility need.

### Phase 4: student and teacher reuse

Independent-student experiences add goals, guided practice, self-assessment,
hints, revision planning, and progress reflection over the shared core.

Teacher and school experiences add class diagnostics, grouping by shared gaps,
coverage reporting, assignments, interventions, auditable overrides,
parent-shareable summaries, and bounded import/export contracts.

### Phase 5: quality, governance, and scale

- Versioned imports and taxonomy migration handling.
- Deterministic planner versions and decision logs.
- Recommendation-quality and bias evaluation.
- Human review for curriculum and content mappings.
- Helpfulness-oriented analytics.
- Child-data retention and access policies.
- Offline resilience and missing-content behavior.
- Public examples containing synthetic data only.
- Release gates for integrity, API contracts, privacy, and documentation
  freshness.

## Trust And Failure Semantics

- Sparse evidence produces `not enough information`, not a negative learner
  label.
- Missing prerequisite observations produce a diagnostic prompt.
- Missing reviewed content prevents an activity from being presented as fully
  supported.
- Partial curriculum mappings are labeled as partial.
- Unknown topic IDs and taxonomy-version mismatches fail explicitly.
- Recommendations include a short reason and evidence basis.
- Human overrides are visible and auditable.
- Codes-only sources never acquire reconstructed upstream text.
- Parent-facing results are learning guidance, not formal educational or
  psychological assessments.

## Implementation Boundary

The immediate implementation tranche is documentation consolidation and
current-state repair only. It includes the generic report, canonical roadmap,
supporting-document reconciliation, historical status labels, stale test
repairs, and end-to-end verification.

It excludes production learner persistence, authentication, new planner or
learner endpoints, real child data, full-text upstream India curriculum
material, and a parent application UI.

## Verification

The implementation must:

- run `npm run validate`;
- run `npm run test:easefactor`;
- run `npm run test:easefactor-api`;
- verify documentation links;
- sweep for stale 26-key and 50- or 76-alignment claims;
- confirm the live release counts from the manifest and curriculum files;
- confirm no real learner information or restricted upstream text was added;
- review the generic report for parent and educator readability;
- review the roadmap for explicit ownership, status, and independently
  pickable tranches.

## Success Criteria

- Parents and educators have one approachable report explaining educational
  uses of a learning knowledge graph.
- EaseFactor and downstream integrators have one canonical roadmap that
  distinguishes current capability from future product work.
- Technical and dataset documentation no longer compete as backlog sources.
- Current India coverage is described accurately and without overstating the
  pilot.
- All root validation and EaseFactor tests pass.
- The next implementation tranche is bounded and can be planned without
  reopening the approved product direction.
