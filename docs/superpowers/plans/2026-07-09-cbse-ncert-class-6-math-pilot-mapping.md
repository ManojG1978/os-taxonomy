# CBSE/NCERT Class 6 Math Pilot Mapping Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:
> executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a small, reviewed, codes-only NCERT Class 6 Mathematics pilot mapping for CBSE-facing filtering.

**Architecture:** Keep the canonical Marble topic graph unchanged. Add one codes-only NCERT Class 6 Mathematics
curriculum source, then add reviewed `curriculum-alignments.json` rows that join those source keys to existing Marble
Mathematics topic IDs with `board: "CBSE"`.

**Tech Stack:** Node.js ES modules, dependency-free validation script, UTF-8 JSON, JSON Schema draft 2020-12, Markdown
docs.

## Global Constraints

- Treat this as a dataset release, not an application.
- Do not add runtime dependencies, build tooling, generated lockfiles, app frameworks, topics, dependencies, or a
  filtering script.
- Do not add full upstream NCERT, CBSE, textbook, exercise, exemplar, syllabus, or standards text.
- Keep the new India source codes-only unless rights clearance is explicitly confirmed later.
- Preserve stable topic IDs, standard keys, and dependency endpoints.
- Use existing Marble topic IDs only.
- Keep `data/topics.json` unchanged unless a later approved tranche explicitly adds topic coverage.
- When editing `data/*.json`, update affected counts and `data/manifest.json` checksums before finishing.
- Run `npm run validate` before handoff.
- Do not commit changes unless the user explicitly asks for a commit.

---

## File Structure

- Modify `data/curriculum-standards.json`: add one codes-only curriculum source named `ncert-class6-math-2026-27` with a
  small pilot set of Class 6 Math source keys.
- Modify `data/curriculum-alignments.json`: add reviewed alignment rows from those source keys to existing Marble
  Mathematics topics.
- Modify `data/manifest.json`: update curriculum, standard, alignment, byte, and SHA-256 counts for changed data files.
- Modify `scripts/validate.mjs`: make the new India source part of the explicit codes-only invariant, if the current
  validator only checks the manifest-level `codesOnlySources` list.
- Modify `README.md`: mention the first India pilot source and codes-only boundary.
- Modify `docs/curriculum-coverage.md`: add India/NCERT Class 6 Mathematics as codes-only pilot coverage.
- Modify `docs/validation-and-release.md`: add India pilot release checklist details.
- Modify `PROVENANCE.md`: add official source URLs and state that only source keys and Marble-authored mapping metadata
  ship.

---

## Task 1: Verify Infrastructure Baseline

**Files:**

- Read: `docs/superpowers/specs/2026-07-09-india-board-alignment-infrastructure-design.md`
- Read: `docs/superpowers/plans/2026-07-09-india-board-alignment-infrastructure.md`
- Read: `data/curriculum-alignments.json`
- Read: `scripts/validate.mjs`

**Interfaces:**

- Consumes: the already-added alignment dataset and validator.
- Produces: confirmed baseline before data mapping starts.

- [ ] **Step 1: Inspect git status**

Run:

```bash
git status --short
```

Expected: the India alignment infrastructure files may still be modified or
untracked. Do not revert them.

- [ ] **Step 2: Run baseline validation**

Run:

```bash
npm run validate
```

Expected:

```text
✓ valid — 1590 topics, 3221 dependencies, 3261 standards, 0 alignments, 183 clusters. Referential integrity + checksums OK.
```

- [ ] **Step 3: Confirm the alignment file is empty**

Run:

```bash
node -e "const fs=require('fs');const a=JSON.parse(fs.readFileSync('data/curriculum-alignments.json','utf8'));console.log(JSON.stringify({version:a.version,alignmentCount:a.alignmentCount,rows:a.alignments.length},null,2));"
```

Expected:

```json
{
  "version": "v1",
  "alignmentCount": 0,
  "rows": 0
}
```

---

## Task 2: Choose And Record The Pilot Source Keys

**Files:**

- Modify: `data/curriculum-standards.json`

**Interfaces:**

- Consumes: official NCERT source location and existing curriculum source shape.
- Produces: `ncert-class6-math-2026-27` curriculum slug and pilot source keys available to alignment rows.

- [ ] **Step 1: Confirm current curriculum source slugs**

Run:

```bash
node -e "const fs=require('fs');const s=JSON.parse(fs.readFileSync('data/curriculum-standards.json','utf8'));console.log(s.curricula.map(c=>c.slug).join('\n'));"
```

Expected: no `ncert-class6-math-2026-27` slug is present.

- [ ] **Step 2: Add the new slug to `codesOnlySources`**

In `data/curriculum-standards.json`, add:

```json
"ncert-class6-math-2026-27"
```

to the top-level `codesOnlySources` array.

- [ ] **Step 3: Add the codes-only curriculum source**

Append this object to the top-level `curricula` array:

```json
{
  "slug": "ncert-class6-math-2026-27",
  "country": "IN",
  "name": "NCERT Class 6 Mathematics",
  "version": "2026-27",
  "sourceUrl": "https://ncert.nic.in/textbook.php?fegp1=0-10",
  "textIncluded": false,
  "license": "Codes-only source keys included. No upstream textbook, syllabus, exercise, or standard text is included. See PROVENANCE.md.",
  "topicCount": 10,
  "topics": [
    { "key": "ncert-class6-math-2026-27:M6.NS.001", "code": "M6.NS.001" },
    { "key": "ncert-class6-math-2026-27:M6.NS.002", "code": "M6.NS.002" },
    { "key": "ncert-class6-math-2026-27:M6.NS.003", "code": "M6.NS.003" },
    { "key": "ncert-class6-math-2026-27:M6.NS.004", "code": "M6.NS.004" },
    { "key": "ncert-class6-math-2026-27:M6.NS.005", "code": "M6.NS.005" },
    { "key": "ncert-class6-math-2026-27:M6.NS.006", "code": "M6.NS.006" },
    { "key": "ncert-class6-math-2026-27:M6.NS.007", "code": "M6.NS.007" },
    { "key": "ncert-class6-math-2026-27:M6.NS.008", "code": "M6.NS.008" },
    { "key": "ncert-class6-math-2026-27:M6.NS.009", "code": "M6.NS.009" },
    { "key": "ncert-class6-math-2026-27:M6.NS.010", "code": "M6.NS.010" }
  ]
}
```

Do not add a `data` object to any topic entry.

- [ ] **Step 4: Update declared curriculum count**

Set top-level `curriculumCount` to the new length of `curricula`.

Use this command to check the intended value:

```bash
node -e "const fs=require('fs');const s=JSON.parse(fs.readFileSync('data/curriculum-standards.json','utf8'));console.log(s.curricula.length);"
```

- [ ] **Step 5: Run validation and observe expected manifest failure**

Run:

```bash
npm run validate
```

Expected: referential integrity should pass, but manifest counts or checksum
checks may fail until Task 5 updates `data/manifest.json`.

---

## Task 3: Record Existing Marble Topics For The Pilot

**Files:**

- Read: `data/topics.json`
- Create: `docs/superpowers/specs/2026-07-09-cbse-ncert-class-6-math-pilot-topic-review.md`

**Interfaces:**

- Consumes: existing Marble Mathematics topics.
- Produces: a reviewed local mapping worksheet with only Marble-authored notes.

- [ ] **Step 1: Generate candidate Mathematics topics**

Run:

```bash
node -e "const fs=require('fs');const topics=JSON.parse(fs.readFileSync('data/topics.json','utf8')).topics;const re=/whole number|place value|factor|multiple|prime|composite|divisib|common factor|common multiple|number pattern|number line|integer/i;for(const t of topics.filter(t=>t.subject==='Mathematics'&&re.test([t.name,t.domain,t.description,(t.evidence||[]).join(' ')].join(' ')))) console.log([t.id,t.domain,t.name,t.description].join(' | '));"
```

Expected: a reviewable list of Mathematics topics relevant to the pilot number
system slice.

- [ ] **Step 2: Create the review worksheet with seed rows**

Create `docs/superpowers/specs/2026-07-09-cbse-ncert-class-6-math-pilot-topic-review.md`
with this content:

```markdown
# CBSE/NCERT Class 6 Math Pilot Topic Review

This worksheet records Marble-authored review notes for the first
codes-only NCERT Class 6 Mathematics pilot. It must not contain copied
upstream textbook, syllabus, exercise, exemplar, or standard text.

| Source key | Marble topic ID | Marble topic name | Match type | Review note |
|------------|-----------------|-------------------|------------|-------------|
| `ncert-class6-math-2026-27:M6.NS.001` | `mt_JwP9QFv6gQ` | Reading and writing numbers (age 9+) | `direct` | Whole-number reading, writing, ordering, and comparison candidate. |
| `ncert-class6-math-2026-27:M6.NS.001` | `mt_xMt1TLTs--` | Working with Large Numbers | `direct` | Large-number place-value problem solving candidate. |
| `ncert-class6-math-2026-27:M6.NS.002` | `mt_19j_5AuuQI` | Numbers on a number line | `supporting` | Number-line representation candidate. |
| `ncert-class6-math-2026-27:M6.NS.003` | `mt_5NwqN6pf_A` | Rounding Large Numbers | `direct` | Whole-number rounding candidate. |
| `ncert-class6-math-2026-27:M6.NS.003` | `mt_NLSfvB9vUl` | Rounding to 10, 100, 1000 | `supporting` | Earlier rounding foundation candidate. |
| `ncert-class6-math-2026-27:M6.NS.004` | `mt_nZkL5-XjRX` | Factor Pairs & Commutativity | `direct` | Factor-pair reasoning candidate. |
| `ncert-class6-math-2026-27:M6.NS.004` | `mt_FHIAv6dfhU` | Factors, multiples, and primes | `direct` | Factors and multiples candidate. |
| `ncert-class6-math-2026-27:M6.NS.005` | `mt_IzQvs7k_sE` | Skip Counting (4s, 8s, 50s, 100s) | `supporting` | Multiples through skip-counting candidate. |
| `ncert-class6-math-2026-27:M6.NS.005` | `mt_7rJM8eWUfw` | Counting in 6s | `supporting` | Multiples fluency candidate. |
| `ncert-class6-math-2026-27:M6.NS.005` | `mt_2jbUekyTu4` | Extending Table Patterns | `supporting` | Multiplication pattern candidate. |
| `ncert-class6-math-2026-27:M6.NS.006` | `mt_y1XCVsIelg` | Prime numbers | `direct` | Prime and composite vocabulary candidate. |
| `ncert-class6-math-2026-27:M6.NS.006` | `mt_xfwv0M83mJ` | Precise Maths Vocabulary | `supporting` | Vocabulary precision candidate. |
| `ncert-class6-math-2026-27:M6.NS.007` | `mt_FHIAv6dfhU` | Factors, multiples, and primes | `direct` | Common factor and common multiple candidate. |
| `ncert-class6-math-2026-27:M6.NS.007` | `mt_xhoOWnhtHq` | Factors, multiples, and primes (age 11+) | `extension` | HCF, LCM, and prime-factorization extension candidate. |
| `ncert-class6-math-2026-27:M6.NS.008` | `mt_p-nbe0w_lf` | Division with remainders | `supporting` | Divisibility and remainder reasoning candidate. |
| `ncert-class6-math-2026-27:M6.NS.009` | `mt_QqG6IdmTSE` | Place Value × 10 Pattern | `supporting` | Place-value pattern candidate. |
| `ncert-class6-math-2026-27:M6.NS.009` | `mt_hlGKg5M7qJ` | Fractions, Decimals & Percentages | `supporting` | Factor-pair structure candidate. |
| `ncert-class6-math-2026-27:M6.NS.010` | `mt_j5YqQnN6xe` | Constructing mathematical arguments | `supporting` | Reasoning and explanation candidate for number-system work. |
```

- [ ] **Step 3: Review the seed rows against the official source**

Inspect the official NCERT source in a browser or PDF reader. Keep, remove, or
change the seed rows based on the actual Class 6 Math pilot slice, but keep the
worksheet within 8-15 source keys and 15-40 alignment rows.

Every review note must remain short and Marble-authored. Do not paste or
paraphrase upstream textbook prose in the worksheet.

- [ ] **Step 4: Verify every worksheet topic ID exists**

Run:

```bash
node -e "const fs=require('fs');const topics=new Set(JSON.parse(fs.readFileSync('data/topics.json','utf8')).topics.map(t=>t.id));const text=fs.readFileSync('docs/superpowers/specs/2026-07-09-cbse-ncert-class-6-math-pilot-topic-review.md','utf8');const ids=[...text.matchAll(/`(mt_[^`]+)`/g)].map(m=>m[1]);const missing=ids.filter(id=>!topics.has(id));console.log(JSON.stringify({ids:ids.length,unique:new Set(ids).size,missing},null,2));if(missing.length) process.exit(1);"
```

Expected: `missing` is an empty array.

---

## Task 4: Add Alignment Rows

**Files:**

- Modify: `data/curriculum-alignments.json`

**Interfaces:**

- Consumes: source keys from Task 2 and topic IDs from Task 3.
- Produces: validated board-facing alignment rows.

- [ ] **Step 1: Add reviewed alignment rows**

For each approved row in the topic review worksheet, add an object to
`alignments` using the exact topic IDs and source keys from the worksheet. The
first seed row becomes:

```json
{
  "topicId": "mt_JwP9QFv6gQ",
  "standardKey": "ncert-class6-math-2026-27:M6.NS.001",
  "curriculum": "ncert-class6-math-2026-27",
  "country": "IN",
  "board": "CBSE",
  "class": 6,
  "subject": "Mathematics",
  "strand": "Number System",
  "matchType": "direct",
  "confidence": "reviewed",
  "source": "manual"
}
```

Use `unit` only if it is Marble-authored and not copied upstream text.

- [ ] **Step 2: Update `alignmentCount`**

Set `alignmentCount` to the length of `alignments`.

Run:

```bash
node -e "const fs=require('fs');const a=JSON.parse(fs.readFileSync('data/curriculum-alignments.json','utf8'));console.log(a.alignments.length);"
```

Expected: the printed value equals `alignmentCount`.

- [ ] **Step 3: Run validation and observe expected manifest failure**

Run:

```bash
npm run validate
```

Expected: alignment referential integrity should pass. Manifest count or
checksum checks may fail until Task 5.

---

## Task 5: Update Manifest Counts And Checksums

**Files:**

- Modify: `data/manifest.json`

**Interfaces:**

- Consumes: changed data files.
- Produces: release manifest that matches data bytes and counts.

- [ ] **Step 1: Update manifest mechanically**

Run:

```bash
node -e "const fs=require('fs');const crypto=require('crypto');const manifest=JSON.parse(fs.readFileSync('data/manifest.json','utf8'));const standards=JSON.parse(fs.readFileSync('data/curriculum-standards.json','utf8'));const alignments=JSON.parse(fs.readFileSync('data/curriculum-alignments.json','utf8'));manifest.codesOnlySources=standards.codesOnlySources;manifest.counts.curricula=standards.curricula.length;manifest.counts.curriculumStandards=standards.curricula.reduce((sum,c)=>sum+c.topics.length,0);manifest.counts.curriculumAlignments=alignments.alignments.length;for(const file of ['curriculum-standards.json','curriculum-alignments.json']){const bytes=fs.readFileSync('data/'+file);manifest.files[file]={bytes:bytes.length,sha256:crypto.createHash('sha256').update(bytes).digest('hex')};}fs.writeFileSync('data/manifest.json',JSON.stringify(manifest,null,2)+'\n');"
```

- [ ] **Step 2: Run validation**

Run:

```bash
npm run validate
```

Expected: validation passes. The exact standard and alignment counts should
reflect the rows added in Tasks 2 and 4.

---

## Task 6: Strengthen Codes-Only Validation If Needed

**Files:**

- Modify: `scripts/validate.mjs`

**Interfaces:**

- Consumes: top-level `codesOnlySources` from `data/curriculum-standards.json`.
- Produces: an explicit guard that rejects any `data` object under the India pilot source.

- [ ] **Step 1: Inspect current codes-only check**

Run:

```bash
rg -n "codesOnly|textIncluded|leaks verbatim text" scripts/validate.mjs
```

Expected: the validator checks every source listed in `codesOnlySources`.

- [ ] **Step 2: Add explicit source-list consistency checks if missing**

If the validator does not already compare `standards.codesOnlySources` and
`manifest.codesOnlySources`, add this check after both files are loaded:

```js
check(
  JSON.stringify([...standards.codesOnlySources].sort()) === JSON.stringify([...manifest.codesOnlySources].sort()),
  'manifest codesOnlySources does not match curriculum-standards codesOnlySources',
);
```

If the validator already has equivalent behavior, do not change it.

- [ ] **Step 3: Run validation**

Run:

```bash
npm run validate
```

Expected: validation passes.

---

## Task 7: Update Documentation And Provenance

**Files:**

- Modify: `README.md`
- Modify: `docs/curriculum-coverage.md`
- Modify: `docs/validation-and-release.md`
- Modify: `PROVENANCE.md`

**Interfaces:**

- Consumes: the new source slug and pilot mapping posture.
- Produces: public docs that describe the pilot without copying upstream text.

- [ ] **Step 1: Update `README.md`**

Add a short note near the curriculum files section:

```markdown
The first India pilot source, `ncert-class6-math-2026-27`, is shipped as
codes-only source keys plus Marble-authored alignment metadata. It does not
include upstream textbook, syllabus, exercise, exemplar, or standard text.
```

- [ ] **Step 2: Update `docs/curriculum-coverage.md`**

Add a row or subsection for India pilot coverage:

```markdown
## India Pilot Coverage

`ncert-class6-math-2026-27` provides codes-only source keys for a small NCERT
Class 6 Mathematics pilot slice. Alignment rows use `board: "CBSE"` so products
can test CBSE-facing board, class, and subject filtering without treating the
pilot as a full-board coverage release.
```

- [ ] **Step 3: Update `docs/validation-and-release.md`**

Add a release checklist note:

```markdown
For codes-only India pilot sources, confirm that source entries contain only
`key` and `code`, that the source slug appears in `codesOnlySources`, and that
no upstream textbook, syllabus, exercise, exemplar, or standard text appears in
`data/curriculum-standards.json`, `data/curriculum-alignments.json`, mapping
notes, or release docs.
```

- [ ] **Step 4: Update `PROVENANCE.md`**

Add:

```markdown
## NCERT Class 6 Mathematics Pilot

`ncert-class6-math-2026-27` is an India pilot source for NCERT Class 6
Mathematics. The repository ships only source keys and Marble-authored mapping
metadata for this pilot. It does not include upstream textbook, syllabus,
exercise, exemplar, or standard text.

Source reference:

- NCERT textbook listing: https://ncert.nic.in/textbook.php?fegp1=0-10
```

If a CBSE source URL is cited for board context, identify it as context only
unless the data file encodes CBSE as a separate source.

---

## Task 8: Final Verification

**Files:**

- Verify all modified files.

**Interfaces:**

- Consumes: all data and documentation changes.
- Produces: validated working tree ready for review.

- [ ] **Step 1: Run validation**

Run:

```bash
npm run validate
```

Expected: validation passes with updated curriculum, standard, alignment, and
checksum counts.

- [ ] **Step 2: Search for accidental upstream text markers**

Run:

```bash
rg -n "exercise|chapter|textbook text|learning outcome|description|data\"\\s*:" data/curriculum-standards.json data/curriculum-alignments.json docs README.md PROVENANCE.md
```

Expected: no `data` object exists under `ncert-class6-math-2026-27`; any prose
hits in docs are boundary statements, not copied upstream text.

- [ ] **Step 3: Inspect final diff**

Run:

```bash
git diff -- data schema scripts README.md docs PROVENANCE.md
```

Expected: diff shows only a codes-only NCERT Class 6 Mathematics pilot source,
CBSE-facing alignment metadata, manifest updates, validator hardening if needed,
and documentation/provenance updates.

- [ ] **Step 4: Inspect final status**

Run:

```bash
git status --short
```

Expected: changes include this pilot tranche plus any pre-existing uncommitted
India alignment infrastructure files. Do not stage, commit, or revert anything
unless the user explicitly asks.
