# Validation And Release Workflow

The repo ships a dependency-free Node validator:

```bash
npm run validate
```

This runs:

```bash
node scripts/validate.mjs
```

No third-party npm dependencies are required for validation.

## What Validation Checks

The validator checks:

- Declared topic count equals the length of `topics`.
- Declared dependency count equals the length of `dependencies`.
- Declared curriculum count equals the length of `curricula`.
- Declared cluster count equals the length of `clusters`.
- Topic IDs are strings beginning with `mt_`.
- Topic types are in the allowed enum.
- Topic descriptions are non-empty strings.
- Topic `evidence` fields are arrays.
- Topic IDs are unique.
- Curriculum `textIncluded` agrees with `codesOnlySources`.
- Curriculum `topicCount` equals the length of each curriculum's `topics`.
- Standard keys match `<curriculum-slug>:<code>`.
- Standard keys are unique.
- Codes-only sources do not include a `data` object with verbatim text.
- Dependency endpoints reference existing topic IDs.
- Dependencies are not self-dependencies.
- Dependency strength is `hard` or `soft`.
- Topic standard references resolve to known standard keys.
- Manifest SHA-256 checksums match the bytes of the released data files.

## What Validation Does Not Yet Check

The README describes the dependency graph as a directed acyclic graph. The
current validator does not yet perform a full cycle detection pass.

The validator also does not validate against the JSON Schema files directly.
It implements a focused integrity check in JavaScript.

## Line Endings And Checksums

`data/manifest.json` stores byte-level SHA-256 hashes for the released JSON
files. Byte-level hashes are sensitive to line endings.

The repo includes `.gitattributes` to keep text files, especially JSON files,
LF-normalized:

```text
*.json text eol=lf
*.md text eol=lf
*.mjs text eol=lf
```

This matters on Windows checkouts where Git may otherwise convert files to CRLF
and cause checksum validation to fail even when the logical JSON content is
unchanged.

## Editing Data Files

When editing `data/*.json`:

1. Keep the file valid JSON.
2. Preserve stable IDs unless a breaking migration is intended.
3. Update declared counts when adding or removing records.
4. Update `data/manifest.json` byte counts and SHA-256 checksums.
5. Run `npm run validate`.

When editing only documentation, validation is still cheap and useful because it
confirms the checkout remains release-consistent.

## Release Inventory

The initial public release is `1.0.0`, dated 2026-07-08, with taxonomy version
`v1`.

Included:

- 1,590 micro-topics.
- 3,221 prerequisite dependencies.
- 7 curricula.
- 3,261 standards or standard codes.
- 1,859 topic-standard links.
- 183 domain clusters.
- JSON Schemas and validator.

Excluded:

- Semantic embeddings.
- Child mastery beliefs or personally identifiable learner data.
- Teaching research.
- Visualization runtime code.
