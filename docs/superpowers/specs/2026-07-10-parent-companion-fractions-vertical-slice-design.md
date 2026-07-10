# Parent Companion Fractions Vertical Slice Design

**Status:** Approved design for the first Phase 1 implementation tranche.

## Decision

Build one dependency-free, synthetic, request-local parent companion journey
for the reviewed CBSE/NCERT Class 6 Mathematics Fractions family. The journey
targets **Comparing fractions** (`mt_IfEgu0X449`) and identifies **Fractions on
a number line** (`mt_Kr3IyA6m-O`) as the foundational gap when the submitted
evidence supports that conclusion.

The repository will expose the journey as an audience-neutral reference
function and a thin local HTTP contract. It will not add a production UI,
authentication, persistent learner storage, consent administration, or broader
curriculum routing.

## Outcome

The journey helps a parent answer two actionable questions without needing to
understand curriculum codes or graph terminology:

1. What foundational idea is making fraction comparison difficult?
2. What should we do first at home?

The measurable outcome contract asks the parent to identify both the
foundational gap and the first recommended action. The outcome succeeds only
when both responses match the journey result. This reference contract proves
that the output is understandable and actionable; product usability research
with real parents remains EaseFactor-owned.

## Selected Reviewed Topic Family

The slice uses existing Marble topic IDs and reviewed codes-only alignment
metadata:

| Role | Topic ID | Topic |
|---|---|---|
| Target | `mt_IfEgu0X449` | Comparing fractions |
| Foundational gap | `mt_Kr3IyA6m-O` | Fractions on a number line |
| Supporting prerequisite | `mt_cFltwUQi-d` | Fractions of amounts |
| Supporting prerequisite | `mt_vKcxX6iNOA` | Fraction Notation |

No NCERT syllabus, textbook, exercise, exemplar, or upstream standard text is
copied, inferred, or reconstructed.

## Architecture

### Reference function

Add `buildParentCompanionJourney(graph, request)` to
`scripts/easefactor-reference.mjs`. It composes the existing mastery,
readiness, learning-gap, diagnostic, remediation, and content-validation
primitives. It returns one deterministic journey object and does not mutate the
graph or persist request data.

### Local HTTP contract

Add `POST /companion/v1/parent-journey` to
`scripts/easefactor-api.mjs`. The route validates the fixed slice context,
privacy boundary, consent assertion, synthetic evidence, and household
activity contract before calling the reference function.

The local endpoint is a runnable contract example, not a production product
backend.

### Reviewed household activity

Keep the fixed activity contract in the reference layer beside the journey
builder. The activity is repository-authored and reviewed for this slice. It
uses paper strips and a drawn number line to compare fraction positions using
common household materials.

The activity contract contains:

- stable activity ID and version;
- review status and review scope;
- target and prerequisite topic IDs;
- title, purpose, materials, and estimated duration;
- ordered parent instructions;
- observable learner evidence prompts;
- accessibility and safety notes; and
- a plain-language selection reason.

Only `reviewed` activity content may be served by this journey.

## Request Contract

The endpoint accepts one JSON object with these sections:

### Context

- `board`: `CBSE`
- `curriculum`: `ncert-class6-math-2026-27`
- `class`: `6`
- `subject`: `Mathematics`
- `language`: `en-IN`
- `topicFamily`: `fractions-comparison`

This first tranche accepts only those exact values. Generalized curriculum,
language, and topic-family selection belongs to later phases.

### Parent concern

The supported concern has stable ID `fraction-size-comparison` and
plain-language text:

> My child finds it hard to tell which fraction is bigger.

The request uses the stable concern ID. The response supplies the reviewed
plain-language text, preventing arbitrary free text from becoming an
unreviewed classifier or persistence channel.

### Consent and privacy assertion

The request declares:

- `evidenceMode`: `synthetic`;
- `consent.purpose`: `diagnostic-guidance`;
- `consent.scope`: `request-only`; and
- `consent.observationCapture`: `request-only`.

These fields assert the boundary required to exercise the reference contract.
They are not authentication, legal consent capture, consent withdrawal, audit
logging, retention management, deletion, or export implementation.

The request must not contain a learner name, parent name, email address, phone
number, postal address, persistent learner ID, customer ID, account ID, or a
storage/persistence request. Production identifiers and consent records belong
in private EaseFactor product systems.

### Synthetic learner evidence

The request contains separate `diagnosticEvents` and `recheckEvents` arrays in
the existing synthetic mastery-event format. Diagnostic evidence establishes
the initial state. Recheck evidence is evaluated separately after the activity
and never overwrites or masquerades as the initial diagnostic trail.

The canonical successful fixture shows secure Fraction Notation evidence,
weak Fractions-on-a-number-line evidence, and a later recheck observation.
Tests use synthetic timestamps and no private identifiers.

## Deterministic Journey Response

For identical inputs and taxonomy data, the function returns identical content
and ordering:

1. `intake`: reviewed context and the plain-language concern;
2. `diagnostic`: three ordered prompts covering fraction meaning, number-line
   placement, and fraction comparison;
3. `foundationalGap`: the evidence-backed number-line gap, or an explicit
   `not-enough-information` state;
4. `explanation`: a confidence-aware, parent-readable reason the gap affects
   fraction comparison;
5. `remediationSteps`: locate benchmark fractions, place fractions between
   zero and one, then compare positions;
6. `activity`: the reviewed paper-strip number-line activity and selection
   reason;
7. `recheck`: a fresh comparison prompt and a separately derived result; and
8. `parentOutcome`: the two-part comprehension and action check with its exact
   success rule.

The journey must not call the learner lazy, weak, behind, deficient, or assign
a formal diagnosis. It describes only what the submitted evidence currently
supports.

## Failure Semantics

The API returns typed, explainable errors:

| Condition | HTTP status | Error code |
|---|---:|---|
| Malformed JSON | 400 | `invalid_json` |
| Unsupported board, curriculum, class, subject, language, topic family, or concern | 400 | `unsupported_parent_journey_context` |
| Missing or invalid consent assertion | 400 | `invalid_consent_boundary` |
| Evidence mode is not synthetic | 400 | `synthetic_evidence_required` |
| Prohibited identifier or persistence field is supplied | 400 | `private_data_not_allowed` |
| Evidence is malformed, version-mismatched, or outside the three reviewed topics | 400 | `invalid_parent_journey_evidence` |
| Activity mapping is not reviewed or references unknown topics | 500 | `invalid_reviewed_activity` |
| Request body exceeds the existing limit | 413 | `request_body_too_large` |

Missing or inconclusive diagnostic evidence is a successful journey response
with `foundationalGap.status` set to `not-enough-information`. It recommends a
proportionate diagnostic prompt and does not fabricate a gap.

## Testing Strategy

Use Node's built-in test runner and preserve a visible red-green trail.

Reference-layer tests cover:

- the complete Comparing-fractions journey;
- deterministic ordering and output;
- evidence-backed selection of the number-line gap;
- the `not-enough-information` path;
- separation of diagnostic and recheck evidence;
- reviewed household-activity validation; and
- the exact two-part parent-outcome success rule.

HTTP contract tests cover:

- the successful synthetic request;
- unsupported context and concern;
- missing or invalid consent;
- non-synthetic evidence;
- prohibited private identifiers and persistence requests;
- unknown topic IDs;
- malformed and oversized request bodies; and
- parity with the reference-function response.

The full verification gate is:

```powershell
npm run validate
npm run test:easefactor
npm run test:easefactor-api
git diff --check
```

## Documentation Changes

After the runnable contract exists:

- update `docs/easefactor-reference-slice.md` with the endpoint, request-local
  privacy boundary, synthetic fixture, activity contract, and verification
  command;
- update `docs/easefactor-product-roadmap.md` to mark this bounded repository
  reference contract `reference-only`, while leaving the production parent
  companion and product-owned storage/consent/UI work planned; and
- do not change curriculum coverage counts or released taxonomy JSON unless a
  later reviewed data tranche explicitly requires it.

## Explicitly Outside This Tranche

- production UI or interaction design;
- authentication, authorization, accounts, or tenant boundaries;
- persistent learner evidence or household observations;
- production consent capture, withdrawal, audit, deletion, retention, or
  export;
- arbitrary concern classification or natural-language interpretation;
- Hindi or other language presentation;
- broader Fractions, class, board, subject, or curriculum expansion;
- weekly summaries, messaging delivery, notifications, or analytics; and
- real learner, parent, household, customer, classroom, or school data.
