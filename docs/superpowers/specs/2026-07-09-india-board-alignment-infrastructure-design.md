# India Board Alignment Infrastructure Design

> **Status: completed historical record.** The alignment infrastructure has
> landed. For current release counts and coverage, see
> [`docs/curriculum-coverage.md`](../../curriculum-coverage.md). For current
> product sequencing, see
> [`docs/easefactor-product-roadmap.md`](../../easefactor-product-roadmap.md).

## Goal

Add the data-model foundation needed to filter the Marble Skill Taxonomy by
board, class, subject, and curriculum source without duplicating the canonical
topic graph or adding Indian curriculum records in this tranche.

## Scope

This tranche is infrastructure-only. It creates the alignment layer, schema,
validator support, manifest accounting, and documentation needed for future
NCERT, CBSE, and CISCE/ICSE mapping work.

This tranche does not add NCERT, CBSE, CISCE, ICSE, or ISC source records. It
does not add board-specific topic mappings, new micro-topics, new dependencies,
or a filtering script.

## Architecture

The repository keeps one canonical Marble graph:

- `data/topics.json` contains curriculum-neutral micro-topics.
- `data/dependencies.json` contains canonical prerequisite edges.
- `data/curriculum-standards.json` contains external curriculum source records.

Board-specific filtering is represented by a new first-class alignment file:

- `data/curriculum-alignments.json`
- `schema/curriculum-alignments.schema.json`

Each alignment row joins one canonical `topicId` to one external `standardKey`
and carries filter metadata such as curriculum, country, board, class, subject,
strand, unit, match type, confidence, and mapping source.

`topics[].standards` remains in place for backward compatibility as a lightweight
standard-key reference list. `curriculum-alignments.json` becomes the richer
board/class filtering layer for future work.

## Data Contract

Initial `data/curriculum-alignments.json` content:

```json
{
  "version": "v1",
  "alignmentCount": 0,
  "alignments": []
}
```

Alignment record shape:

```json
{
  "topicId": "mt_...",
  "standardKey": "cbse-2026-27:math.6.number-system.001",
  "curriculum": "cbse-2026-27",
  "country": "IN",
  "board": "CBSE",
  "class": 6,
  "subject": "Mathematics",
  "strand": "Number System",
  "unit": "Playing with Numbers",
  "matchType": "direct",
  "confidence": "reviewed",
  "source": "manual"
}
```

Required alignment fields:

- `topicId`
- `standardKey`
- `curriculum`
- `country`
- `board`
- `subject`
- `matchType`
- `confidence`
- `source`

Optional alignment fields:

- `class`
- `stage`
- `strand`
- `unit`
- `notes`

Allowed values:

- `matchType`: `direct`, `partial`, `supporting`, `extension`
- `confidence`: `machine`, `reviewed`, `verified`
- `source`: `manual`, `machine`, `imported`

Field semantics:

- `topicId` is the canonical Marble micro-topic ID and must resolve to
  `data/topics.json`.
- `standardKey` is a key from `data/curriculum-standards.json`.
- `curriculum` must be an existing curriculum slug and must match the prefix of
  `standardKey`.
- `board` is the product-facing board label, such as `CBSE`, `NCERT`, `ICSE`, or
  `ISC`.
- `class` is the Indian class or grade number where applicable.
- `matchType` describes how strongly the source item maps to the topic.
- `confidence` records mapping review state.
- `source` records how the mapping was produced.

## Validation

Extend `scripts/validate.mjs` without adding runtime dependencies.

New checks:

- `data/curriculum-alignments.json` exists and parses.
- `alignmentCount` equals `alignments.length`.
- Each `alignment.topicId` exists in `topics.json`.
- Each `alignment.standardKey` exists in `curriculum-standards.json`.
- Each `alignment.curriculum` exists as a curriculum slug.
- Each `alignment.standardKey` starts with `${alignment.curriculum}:`.
- `matchType` is one of `direct`, `partial`, `supporting`, `extension`.
- `confidence` is one of `machine`, `reviewed`, `verified`.
- `source` is one of `manual`, `machine`, `imported`.
- Duplicate `(topicId, standardKey)` pairs are rejected.

Do not enforce parity between `topics[].standards` and
`curriculum-alignments.json` in this tranche. That can become a later migration
once existing standard links have been backfilled into the richer alignment
file.

## Manifest

Update `data/manifest.json`:

- Add `curriculumAlignments: 0` under `counts`.
- Add `curriculum-alignments.json` under `files` with byte count and SHA-256
  checksum.

The existing validator checksum loop should automatically validate the new file
once it is listed in `manifest.files`.

## Filtering Semantics

Document two future board-specific graph modes.

`strictBoardGraph` includes:

- topics directly selected by matching rows in `curriculum-alignments.json`
- dependencies only where both endpoints are inside the selected topic set

Use this when a product surface needs to show only what a board, class, and
subject explicitly cover.

`learningGraph` includes:

- directly aligned topics
- prerequisite closure from the canonical dependency graph
- dependencies among direct and prerequisite-closure topics

Use this when a product surface needs a pedagogically useful learning path that
also includes foundations the board may assume but not explicitly list.

This tranche documents these modes but does not implement a graph-filtering
script.

## Documentation

Update these docs during implementation:

- `README.md`
- `docs/data-model.md`
- `docs/knowledge-graph.md`
- `docs/curriculum-coverage.md`
- `docs/validation-and-release.md`
- `PROVENANCE.md`

`PROVENANCE.md` should state that `curriculum-alignments.json` contains
Marble-authored mapping metadata and no new upstream curriculum text in this
tranche.

## Verification

Run:

```bash
npm run validate
```

Expected result: validation passes with the new alignment file included in
manifest checksum verification.
