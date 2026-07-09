# CBSE/NCERT Class 6 Math Pilot Mapping Design

## Goal

Add the first India board-alignment pilot by mapping a small, reviewable slice
of NCERT Class 6 Mathematics to existing Marble Mathematics topics through the
new curriculum alignment layer.

## Scope

This is a separate tranche after the India board alignment infrastructure.

The pilot adds:

- one codes-only curriculum source record for NCERT Class 6 Mathematics
- a small set of codes-only source entries for selected Class 6 Math learning
  units
- reviewed alignment rows from those source keys to existing Marble topics
- manifest count and checksum updates
- provenance and coverage documentation for the new codes-only India source

The pilot does not add full upstream textbook, syllabus, exemplar, or standard
text. It does not add per-child, school, teacher, private, or customer data. It
does not add new runtime dependencies, build tooling, lockfiles, topics,
dependencies, or a filtering script.

## Source Posture

Use official public source URLs for provenance, but encode the source as
codes-only unless rights clearance is explicitly confirmed later.

Recommended source model:

- `slug`: `ncert-class6-math-2026-27`
- `country`: `IN`
- `name`: `NCERT Class 6 Mathematics`
- `version`: `2026-27`
- `textIncluded`: `false`
- `sourceUrl`: official NCERT textbook listing or official NCERT PDF URL

Use CBSE as alignment metadata, not as a duplicate curriculum source, for this
pilot:

- `curriculum`: `ncert-class6-math-2026-27`
- `country`: `IN`
- `board`: `CBSE`
- `class`: `6`
- `subject`: `Mathematics`
- `source`: `manual`
- `confidence`: `reviewed`

If a later tranche identifies a distinct official CBSE Class 6 Mathematics
source that should be encoded separately, add it as a separate codes-only
curriculum source then. This pilot should avoid duplicating NCERT and CBSE
records for the same underlying content.

## Pilot Slice

Start with one compact Class 6 Mathematics slice that is easy to validate
manually and likely to map well to existing Marble topics.

Recommended pilot slice:

- whole numbers and number sense
- factors and multiples
- prime and composite numbers
- common factors and common multiples
- divisibility reasoning where represented in existing Marble topics

The mapping should be limited enough for a reviewer to inspect every row in one
session. A target of 8-15 source keys and 15-40 alignment rows is appropriate
for the first tranche.

## Codes-Only Keying

Add source keys that are factual identifiers, not copied upstream text.

Recommended key pattern:

```text
ncert-class6-math-2026-27:M6.NS.001
```

Where:

- `M6` means Mathematics Class 6.
- `NS` means the local Number System pilot strand.
- the final number is stable within this repo.

Each source entry should include only:

```json
{
  "key": "ncert-class6-math-2026-27:M6.NS.001",
  "code": "M6.NS.001"
}
```

Do not add `data`, `description`, `title`, `learningOutcome`, exercise text,
chapter prose, or upstream standard wording for this source.

## Mapping Rules

Only map to existing Marble topic IDs in `data/topics.json`.

Use `matchType` as follows:

- `direct`: the Marble topic substantially represents the source concept.
- `partial`: the Marble topic covers part of the source concept.
- `supporting`: the Marble topic is prerequisite or adjacent support.
- `extension`: the Marble topic goes beyond the source concept but is relevant
  to the learning path.

Use `confidence: reviewed` for rows inspected manually in this pilot. Reserve
`verified` for a later second-person or scripted review pass.

Keep `notes` short and Marble-authored if used. Do not paste upstream wording in
notes.

## Validation

The existing validator should reject bad references, duplicate alignment pairs,
bad enum values, count mismatches, and checksum mismatches.

This tranche should also add a regression check for codes-only India sources so
future edits cannot accidentally add a `data` object to
`ncert-class6-math-2026-27` records.

## Documentation

Update:

- `README.md`
- `docs/curriculum-coverage.md`
- `docs/data-model.md` only if field semantics need clarification
- `docs/validation-and-release.md`
- `PROVENANCE.md`

The documentation should say that the first India pilot ships source keys and
Marble-authored alignment metadata only, with no upstream standard or textbook
text included.

## Verification

Run:

```bash
npm run validate
```

Expected result: validation passes with the new source count, standard count,
alignment count, and manifest checksums updated.
