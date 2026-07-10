# Parent-First Education Knowledge Graph Roadmap Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Publish an approachable parent-and-educator report and a canonical EaseFactor product roadmap, reconcile current India-coverage documentation, repair stale API and visualizer assertions, and leave all repository verification green.

**Architecture:** Use a hub-and-spoke documentation model. `docs/knowledge-graph-in-education.md` is the evergreen public report, `docs/easefactor-product-roadmap.md` owns current capability status and sequencing, the integration spec remains stable technical architecture, the reference-slice guide describes runnable behavior, and curriculum coverage owns volatile dataset counts. Keep production learner data and product runtime concerns outside this data-release repository.

**Tech Stack:** Markdown, Node.js built-in test runner, dependency-free ES modules, JSON release data, PowerShell verification commands.

## Global Constraints

- Treat the root as a dataset release; do not add dependencies, frameworks, lockfiles, or product-runtime infrastructure.
- Keep the immediate tranche to documentation consolidation, current-state repair, and stale-test repair.
- Do not add production learner persistence, authentication, new API endpoints, a parent UI, or real learner data.
- Keep NCERT/CBSE material codes-only; do not add or reconstruct upstream syllabus, standard, chapter, exercise, or textbook text.
- Preserve canonical `mt_` topic IDs, dependency directions, curriculum keys, and alignment endpoints.
- Keep private learner, household, classroom, school, and customer data outside `data/` and `docs/`.
- Describe the India mapping as a reviewed pilot, not full-board coverage.
- Use parent-friendly, confidence-aware language; sparse evidence means `not enough information`, not a negative learner label.
- Run `npm run validate`, `npm run test:easefactor`, and `npm run test:easefactor-api` before handoff.
- Do not update `data/manifest.json`; this tranche does not change released data bytes.

---

## File Structure

### Create

- `docs/knowledge-graph-in-education.md`: evergreen report for parents, educators, tutors, and independent learners.
- `docs/easefactor-product-roadmap.md`: canonical status, ownership, India parent-first sequencing, and future reuse roadmap.
- `docs/superpowers/README.md`: navigation and authority note for dated historical specs and plans.

### Modify

- `scripts/easefactor-api.test.mjs`: update two current-release assertions from 26/50 to 50/94.
- `apps/visualizer/src/lib/alignmentFilters.test.mjs`: update curriculum options, row totals, aligned-topic totals, and internal-edge totals for the expanded 94-row pilot.
- `README.md`: make the generic education report and canonical roadmap discoverable.
- `docs/README.md`: correct live release counts and route each reader to the correct document.
- `docs/validation-and-release.md`: correct the documented validation baseline to 3,311 standards and 94 alignments.
- `docs/curriculum-coverage.md`: declare this file the canonical source for volatile curriculum and alignment counts.
- `docs/easefactor-taxonomy-integration-spec.md`: identify it as stable architecture and redirect changing status/sequencing to the roadmap.
- `docs/easefactor-reference-slice.md`: identify it as runnable reference behavior and redirect product sequencing to the roadmap.
- `docs/superpowers/specs/2026-07-09-india-board-alignment-infrastructure-design.md`: add a historical/completed status note.
- `docs/superpowers/specs/2026-07-09-cbse-ncert-class-6-math-pilot-mapping-design.md`: add a historical/completed status note.
- `docs/superpowers/specs/2026-07-09-cbse-ncert-class-6-math-pilot-coverage-qa.md`: replace the misleading current-state note with an explicit historical-snapshot note.
- `docs/superpowers/specs/2026-07-09-cbse-ncert-class-6-math-pilot-coverage-audit.md`: add a historical-snapshot note.
- `docs/superpowers/plans/2026-07-09-india-board-alignment-infrastructure.md`: add a completed/historical status note.
- `docs/superpowers/plans/2026-07-09-cbse-ncert-class-6-math-pilot-mapping.md`: add a completed/historical status note.
- `docs/superpowers/plans/2026-07-09-cbse-ncert-class-6-math-pilot-coverage-qa-expansion.md`: replace its misleading current-state note with an explicit historical-snapshot note.

### Read but do not modify

- `data/manifest.json`: authoritative release counts and checksums.
- `data/curriculum-standards.json`: authoritative NCERT source-key count and codes-only posture.
- `data/curriculum-alignments.json`: authoritative alignment count and reviewed rows.
- `PROVENANCE.md`: licensing and upstream-source boundaries.
- `docs/licensing-and-provenance.md`: public licensing explanation.
- `docs/superpowers/specs/2026-07-10-parent-first-education-knowledge-graph-roadmap-design.md`: approved requirements source.

---

### Task 1: Repair Current-Release API And Visualizer Assertions

**Files:**
- Modify: `scripts/easefactor-api.test.mjs:103-116`
- Modify: `scripts/easefactor-api.test.mjs:172-185`
- Modify: `apps/visualizer/src/lib/alignmentFilters.test.mjs:24-47`
- Read: `data/manifest.json`
- Read: `data/curriculum-standards.json`
- Read: `data/curriculum-alignments.json`

**Interfaces:**
- Consumes: `/taxonomy/v1/curricula` response field `curricula[].topicCount` and `/taxonomy/v1/coverage` response fields `coverage[].standardCount` and `coverage[].alignmentCount`.
- Produces: API and visualizer assertions matching the live codes-only NCERT release: 50 source keys, 94 alignment rows, seven strands, 77 distinct aligned topics, and 65 internal dependency edges of which 57 are hard.

- [ ] **Step 1: Reconfirm the live release counts from data, not documentation**

Run:

```powershell
@'
import fs from 'node:fs';
const standards = JSON.parse(fs.readFileSync('data/curriculum-standards.json', 'utf8'));
const alignments = JSON.parse(fs.readFileSync('data/curriculum-alignments.json', 'utf8'));
const source = standards.curricula.find((row) => row.slug === 'ncert-class6-math-2026-27');
const rows = alignments.alignments.filter((row) => row.curriculum === source.slug);
console.log(JSON.stringify({sourceKeys: source.topics.length, alignmentRows: rows.length}, null, 2));
'@ | node --input-type=module
```

Expected:

```json
{
  "sourceKeys": 50,
  "alignmentRows": 94
}
```

- [ ] **Step 2: Run the two affected contract tests and preserve the failing baseline**

Run:

```powershell
node --test --test-name-pattern="GET /taxonomy/v1/(curricula|coverage)" scripts/easefactor-api.test.mjs
```

Expected: two failures. The curricula assertion reports actual `50` versus expected `26`; the coverage assertions encounter the same stale source-key expectation before reaching the stale `50` alignment expectation.

- [ ] **Step 3: Run the visualizer filter contract and preserve its failing baseline**

Run:

```powershell
node --experimental-strip-types apps/visualizer/src/lib/alignmentFilters.test.mjs
```

Expected: failure because the live filter options include Constructions, Fractions, Integers, and Symmetry in addition to the three strands recorded by the stale assertion.

- [ ] **Step 4: Update only the stale API release-count assertions**

Change the curricula test to:

```js
assert.equal(body.curricula[0].topicCount, 50);
```

Change the coverage test to:

```js
assert.equal(body.coverage[0].standardCount, 50);
assert.equal(body.coverage[0].alignmentCount, 94);
```

Do not change runtime code or weaken any structural, codes-only, privacy, or error assertions.

- [ ] **Step 5: Update the visualizer's expanded-pilot assertions**

Use these exact expected values:

```js
assert.deepEqual(options.strands, [
    "Constructions",
    "Data Handling/Patterns",
    "Fractions",
    "Geometry/Measurement",
    "Integers",
    "Number System",
    "Symmetry",
]);
```

Keep the Number System assertions unchanged. At the existing board/class row-count assertion, use:

```js
assert.equal(alignments.filter((row) => row.board === "CBSE" && row.class === 6).length, 94);
```

After `cbseClass6MathTopicIds` and `cbseClass6MathInternalEdges` are declared, use:

```js
assert.equal(cbseClass6MathTopicIds.size, 77);
assert.equal(cbseClass6MathInternalEdges.length, 65);
assert.equal(cbseClass6MathInternalEdges.filter((dependency) => dependency.strength === "hard").length, 57);
```

Preserve the existing Geometry/Measurement and Data Handling/Patterns checks because those bounded slices have not changed.

- [ ] **Step 6: Run the affected API contract tests**

Run:

```powershell
node --test --test-name-pattern="GET /taxonomy/v1/(curricula|coverage)" scripts/easefactor-api.test.mjs
```

Expected: the two selected tests pass; all unselected tests are reported as skipped by the name filter.

- [ ] **Step 7: Run the visualizer filter contract**

Run:

```powershell
node --experimental-strip-types apps/visualizer/src/lib/alignmentFilters.test.mjs
```

Expected: exit 0 with no assertion failure. Node may print its experimental type-stripping warning.

- [ ] **Step 8: Run the complete API contract suite**

Run:

```powershell
npm run test:easefactor-api
```

Expected: 27 tests pass, 0 fail.

- [ ] **Step 9: Commit the assertion repairs**

```powershell
git add -- scripts/easefactor-api.test.mjs apps/visualizer/src/lib/alignmentFilters.test.mjs
git commit -m "fix: align curriculum tests with current release"
```

---

### Task 2: Publish the Generic Parent-and-Educator Report

**Files:**
- Create: `docs/knowledge-graph-in-education.md`
- Read: `docs/knowledge-graph.md`
- Read: `docs/curriculum-coverage.md`
- Read: `docs/licensing-and-provenance.md`
- Read: `docs/easefactor-taxonomy-integration-spec.md`

**Interfaces:**
- Consumes: the public graph mental model, strict curriculum versus learning-graph semantics, evidence fields, codes-only licensing boundaries, and current India pilot framing.
- Produces: an evergreen, implementation-neutral report for parents, teachers, tutors, and independent learners.

- [ ] **Step 1: Create the report with the approved reader-facing structure**

Create `docs/knowledge-graph-in-education.md` with these exact top-level sections:

```markdown
# Using a Learning Knowledge Graph in Education and Study

## Executive Summary
## A Connected Map Of Learning
## Why A Graph Adds Value
## What The Graph Can And Cannot Tell Us
## How Parents Can Use It At Home
## How Educators Can Use It
## How Tutors And Learning-Support Professionals Can Use It
## How Students Can Use It Independently
## Diagnostics And Foundational Gaps
## Remediation Without Starting Over
## Personalized Study Paths
## Revision And Exam Preparation
## Curriculum Coverage And Transitions
## Organizing Learning Content
## Mixed-Ability And Inclusive Learning
## Explainable AI And Human Judgment
## India-Aware Use
## Practical Scenarios
## Responsible-Adoption Checklist
## Conclusion
## Further Reading
```

Use the opening message:

```markdown
A learning knowledge graph is a connected map of concepts, skills, and
observable evidence. It can help a family or educator understand not only what
a learner is studying, but also what earlier ideas may support it, what evidence
would demonstrate understanding, and what a sensible next step might be.

The graph does not replace a parent, teacher, curriculum, textbook, or
assessment. Its value is in connecting those parts of learning and making the
reasoning behind study decisions easier to inspect.
```

- [ ] **Step 2: Write concrete audience scenarios without product-spec language**

Include at least these four scenarios:

1. A parent notices difficulty with fractions; the graph surfaces prerequisite representations, suggests a short observable activity, and recommends rechecking rather than labeling the child.
2. A teacher sees several learners struggling with area; prerequisite patterns help form temporary support groups without reducing the whole class to one level.
3. A tutor separates the visible error from its likely foundation and records new evidence after targeted practice.
4. An independent student plans revision by combining curriculum goals, weak prerequisites, and spaced review.

For the India-aware section, include CBSE/NCERT Class 6 Mathematics as an explicitly partial, codes-only example. Explain that a board view filters one canonical learning graph and does not create a separate copy of every topic.

- [ ] **Step 3: State the trust, inclusion, and privacy boundaries plainly**

The report must contain all of these principles in reader-facing prose:

- insufficient evidence means the system should say it does not know enough;
- a recommendation should explain the prerequisite, evidence, or curriculum reason behind it;
- completion is not automatically mastery;
- human judgment can override a recommendation and should remain visible;
- child observations are private product data and never belong in this public taxonomy release;
- language, disability, device access, low-bandwidth or printable delivery, household materials, and cultural context affect whether an activity is usable;
- curriculum coverage can be partial and must not be overstated;
- codes-only sources require readers to consult authorized upstream material for full text.

- [ ] **Step 4: Keep the report evergreen and link to authoritative details**

Do not copy live counts into the report. End `## Further Reading` with relative links to:

```markdown
- [Knowledge graph model](knowledge-graph.md)
- [Current curriculum coverage](curriculum-coverage.md)
- [Licensing and provenance](licensing-and-provenance.md)
- [EaseFactor product roadmap](easefactor-product-roadmap.md)
```

- [ ] **Step 5: Verify report scope and readability markers**

Run:

```powershell
rg -n "^## (How Parents|How Educators|How Tutors|How Students|India-Aware Use|Practical Scenarios|Responsible-Adoption Checklist)" docs/knowledge-graph-in-education.md
rg -n -i "not enough|partial|codes-only|privacy|human judgment|accessib|low-bandwidth|household" docs/knowledge-graph-in-education.md
rg -n "GET /|POST /|taxonomy_releases|learner_topic_mastery|implementation phase" docs/knowledge-graph-in-education.md
```

Expected: the first two commands find every required audience and trust topic. The third command returns no matches because the report is not an API or implementation spec.

- [ ] **Step 6: Commit the generic report**

```powershell
git add -- docs/knowledge-graph-in-education.md
git commit -m "docs: explain knowledge graph uses in education"
```

---

### Task 3: Create the Canonical EaseFactor Product Roadmap

**Files:**
- Create: `docs/easefactor-product-roadmap.md`
- Read: `docs/superpowers/specs/2026-07-10-parent-first-education-knowledge-graph-roadmap-design.md`
- Read: `docs/easefactor-reference-slice.md`
- Read: `docs/curriculum-coverage.md`

**Interfaces:**
- Consumes: approved parent-first architecture, live reference capabilities, product-owned boundaries, and current India pilot coverage.
- Produces: the authoritative capability-status and sequencing document for EaseFactor and public integrators.

- [ ] **Step 1: Create the roadmap identity and status vocabulary**

Start the document with:

```markdown
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
```

- [ ] **Step 2: Add the current capability and ownership matrix**

Include this table and preserve the distinctions:

```markdown
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
```

- [ ] **Step 3: Add the approved parent-first outcome and architecture boundary**

State the initial product outcome verbatim:

```markdown
Help an Indian parent understand what their Class 6 child is struggling with,
why it matters, and what useful activity to do next—without requiring the
parent to understand the raw curriculum graph.
```

Explain the three layers: public Marble knowledge, audience-neutral learning intelligence, and parent/student/teacher experiences. State that the first experience is parent-first, while learner state, graph reasoning, content mapping, and planning remain reusable.

- [ ] **Step 4: Add the six approved phases as independently pickable tranches**

Use these phase headings and acceptance outcomes:

```markdown
## Phase 0: Repair And Consolidate The Foundation
## Phase 1: Parent Companion Vertical Slice
## Phase 2: Make It Useful In Indian Homes
## Phase 3: Curriculum And Content Expansion
## Phase 4: Student And Teacher Reuse
## Phase 5: Quality, Governance, And Scale
```

Under Phase 0, list the work in this implementation plan and mark items complete only after verification.

Under Phase 1, define the vertical slice as parent setup, plain-language concern, short diagnostic, mastery summary, root-cause explanation, ordered remediation, one reviewed household activity, parent observation, recheck, and weekly summary for one Class 6 Mathematics topic family.

Under Phase 2, include English/Hindi terminology, Indian contexts and units, household-material activities, printable/low-bandwidth/messaging-friendly output, flexible session lengths, shared devices, consent and privacy, confidence-aware wording, revision, and parent feedback.

Under Phase 3, include Class 6 algebraic-patterning cleanup, full mapping review, adjacent Mathematics classes, later Science expansion, bounded ICSE/state-board mappings, codes-only preservation, coverage-gap reporting, and content alternatives.

Under Phase 4, split independent-student and teacher/school reuse into separate subsections.

Under Phase 5, include version migrations, deterministic decision logs, recommendation evaluation, bias checks, human review, helpfulness analytics, retention/access policies, offline resilience, synthetic public examples, and release gates.

- [ ] **Step 5: Add trust semantics and the immediate next tranche**

Include a `## Trust And Failure Semantics` section covering insufficient evidence, missing prerequisite observations, missing reviewed content, partial mappings, unknown topic IDs, version mismatches, explanations, visible overrides, codes-only text, and the non-clinical/non-psychological guidance boundary.

End with:

```markdown
## Next Implementation Tranche

Build one production-oriented parent journey for a reviewed CBSE/NCERT Class 6
Mathematics topic family in the EaseFactor product repository. Before UI work,
define the product-owned learner-evidence store, consent boundary, reviewed
content contract, and measurable parent outcome. Do not add those product
systems to this taxonomy release repository.
```

- [ ] **Step 6: Verify status vocabulary, ownership, and phase completeness**

Run:

```powershell
rg -n "`(available|reference-only|planned|product-owned|out-of-scope)`" docs/easefactor-product-roadmap.md
rg -n "^## Phase [0-5]:|^## Trust And Failure Semantics|^## Next Implementation Tranche" docs/easefactor-product-roadmap.md
rg -n -i "parent|student|teacher|Marble taxonomy|EaseFactor|codes-only|partial" docs/easefactor-product-roadmap.md
```

Expected: all five status values, all six phases, all three future audiences, explicit ownership, and codes-only/partial-coverage boundaries are present.

- [ ] **Step 7: Commit the canonical roadmap**

```powershell
git add -- docs/easefactor-product-roadmap.md
git commit -m "docs: add canonical EaseFactor product roadmap"
```

---

### Task 4: Reconcile Public Documentation Roles And Counts

**Files:**
- Modify: `README.md`
- Modify: `docs/README.md`
- Modify: `docs/validation-and-release.md`
- Modify: `docs/curriculum-coverage.md`
- Modify: `docs/easefactor-taxonomy-integration-spec.md`
- Modify: `docs/easefactor-reference-slice.md`

**Interfaces:**
- Consumes: the new generic report, canonical roadmap, live manifest counts, and existing stable integration/reference documents.
- Produces: one discoverable public documentation hierarchy with no competing status source.

- [ ] **Step 1: Correct the public count baselines**

In `docs/README.md`, change:

```markdown
- `data/curriculum-standards.json`: 8 curriculum sources and 3,311 standards or
  standard codes.
- `data/curriculum-alignments.json`: 94 reviewed board/class/subject alignment
  rows for richer filtering metadata.
```

In `docs/validation-and-release.md`, change the documented baseline to:

```markdown
- 3,311 standards or standard codes.
- 94 curriculum alignment rows.
```

Do not change `data/manifest.json`; the data already validates.

- [ ] **Step 2: Make the new report and roadmap discoverable**

In the root `README.md` documentation area, add links with these descriptions:

```markdown
- [`docs/knowledge-graph-in-education.md`](docs/knowledge-graph-in-education.md):
  a reader-facing report on how parents, educators, tutors, and students can
  use a learning knowledge graph.
- [`docs/easefactor-product-roadmap.md`](docs/easefactor-product-roadmap.md):
  the canonical EaseFactor capability-status and product-sequencing roadmap.
```

In `docs/README.md`, place the generic report immediately after the knowledge-graph model and the roadmap immediately before the integration spec. Describe the four roles explicitly: public education report, product roadmap, technical architecture, and runnable reference.

- [ ] **Step 3: Declare curriculum coverage as the volatile-count authority**

After the opening paragraph in `docs/curriculum-coverage.md`, add:

```markdown
This document is the canonical documentation source for current curriculum,
source-key, and alignment counts. Product roadmaps, integration guides, and
dated planning records should link here instead of copying volatile coverage
snapshots.
```

- [ ] **Step 4: Keep the integration spec stable and redirect changing sequencing**

After the title in `docs/easefactor-taxonomy-integration-spec.md`, add:

```markdown
> **Document role:** This file defines stable product philosophy, architecture,
> API shape, and integration boundaries. For current capability status,
> ownership, and implementation sequencing, see the
> [EaseFactor product roadmap](easefactor-product-roadmap.md).
```

Replace the existing `## Implementation Phases` section with:

```markdown
## Product Roadmap

Implementation status and sequencing change more frequently than this
architecture. The canonical phase plan, India parent-first priorities, and
future student and teacher reuse are maintained in the
[EaseFactor product roadmap](easefactor-product-roadmap.md).
```

Rename `## What Must Be In Place` to `## Product Integration Prerequisites`; retain its technical, product, data, and governance foundation lists because they are stable prerequisites.

Replace `## Open Product Decisions` and `## Recommended First Build` through the end of the file with:

```markdown
## Product Decisions And Sequencing

The first audience, curriculum slice, parent outcome, capability status, and
next implementation tranche are maintained in the
[EaseFactor product roadmap](easefactor-product-roadmap.md). Keeping those
decisions in one canonical roadmap prevents this stable integration reference
from becoming a second backlog.
```

- [ ] **Step 5: Clarify the runnable reference role**

After the opening description in `docs/easefactor-reference-slice.md`, add:

```markdown
> **Document role:** This file documents behavior that is runnable in this
> repository with synthetic request data. It is not the product backlog. See
> the [EaseFactor product roadmap](easefactor-product-roadmap.md) for current
> status, ownership, and next steps.
```

Do not remove endpoint documentation, synthetic-data boundaries, errors, service mappings, licensing, or privacy constraints.

- [ ] **Step 6: Verify public documentation links and authority language**

Run:

```powershell
rg -n "knowledge-graph-in-education|easefactor-product-roadmap" README.md docs/README.md docs/easefactor-taxonomy-integration-spec.md docs/easefactor-reference-slice.md
rg -n "canonical documentation source|Document role|not the product backlog|Product Roadmap" docs
rg -n "3,301|76 reviewed|76 curriculum" README.md docs/README.md docs/validation-and-release.md docs/curriculum-coverage.md docs/easefactor-taxonomy-integration-spec.md docs/easefactor-reference-slice.md
```

Expected: the first two commands show the new routing and authority notes. The final command returns no matches in public/current documents.

- [ ] **Step 7: Commit the public documentation reconciliation**

```powershell
git add -- README.md docs/README.md docs/validation-and-release.md docs/curriculum-coverage.md docs/easefactor-taxonomy-integration-spec.md docs/easefactor-reference-slice.md
git commit -m "docs: consolidate knowledge graph guidance"
```

---

### Task 5: Mark Dated Planning Records As Historical

**Files:**
- Create: `docs/superpowers/README.md`
- Modify: `docs/superpowers/specs/2026-07-09-india-board-alignment-infrastructure-design.md`
- Modify: `docs/superpowers/specs/2026-07-09-cbse-ncert-class-6-math-pilot-mapping-design.md`
- Modify: `docs/superpowers/specs/2026-07-09-cbse-ncert-class-6-math-pilot-coverage-qa.md`
- Modify: `docs/superpowers/specs/2026-07-09-cbse-ncert-class-6-math-pilot-coverage-audit.md`
- Modify: `docs/superpowers/plans/2026-07-09-india-board-alignment-infrastructure.md`
- Modify: `docs/superpowers/plans/2026-07-09-cbse-ncert-class-6-math-pilot-mapping.md`
- Modify: `docs/superpowers/plans/2026-07-09-cbse-ncert-class-6-math-pilot-coverage-qa-expansion.md`

**Interfaces:**
- Consumes: dated implementation records and the new canonical roadmap/coverage authorities.
- Produces: a navigable historical record that cannot be mistaken for live backlog or current counts.

- [ ] **Step 1: Create the historical-record index**

Create `docs/superpowers/README.md` with:

```markdown
# Dated Design And Implementation Records

Files under `specs/` and `plans/` record the decisions and execution state of a
particular tranche at a particular time. They are retained for provenance and
review history. They are not the current product backlog and their embedded
counts may describe an earlier release snapshot.

Use these current authorities instead:

- [EaseFactor product roadmap](../easefactor-product-roadmap.md): current
  capability status, ownership, and sequencing.
- [Curriculum coverage](../curriculum-coverage.md): current curriculum,
  source-key, and alignment counts.
- [EaseFactor reference slice](../easefactor-reference-slice.md): runnable
  repository behavior.

Historical commands, expected outputs, worksheets, and row counts should remain
unchanged unless the record itself is incorrect about what happened at that
time.
```

- [ ] **Step 2: Add completed-history notes to the infrastructure records**

After the title in both the infrastructure design and infrastructure plan, add:

```markdown
> **Status: completed historical record.** The alignment infrastructure has
> landed. For current release counts and coverage, see
> [`docs/curriculum-coverage.md`](../../curriculum-coverage.md). For current
> product sequencing, see
> [`docs/easefactor-product-roadmap.md`](../../easefactor-product-roadmap.md).
```

Adjust relative paths in the plan/spec files only if needed to resolve from their actual directory. From both `docs/superpowers/specs/` and `docs/superpowers/plans/`, use `../../curriculum-coverage.md` and `../../easefactor-product-roadmap.md`.

- [ ] **Step 3: Add completed-history notes to the first pilot records**

After the title in both the pilot-mapping design and pilot-mapping plan, add:

```markdown
> **Status: completed historical record.** This file describes the first
> bounded NCERT/CBSE pilot slice. Later reviewed slices expanded the release.
> Use [`docs/curriculum-coverage.md`](../../curriculum-coverage.md) for current
> counts and [`docs/easefactor-product-roadmap.md`](../../easefactor-product-roadmap.md)
> for current sequencing.
```

- [ ] **Step 4: Replace misleading “current” notes in the QA records**

At the top of the QA design, QA audit, and QA expansion plan, use:

```markdown
> **Status: historical snapshot.** Counts, findings, and next-slice guidance in
> this file describe the reviewed release state at the time of this tranche.
> They are preserved as implementation evidence, not current backlog. See
> [`docs/curriculum-coverage.md`](../../curriculum-coverage.md) for live counts
> and [`docs/easefactor-product-roadmap.md`](../../easefactor-product-roadmap.md)
> for current sequencing.
```

Delete or replace only a top-level sentence that incorrectly calls 40 keys / 76 rows the current release. Preserve row-level worksheets, expected command outputs, and dated findings as historical evidence.

- [ ] **Step 5: Verify every misleading record has an authority redirect**

Run:

```powershell
rg -n "Status: (completed historical record|historical snapshot)" docs/superpowers/specs docs/superpowers/plans
rg -n "current release state is 40 source keys|current .* state is 40 source keys" docs/superpowers/specs docs/superpowers/plans
```

Expected: the first command finds all seven modified dated records. The second command returns no matches. Historical `76` values remain inside dated evidence where they correctly describe that tranche.

- [ ] **Step 6: Commit the historical-status consolidation**

```powershell
git add -- docs/superpowers/README.md docs/superpowers/specs/2026-07-09-india-board-alignment-infrastructure-design.md docs/superpowers/specs/2026-07-09-cbse-ncert-class-6-math-pilot-mapping-design.md docs/superpowers/specs/2026-07-09-cbse-ncert-class-6-math-pilot-coverage-qa.md docs/superpowers/specs/2026-07-09-cbse-ncert-class-6-math-pilot-coverage-audit.md docs/superpowers/plans/2026-07-09-india-board-alignment-infrastructure.md docs/superpowers/plans/2026-07-09-cbse-ncert-class-6-math-pilot-mapping.md docs/superpowers/plans/2026-07-09-cbse-ncert-class-6-math-pilot-coverage-qa-expansion.md
git commit -m "docs: label superseded planning snapshots"
```

---

### Task 6: Run The Documentation And Repository Release Gate

**Files:**
- Verify: `README.md`
- Verify: `docs/**/*.md`
- Verify: `scripts/easefactor-api.test.mjs`
- Verify: `apps/visualizer/src/lib/alignmentFilters.test.mjs`
- Verify: `data/*.json`
- Modify only if verification exposes a defect in the files changed by Tasks 1-5.

**Interfaces:**
- Consumes: every deliverable from Tasks 1-5.
- Produces: a clean, internally linked, release-valid documentation and reference-test tranche.

- [ ] **Step 1: Check Markdown-relative links**

Run:

```powershell
@'
import fs from 'node:fs';
import path from 'node:path';

function markdownFiles(root) {
  return fs.readdirSync(root, {withFileTypes: true}).flatMap((entry) => {
    const target = path.join(root, entry.name);
    if (entry.isDirectory()) return markdownFiles(target);
    return entry.isFile() && entry.name.endsWith('.md') ? [target] : [];
  });
}

function withoutFencedCode(text) {
  const lines = text.split(/\r?\n/);
  let fence = null;
  return lines.map((line) => {
    const match = line.match(/^ {0,3}(`{3,}|~{3,})/);
    if (!fence && match) {
      fence = {character: match[1][0], length: match[1].length};
      return '';
    }
    if (fence) {
      const closing = line.match(/^ {0,3}(`{3,}|~{3,})\s*$/);
      if (closing && closing[1][0] === fence.character && closing[1].length >= fence.length) {
        fence = null;
      }
      return '';
    }
    return line;
  }).join('\n');
}

const files = ['README.md', ...markdownFiles('docs')];
const missing = [];
for (const file of files) {
  const text = withoutFencedCode(fs.readFileSync(file, 'utf8'));
  for (const match of text.matchAll(/\[[^\]]+\]\(([^)]+)\)/g)) {
    const raw = match[1].trim().replace(/^<|>$/g, '');
    if (/^(https?:|mailto:|#)/i.test(raw)) continue;
    const withoutAnchor = raw.split('#')[0];
    if (!withoutAnchor) continue;
    const resolved = path.resolve(path.dirname(file), decodeURIComponent(withoutAnchor));
    if (!fs.existsSync(resolved)) missing.push({file, link: raw});
  }
}
if (missing.length) {
  console.error(JSON.stringify(missing, null, 2));
  process.exit(1);
}
console.log(`valid — ${files.length} Markdown files have resolvable local links`);
'@ | node --input-type=module
```

Expected: exit 0 with a `valid` summary. Fix only broken links introduced or exposed by this documentation consolidation.

The checker intentionally removes fenced code blocks before matching links.
The original version treated Markdown-like examples inside fenced code as real
links, producing false positives for example paths while checking actual prose
links correctly.

- [ ] **Step 2: Sweep current documents for stale India counts**

Run:

```powershell
rg -n "3,301|26 NCERT|26 source|76 reviewed|76 curriculum|40 source keys and 76" README.md docs/README.md docs/validation-and-release.md docs/curriculum-coverage.md docs/knowledge-graph-in-education.md docs/easefactor-product-roadmap.md docs/easefactor-taxonomy-integration-spec.md docs/easefactor-reference-slice.md
```

Expected: no matches. Do not apply this assertion to dated historical plan bodies, which intentionally preserve snapshot evidence.

- [ ] **Step 3: Confirm no restricted India text or private data was introduced**

Run:

```powershell
git diff HEAD~5 -- docs README.md scripts/easefactor-api.test.mjs apps/visualizer/src/lib/alignmentFilters.test.mjs | rg -n -i "student name|child name|email|phone|address|chapter text|exercise text|syllabus text|upstream standard text"
```

Expected: no added real-person data or copied upstream text. Descriptive statements explaining that such text is excluded are acceptable on manual inspection.

- [ ] **Step 4: Run the repository validator**

Run:

```powershell
npm run validate
```

Expected:

```text
✓ valid — 1590 topics, 3221 dependencies, 3311 standards, 94 alignments, 183 clusters. Referential integrity + checksums OK.
```

- [ ] **Step 5: Run both EaseFactor suites**

Run:

```powershell
npm run test:easefactor
npm run test:easefactor-api
```

Expected: 19 reference tests pass and 27 API tests pass, with 0 failures.

- [ ] **Step 6: Run the visualizer verification set**

Run:

```powershell
node --experimental-strip-types apps/visualizer/src/lib/alignmentFilters.test.mjs
npm --prefix apps/visualizer run typecheck
npm --prefix apps/visualizer run build
```

Expected: the standalone filter contract exits 0, type checking passes, and the production build completes successfully.

- [ ] **Step 7: Check formatting and repository state**

Run:

```powershell
git diff --check
git status --short
```

Expected: `git diff --check` has no output. `git status --short` is empty unless the implementation-plan file itself remains intentionally uncommitted.

- [ ] **Step 8: Commit any verification-only corrections**

If Steps 1-6 required corrections to files already in scope:

```powershell
git add -- README.md docs scripts/easefactor-api.test.mjs apps/visualizer/src/lib/alignmentFilters.test.mjs
git commit -m "docs: close knowledge graph roadmap verification gaps"
```

If no corrections were needed, do not create an empty commit.

---

## Final Handoff Checklist

- [ ] Generic parent-and-educator report is public, approachable, and count-light.
- [ ] Canonical roadmap distinguishes status, owner, and repository boundary.
- [ ] Parent-first Class 6 Mathematics sequence is explicit and extensible.
- [ ] Student and teacher reuse remains a future experience over shared services.
- [ ] Public/current documentation uses 3,311 standards, 50 NCERT source keys, and 94 alignments where counts are necessary.
- [ ] Historical plans are clearly non-authoritative without rewriting dated evidence.
- [ ] Codes-only and private-data boundaries are preserved.
- [ ] All local Markdown links resolve.
- [ ] Root validation passes.
- [ ] EaseFactor reference and API tests pass.
- [ ] Visualizer alignment filters, type checking, and production build pass.
- [ ] Worktree state and commits are reported exactly.
