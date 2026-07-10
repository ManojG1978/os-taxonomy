# EaseFactor Learning Knowledge Graph Product Roadmap

## Purpose And Authority

This is the canonical source for EaseFactor-facing capability status,
ownership, and implementation sequencing in this repository. The integration
spec describes stable architecture, the reference-slice guide describes
runnable examples, and curriculum coverage owns current dataset counts.

## Status Vocabulary

- `available`: released data or repository behavior ready for downstream use.
- `reference-only`: implemented with synthetic request data for inspection and contract testing, not production operation.
- `planned`: approved future work that has not been implemented.
- `product-owned`: required in EaseFactor or another consuming product, not in this public data repository.
- `out-of-scope`: intentionally excluded from the repository.

## Current Capability And Ownership

| Capability | Status | Owner | Current boundary |
|---|---|---|---|
| Versioned taxonomy data and checksums | `available` | Marble taxonomy | Public release data |
| Prerequisite and unlock traversal | `available` | Marble reference layer | Deterministic graph reads |
| Board/class/subject/strand filtering | `available` | Marble taxonomy | Partial reviewed mappings |
| Strict curriculum and learning-graph views | `available` | Marble reference layer | No private learner state |
| Synthetic mastery derivation | `reference-only` | Shared learning intelligence | Request-local evidence only |
| Readiness and learning-gap explanations | `reference-only` | Shared learning intelligence | Request-local evidence only |
| Diagnostic and remediation plans | `reference-only` | Shared learning intelligence | Deterministic demo contracts |
| Next-best-topic recommendations | `reference-only` | Shared learning intelligence | Synthetic content mappings |
| Content-mapping validation | `reference-only` | Shared learning intelligence | No content marketplace |
| Persistent learner evidence and mastery | `product-owned` | EaseFactor | Private, consented product storage |
| Reviewed learning-content inventory | `product-owned` | EaseFactor | Content rights and QA required |
| Parent companion experience | `planned` | EaseFactor | First product audience |
| Hindi and additional-language presentation | `planned` | EaseFactor | Shared terminology model |
| Independent-student experience | `planned` | EaseFactor | Reuses shared services |
| Teacher and school experience | `planned` | EaseFactor | Reuses shared services |
| Authentication, RBAC, consent, deletion, export | `product-owned` | EaseFactor | Never added to release JSON |
| Real learner or classroom data in this repo | `out-of-scope` | None | Prohibited |

## Approved Parent-First Outcome

Help an Indian parent understand what their Class 6 child is struggling with,
why it matters, and what useful activity to do next—without requiring the
parent to understand the raw curriculum graph.

## Architecture Boundary

The roadmap separates three layers so that public knowledge, reusable learning
reasoning, and audience-specific product experiences do not become one system.

1. **Public Marble knowledge.** Marble taxonomy owns versioned topic IDs,
   prerequisite relationships, evidence prompts, clusters, curriculum
   references and reviewed alignment metadata, provenance, licensing, and
   release checksums. It contains no private learner state.
2. **Audience-neutral learning intelligence.** Shared services own learner
   state, graph reasoning, reviewed content mapping, diagnostics, remediation,
   planning, explanations, and decision logs. The repository demonstrates
   bounded contracts with synthetic request data; production operation is
   product-owned.
3. **Parent, student, and teacher experiences.** EaseFactor owns workflows,
   permissions, presentation, consent, and private storage for each audience.

The first experience is parent-first. Learner state, graph reasoning, content
mapping, and planning must remain reusable by later independent-student and
teacher/school experiences.

Each phase below is an independently pickable tranche with an explicit
acceptance outcome. Later product phases do not authorize product-owned systems
or private data to be added to this repository.

## Phase 0: Repair And Consolidate The Foundation

**Owner:** Marble taxonomy and Marble reference layer. **Acceptance outcome:**
the public documentation has one roadmap authority, current coverage is not
overstated, and release, reference, and documentation checks pass.

| Implementation-plan work | Status | Owner |
|---|---|---|
| Repair stale HTTP API and visualizer assertions against the current release | `available` | Marble reference layer |
| Publish the evergreen parent-and-educator knowledge-graph report | `available` | Marble taxonomy |
| Create and verify this canonical status-and-ownership roadmap | `available` | Marble taxonomy |
| Reconcile current counts, links, and authority notes across public documentation | `available` | Marble taxonomy |
| Mark dated planning records as completed or historical snapshots | `available` | Marble taxonomy |
| Run the complete documentation, root validator, EaseFactor reference/API, and visualizer release gate | `available` | Marble taxonomy and Marble reference layer |

## Phase 1: Parent Companion Vertical Slice

**Status:** `planned`. **Owner:** EaseFactor, using shared learning
intelligence. **Acceptance outcome:** one production-oriented, explainable
parent journey works end to end for one reviewed Class 6 Mathematics topic
family.

The vertical slice includes:

- parent setup for board, class, subject, language, and concern;
- a plain-language statement of the concern;
- a short prerequisite-aware diagnostic;
- an evidence-backed mastery summary;
- a root-cause and readiness explanation;
- a small, ordered remediation plan;
- one reviewed household activity and the reason it was selected;
- parent observation capture in product-owned storage;
- a recheck after practice; and
- a weekly parent-readable summary.

## Phase 2: Make It Useful In Indian Homes

**Status:** `planned`. **Owner:** EaseFactor with shared terminology and
learning-intelligence services. **Acceptance outcome:** the parent journey is
usable across common Indian home, language, access, and time constraints while
preserving consent, privacy, and uncertainty.

- Add English and Hindi parent terminology through an extensible shared
  terminology model.
- Review Indian contexts, units, number formatting, currency, and examples.
- Offer activities that use common household materials.
- Provide printable, low-bandwidth, and messaging-friendly output.
- Support flexible 10-, 20-, and 30-minute session lengths.
- Support shared devices and siblings through private product-owned storage.
- Implement consent, child privacy, correction, deletion, and export controls.
- Use confidence-aware wording and age-appropriate content review.
- Add spaced revision and recheck loops.
- Capture parent feedback and use it to revise plans visibly.

## Phase 3: Curriculum And Content Expansion

**Status:** `planned`. **Owners:** Marble taxonomy for reviewed public mappings;
EaseFactor for reviewed content inventory and delivery. **Acceptance outcome:**
coverage expands through bounded, reviewed slices, with visible gaps and useful
content alternatives rather than broad unsupported claims.

The India mapping is a reviewed pilot, not full-board coverage.

- Complete the remaining Class 6 algebraic-patterning cleanup.
- Review the full Class 6 Mathematics mapping before broad coverage claims.
- Expand to adjacent Mathematics classes before adding a second subject.
- Add Science later, as a separately reviewed subject expansion.
- Add bounded ICSE and state-board mappings over canonical topic IDs.
- Preserve codes-only sources unless rights are explicitly cleared; never
  reconstruct upstream curriculum text.
- Report coverage gaps, including partial board, class, subject, and strand
  mappings.
- Offer reviewed content alternatives by language, format, difficulty,
  duration, and accessibility need.

## Phase 4: Student And Teacher Reuse

**Status:** `planned`. **Owner:** EaseFactor, reusing the audience-neutral
learner-state, graph, content-mapping, and planning services proven by the
parent experience. **Acceptance outcome:** each new audience receives a bounded
workflow and permission model without duplicating the shared core.

### Independent-Student Experience

Add goal setting, guided practice, self-assessment, hints, revision planning,
and progress reflection. Explanations remain confidence-aware, and learners
can see why a topic or activity was suggested and record an override.

### Teacher And School Experience

Add class diagnostics, temporary grouping by shared gaps, coverage reporting,
assignments, interventions, auditable overrides, parent-shareable summaries,
and bounded import/export contracts. Classroom and school data remain private,
product-owned data and never enter this release repository.

## Phase 5: Quality, Governance, And Scale

**Status:** `planned`. **Owners:** Marble taxonomy for public release integrity;
EaseFactor for product governance and operation. **Acceptance outcome:** every
release and recommendation is versioned, reviewable, measurable, privacy-aware,
and resilient under missing data or connectivity.

- Support taxonomy version migrations and versioned imports.
- Record deterministic planner versions and decision logs.
- Evaluate recommendation quality and run bias checks.
- Require human review for curriculum and content mappings.
- Measure helpfulness rather than completion alone.
- Enforce child-data retention and access policies in product systems.
- Provide offline resilience and explicit missing-content behavior.
- Keep public examples synthetic.
- Apply release gates for data integrity, API contracts, privacy, mapping
  review, and documentation freshness.

## Trust And Failure Semantics

- **Insufficient evidence:** return `not enough information`; do not turn an
  unknown into a negative learner label.
- **Missing prerequisite observations:** propose a proportionate diagnostic
  prompt rather than assuming the prerequisite is weak.
- **Missing reviewed content:** do not present an activity as fully supported;
  disclose the gap and offer only reviewed alternatives.
- **Partial mappings:** label board, class, subject, and strand coverage as
  partial wherever the reviewed mapping is incomplete.
- **Unknown topic IDs:** fail explicitly with a typed, explainable error rather
  than silently substituting a topic.
- **Version mismatches:** reject or migrate explicitly and preserve the source
  and target taxonomy versions.
- **Explanations:** every recommendation states its prerequisite, evidence, or
  curriculum basis in plain language.
- **Visible overrides:** human overrides and their reasons remain visible and
  auditable.
- **Codes-only text:** codes-only sources never acquire copied, inferred, or
  reconstructed upstream curriculum text; users must consult authorized
  sources.
- **Guidance boundary:** parent-facing results are learning guidance, not a
  clinical, psychological, diagnostic, or formal educational assessment.

## Next Implementation Tranche

Build one production-oriented parent journey for a reviewed CBSE/NCERT Class 6
Mathematics topic family in the EaseFactor product repository. Before UI work,
define the product-owned learner-evidence store, consent boundary, reviewed
content contract, and measurable parent outcome. Do not add those product
systems to this taxonomy release repository.
