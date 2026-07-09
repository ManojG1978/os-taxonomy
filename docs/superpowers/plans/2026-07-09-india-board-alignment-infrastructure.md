# India Board Alignment Infrastructure Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:
> executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the infrastructure for board/class/subject curriculum filtering through a new alignment layer, without
adding Indian curriculum data yet.

**Architecture:** Keep `topics.json` and `dependencies.json` as the canonical graph. Add `curriculum-alignments.json` as
a rich join table from canonical topics to curriculum standards, then validate and document it as the future
board-filtering layer.

**Tech Stack:** Node.js ES modules, dependency-free validation script, JSON Schema draft 2020-12, Markdown docs.

## Global Constraints

- Treat this as a dataset release, not an application.
- Do not add runtime dependencies, build tooling, generated lockfiles, or app frameworks.
- Preserve existing topic IDs, dependency endpoints, standard keys, and curriculum records.
- Do not add NCERT, CBSE, CISCE, ICSE, or ISC source records in this tranche.
- Do not add board-specific topic mappings, new micro-topics, new dependencies, or a filtering script in this tranche.
- Keep `topics[].standards` for backward compatibility.
- Run `npm run validate` before handoff.
- Do not commit changes unless the user explicitly asks for a commit.

---

## File Structure

- Create `data/curriculum-alignments.json`: empty alignment dataset with declared count.
- Create `schema/curriculum-alignments.schema.json`: JSON Schema for the new alignment file.
- Modify `scripts/validate.mjs`: load and validate alignments, plus manifest checks for the new file.
- Modify `data/manifest.json`: add alignment count and file checksum metadata.
- Modify `README.md`: list the new file and describe alignment-based board filtering.
- Modify `docs/data-model.md`: document the new file and fields.
- Modify `docs/knowledge-graph.md`: explain alignment layer and strict/learning graph modes.
- Modify `docs/curriculum-coverage.md`: clarify that current release has no India records yet but now supports
  board-alignment infrastructure.
- Modify `docs/validation-and-release.md`: add alignment validation and manifest update guidance.
- Modify `PROVENANCE.md`: state that alignments are Marble-authored mapping metadata and contain no new upstream
  curriculum text.

---

## Task 1: Add Alignment Data File And Schema

**Files:**

- Create: `data/curriculum-alignments.json`
- Create: `schema/curriculum-alignments.schema.json`

**Interfaces:**

- Produces: `data/curriculum-alignments.json` with top-level `version`, `alignmentCount`, and `alignments`.
- Produces: schema contract consumed by documentation and future schema users.

- [ ] **Step 1: Create the empty alignment dataset**

Create `data/curriculum-alignments.json` with exactly:

```json
{
  "version": "v1",
  "alignmentCount": 0,
  "alignments": []
}
```

- [ ] **Step 2: Create the alignment schema**

Create `schema/curriculum-alignments.schema.json` with exactly:

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://withmarble.com/taxonomy/schema/curriculum-alignments.schema.json",
  "title": "Marble Skill Taxonomy — curriculum alignments",
  "type": "object",
  "required": ["version", "alignmentCount", "alignments"],
  "properties": {
    "version": { "type": "string" },
    "alignmentCount": { "type": "integer", "minimum": 0 },
    "alignments": {
      "type": "array",
      "items": {
        "type": "object",
        "required": [
          "topicId",
          "standardKey",
          "curriculum",
          "country",
          "board",
          "subject",
          "matchType",
          "confidence",
          "source"
        ],
        "properties": {
          "topicId": { "type": "string", "pattern": "^mt_" },
          "standardKey": { "type": "string", "pattern": "^[^:]+:.+" },
          "curriculum": { "type": "string" },
          "country": { "type": "string" },
          "board": { "type": "string" },
          "class": { "type": "integer", "minimum": 1 },
          "stage": { "type": "string" },
          "subject": { "type": "string" },
          "strand": { "type": "string" },
          "unit": { "type": "string" },
          "matchType": {
            "type": "string",
            "enum": ["direct", "partial", "supporting", "extension"]
          },
          "confidence": {
            "type": "string",
            "enum": ["machine", "reviewed", "verified"]
          },
          "source": {
            "type": "string",
            "enum": ["manual", "machine", "imported"]
          },
          "notes": { "type": "string" }
        },
        "additionalProperties": false
      }
    }
  },
  "additionalProperties": false
}
```

- [ ] **Step 3: Run validation and observe expected failure**

Run:

```bash
npm run validate
```

Expected: validation may still pass because `manifest.json` has not listed the new data file yet. This is acceptable at
this point; Task 2 adds manifest accounting.

---

## Task 2: Add Alignment Validation

**Files:**

- Modify: `scripts/validate.mjs`

**Interfaces:**

- Consumes: `data/curriculum-alignments.json`.
- Produces: dependency-free validation checks for alignment references, enums, counts, and duplicates.

- [ ] **Step 1: Load the alignment file**

In `scripts/validate.mjs`, after:

```js
const clusters = load('clusters.json');
const manifest = load('manifest.json');
```

change to:

```js
const clusters = load('clusters.json');
const alignments = load('curriculum-alignments.json');
const manifest = load('manifest.json');
```

- [ ] **Step 2: Add declared count validation**

After the existing cluster count check:

```js
check(clusters.clusterCount === clusters.clusters.length, `clusters: clusterCount != length`);
```

add:

```js
check(
  alignments.alignmentCount === alignments.alignments.length,
  `alignments: alignmentCount ${alignments.alignmentCount} != ${alignments.alignments.length}`,
);
```

- [ ] **Step 3: Track curriculum slugs**

Before the `for (const c of standards.curricula)` loop, add:

```js
const curriculumSlugs = new Set();
```

Inside the loop, immediately after:

```js
const expectFullText = !codesOnly.has(c.slug);
```

add:

```js
curriculumSlugs.add(c.slug);
```

- [ ] **Step 4: Add alignment integrity checks**

After the topic-to-standard referential integrity block, add:

```js
// --- referential integrity: curriculum alignments --------------------------
const MATCH_TYPES = new Set(['direct', 'partial', 'supporting', 'extension']);
const CONFIDENCE_LEVELS = new Set(['machine', 'reviewed', 'verified']);
const ALIGNMENT_SOURCES = new Set(['manual', 'machine', 'imported']);
const alignmentPairs = new Set();

for (const a of alignments.alignments) {
  check(typeof a.topicId === 'string' && a.topicId.startsWith('mt_'), `alignment topicId malformed: ${a.topicId}`);
  check(topicIds.has(a.topicId), `alignment references unknown topicId ${a.topicId}`);
  check(standardKeys.has(a.standardKey), `alignment references unknown standardKey ${a.standardKey}`);
  check(curriculumSlugs.has(a.curriculum), `alignment references unknown curriculum ${a.curriculum}`);
  check(
    typeof a.standardKey === 'string' && a.standardKey.startsWith(`${a.curriculum}:`),
    `alignment standardKey ${a.standardKey} does not match curriculum ${a.curriculum}`,
  );
  check(MATCH_TYPES.has(a.matchType), `alignment ${a.topicId}/${a.standardKey}: bad matchType ${a.matchType}`);
  check(CONFIDENCE_LEVELS.has(a.confidence), `alignment ${a.topicId}/${a.standardKey}: bad confidence ${a.confidence}`);
  check(ALIGNMENT_SOURCES.has(a.source), `alignment ${a.topicId}/${a.standardKey}: bad source ${a.source}`);

  const pair = `${a.topicId}\u0000${a.standardKey}`;
  if (alignmentPairs.has(pair)) errors.push(`duplicate alignment: ${a.topicId} -> ${a.standardKey}`);
  alignmentPairs.add(pair);
}
```

- [ ] **Step 5: Update success output**

Change the final `console.log` template from:

```js
    `${standardKeys.size} standards, ${clusters.clusters.length} clusters. ` +
```

to:

```js
    `${standardKeys.size} standards, ${alignments.alignments.length} alignments, ${clusters.clusters.length} clusters. ` +
```

- [ ] **Step 6: Run validation and observe expected failure**

Run:

```bash
npm run validate
```

Expected: validation still passes or fails only because `manifest.json` has not listed `curriculum-alignments.json`.
Task 3 completes manifest accounting.

---

## Task 3: Update Manifest Counts And Checksums

**Files:**

- Modify: `data/manifest.json`

**Interfaces:**

- Consumes: `data/curriculum-alignments.json`.
- Produces: manifest count and byte/hash metadata for the new released data file.

- [ ] **Step 1: Add alignment count and file metadata mechanically**

Run this exact command from the repo root:

```bash
node -e "const fs=require('fs');const crypto=require('crypto');const manifest=JSON.parse(fs.readFileSync('data/manifest.json','utf8'));const bytes=fs.readFileSync('data/curriculum-alignments.json');manifest.counts.curriculumAlignments=0;manifest.files['curriculum-alignments.json']={bytes:bytes.length,sha256:crypto.createHash('sha256').update(bytes).digest('hex')};fs.writeFileSync('data/manifest.json',JSON.stringify(manifest,null,2)+'\n');"
```

- [ ] **Step 2: Run validation**

Run:

```bash
npm run validate
```

Expected:

```text
✓ valid — 1590 topics, 3221 dependencies, 3261 standards, 0 alignments, 183 clusters. Referential integrity + checksums OK.
```

---

## Task 4: Document The Alignment Data Model

**Files:**

- Modify: `README.md`
- Modify: `docs/data-model.md`
- Modify: `docs/knowledge-graph.md`

**Interfaces:**

- Consumes: approved design spec.
- Produces: user-facing documentation for the new alignment layer and graph filtering semantics.

- [ ] **Step 1: Update README file table**

In `README.md`, in the Files table, add this row after `data/curriculum-standards.json`:

```markdown
| [`data/curriculum-alignments.json`](data/curriculum-alignments.json) | Rich topic↔standard alignments used for board, class, subject, and curriculum filtering. |
```

- [ ] **Step 2: Add README alignment note**

In `README.md`, after the paragraph that explains `standards` under “A topic”, add:

```markdown
For richer curriculum filtering, use [`data/curriculum-alignments.json`](data/curriculum-alignments.json). It keeps board, class, subject, match type, confidence, and mapping-source metadata outside the canonical topic records.
```

- [ ] **Step 3: Add data-model section**

In `docs/data-model.md`, add this section after the `data/curriculum-standards.json` section and before the
`data/clusters.json` section:

```markdown
## `data/curriculum-alignments.json`

Purpose: rich topic-to-standard alignment records for board, class, subject,
and curriculum filtering.

Top-level fields:

- `version`: taxonomy version.
- `alignmentCount`: declared count of alignment records.
- `alignments`: array of alignment records.

Alignment fields:

| Field         | Meaning                                                                 |
|---------------|-------------------------------------------------------------------------|
| `topicId`     | Canonical Marble topic ID. Must resolve to `data/topics.json`.          |
| `standardKey` | Curriculum standard key. Must resolve to `data/curriculum-standards.json`. |
| `curriculum`  | Curriculum slug. Must match the prefix of `standardKey`.                |
| `country`     | Country or jurisdiction label such as `IN`.                             |
| `board`       | Product-facing board label such as `CBSE`, `NCERT`, `ICSE`, or `ISC`.   |
| `class`       | Optional class or grade number where applicable.                        |
| `stage`       | Optional stage label.                                                   |
| `subject`     | Curriculum-facing subject label.                                        |
| `strand`      | Optional strand or domain label from the curriculum mapping.            |
| `unit`        | Optional unit, chapter, or grouping label.                              |
| `matchType`   | One of `direct`, `partial`, `supporting`, or `extension`.               |
| `confidence`  | One of `machine`, `reviewed`, or `verified`.                            |
| `source`      | One of `manual`, `machine`, or `imported`.                              |
| `notes`       | Optional mapping note.                                                  |

This file is the richer board-filtering layer. `topics[].standards` remains a
lightweight standard-key list for backward compatibility.
```

- [ ] **Step 4: Add knowledge-graph alignment section**

In `docs/knowledge-graph.md`, after the “Curriculum Alignment” section, add:

```markdown
## Board And Class Filtering

`data/curriculum-alignments.json` provides the rich mapping layer used to build
board-specific views over the canonical graph. A board is not a separate graph;
it is a filtered view over canonical topics and dependencies.

Two graph modes are expected:

- `strictBoardGraph`: include directly aligned topics and only dependencies
  where both endpoints are inside that selected topic set.
- `learningGraph`: include directly aligned topics plus prerequisite closure
  from the canonical dependency graph.

Use `strictBoardGraph` when a surface needs to show only what a board, class,
or subject explicitly covers. Use `learningGraph` when a surface needs a
pedagogically useful path that includes foundations the board may assume.
```

---

## Task 5: Document Coverage, Provenance, And Release Workflow

**Files:**

- Modify: `docs/curriculum-coverage.md`
- Modify: `docs/validation-and-release.md`
- Modify: `PROVENANCE.md`

**Interfaces:**

- Consumes: approved design spec.
- Produces: docs explaining that no India source text or mappings ship in this tranche, and how validation handles the
  new file.

- [ ] **Step 1: Update curriculum coverage**

In `docs/curriculum-coverage.md`, after the “Curriculum Sources” table, add:

```markdown
## Alignment Infrastructure

The release includes `data/curriculum-alignments.json` as the richer
topic-to-standard alignment layer for future board, class, subject, and
curriculum filtering.

In this tranche the file is empty. No NCERT, CBSE, CISCE, ICSE, or ISC source
records or mappings are included yet.
```

- [ ] **Step 2: Update validation workflow**

In `docs/validation-and-release.md`, under “What Validation Checks”, add:

```markdown
- Declared alignment count equals the length of `alignments`.
- Alignment topic IDs resolve to known topics.
- Alignment standard keys resolve to known curriculum standards.
- Alignment curriculum slugs resolve and match the `standardKey` prefix.
- Alignment `matchType`, `confidence`, and `source` values use allowed enums.
- Duplicate `(topicId, standardKey)` alignment pairs are rejected.
```

Under “Editing Data Files”, add:

```markdown
When editing `data/curriculum-alignments.json`, update its declared
`alignmentCount`, update `data/manifest.json` byte count and SHA-256 checksum,
and run `npm run validate`.
```

- [ ] **Step 3: Update provenance**

In `PROVENANCE.md`, after the opening paragraph, add:

```markdown
`data/curriculum-alignments.json` contains Marble-authored mapping metadata
between Marble topic IDs and external curriculum standard keys. It does not
ship additional upstream curriculum text. Upstream licensing constraints still
apply to the referenced records in `data/curriculum-standards.json`.
```

---

## Task 6: Final Verification

**Files:**

- Verify all modified files.

**Interfaces:**

- Consumes: all tasks above.
- Produces: validated release-consistent working tree.

- [ ] **Step 1: Run validation**

Run:

```bash
npm run validate
```

Expected:

```text
✓ valid — 1590 topics, 3221 dependencies, 3261 standards, 0 alignments, 183 clusters. Referential integrity + checksums OK.
```

- [ ] **Step 2: Inspect working tree**

Run:

```bash
git status --short
```

Expected: modified and added files are limited to:

```text
A  data/curriculum-alignments.json
A  schema/curriculum-alignments.schema.json
M  scripts/validate.mjs
M  data/manifest.json
M  README.md
M  docs/data-model.md
M  docs/knowledge-graph.md
M  docs/curriculum-coverage.md
M  docs/validation-and-release.md
M  PROVENANCE.md
?? docs/superpowers/
```

- [ ] **Step 3: Review diff**

Run:

```bash
git diff -- data schema scripts README.md docs PROVENANCE.md
```

Expected: diff shows only the infrastructure-only alignment layer described in
the approved spec. It must not add NCERT, CBSE, CISCE, ICSE, or ISC curriculum
records, mappings, topics, dependencies, runtime dependencies, lockfiles, or a
filtering script.
