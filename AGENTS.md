# Agent Instructions

This repository publishes the Marble Skill Taxonomy: a small, data-only Node
project containing JSON datasets, JSON Schemas, licensing/provenance notes, and
a dependency-free validation script.

## Repository Shape

- `data/` holds the released taxonomy JSON files.
- `schema/` holds JSON Schema definitions for the data files.
- `scripts/validate.mjs` checks structure, referential integrity, manifest
  counts, and SHA-256 checksums.
- `README.md`, `PROVENANCE.md`, `LICENSE`, `LICENSE-CONTENT`, and
  `CITATION.cff` define the public contract for use, attribution, and upstream
  licensing.
- `media/` contains the visualization assets referenced by the README.

## Commands

- Validate the release:

  ```bash
  npm run validate
  ```

- The validation script has no third-party runtime dependencies. A fresh
  `npm install` is not required unless dependencies are added later.

## Editing Guidelines

- Treat this as a dataset release, not an application. Avoid introducing build
  tooling, frameworks, generated lockfiles, or runtime dependencies unless the
  task explicitly requires them.
- Keep edits tightly scoped. Prefer direct JSON/schema/doc updates over new
  abstractions.
- Preserve stable topic IDs, standard keys, and dependency endpoints unless the
  task explicitly asks for a breaking data migration.
- When editing `data/*.json`, update any affected counts and
  `data/manifest.json` checksums before finishing.
- Keep `topics.json`, `dependencies.json`, `curriculum-standards.json`, and
  `clusters.json` valid UTF-8 JSON.
- Do not add per-child, user, private, or customer data to the repo.

## Data Invariants

- Topic IDs start with `mt_`.
- Dependencies are directed as `topicId` depends on `prerequisiteId`.
- Dependency endpoints must resolve to existing topics and must not be
  self-dependencies.
- Dependency `strength` is either `hard` or `soft`.
- Topic `standards` entries must resolve to keys in
  `data/curriculum-standards.json`.
- Sources listed as codes-only must not include verbatim upstream standard text.
- Manifest file hashes must match the bytes of the released data files.

## Licensing And Provenance

- Preserve the multi-license model described in `README.md`.
- Preserve upstream notices in `PROVENANCE.md`.
- Be especially careful with codes-only sources:
    - `ngss-k5`
    - `ngss-ms`
    - `c3-social-studies`
    - `ib-pyp-pspe`
- Do not restore or add full upstream standard text for codes-only sources unless
  the user explicitly confirms rights clearance.

## Verification Before Handoff

Run `npm run validate` after data, schema, provenance, or manifest changes. If
only prose files changed, validation is still cheap and useful.

If validation cannot be run, state that clearly and explain why.
