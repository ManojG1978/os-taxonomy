# CBSE/NCERT Class 6 Math Pilot Coverage QA And Expansion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:
> executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Produce a documentation-only QA tranche for the existing 18 CBSE/NCERT Class 6 Math pilot alignment rows and
choose the next bounded codes-only mapping slice.

**Architecture:** Keep the released data unchanged while auditing the pilot mapping through repo-local Markdown
worksheets. Use scripts and one-off Node checks only to inspect existing JSON and verify references; do not add a
filtering script or any runtime dependency.

**Tech Stack:** Node.js ES modules, dependency-free validation script, UTF-8 JSON, Markdown docs.

## Global Constraints

- Treat this as a dataset release, not an application.
- Do not add runtime dependencies, build tooling, generated lockfiles, app frameworks, topics, dependencies, source
  keys, alignment rows, schemas, manifest checksums, or a filtering script.
- Use existing Marble topic IDs only.
- Do not add full upstream NCERT, CBSE, textbook, exercise, exemplar, syllabus, or standards text.
- Keep `data/topics.json`, `data/dependencies.json`, `data/curriculum-standards.json`,
  `data/curriculum-alignments.json`, and `data/manifest.json` unchanged in this tranche.
- Run `npm run validate` before handoff.
- Do not commit changes unless the user explicitly asks for a commit.

---

## File Structure

- Read `data/topics.json`: source of current Marble Mathematics topic IDs and descriptions.
- Read `data/curriculum-standards.json`: source of the codes-only NCERT Class 6 Math source keys.
- Read `data/curriculum-alignments.json`: source of the 18 current pilot alignment rows.
- Read `docs/superpowers/specs/2026-07-09-cbse-ncert-class-6-math-pilot-topic-review.md`: existing first-pilot topic
  review worksheet.
- Create `docs/superpowers/specs/2026-07-09-cbse-ncert-class-6-math-pilot-coverage-audit.md`: row-level QA and coverage
  gap findings.
- Create `docs/superpowers/specs/2026-07-09-cbse-ncert-class-6-math-geometry-measurement-seed.md`: seed worksheet for
  the next recommended slice.

## Task 1: Establish Baseline And Counts

**Files:**

- Read: `data/curriculum-standards.json`
- Read: `data/curriculum-alignments.json`
- Read: `data/topics.json`

**Interfaces:**

- Consumes: current release JSON files.
- Produces: verified baseline counts for the QA documents.

- [ ] **Step 1: Confirm git status**

Run:

```bash
git status --short
```

Expected: no data changes are present before this tranche starts. If unrelated changes exist, do not revert them.

- [ ] **Step 2: Count the NCERT Class 6 Math source keys and alignments**

Run:

```bash
node -e "const fs=require('fs');const s=JSON.parse(fs.readFileSync('data/curriculum-standards.json','utf8'));const a=JSON.parse(fs.readFileSync('data/curriculum-alignments.json','utf8'));const c=s.curricula.find(c=>c.slug==='ncert-class6-math-2026-27');const rows=a.alignments.filter(r=>r.curriculum==='ncert-class6-math-2026-27');console.log(JSON.stringify({sourceKeys:c.topics.length,alignmentRows:rows.length,declaredAlignmentCount:a.alignmentCount},null,2));"
```

Expected:

```json
{
  "sourceKeys": 10,
  "alignmentRows": 18,
  "declaredAlignmentCount": 18
}
```

- [ ] **Step 3: Verify all pilot topic IDs resolve**

Run:

```bash
node -e "const fs=require('fs');const topics=new Set(JSON.parse(fs.readFileSync('data/topics.json','utf8')).topics.map(t=>t.id));const rows=JSON.parse(fs.readFileSync('data/curriculum-alignments.json','utf8')).alignments.filter(r=>r.curriculum==='ncert-class6-math-2026-27');const missing=rows.filter(r=>!topics.has(r.topicId));console.log(JSON.stringify({rows:rows.length,missing},null,2));if(missing.length) process.exit(1);"
```

Expected: `missing` is an empty array.

## Task 2: Create The Coverage Audit Worksheet

**Files:**

- Create: `docs/superpowers/specs/2026-07-09-cbse-ncert-class-6-math-pilot-coverage-audit.md`

**Interfaces:**

- Consumes: 18 current alignment rows and current Marble topic metadata.
- Produces: a row-level QA worksheet and coverage gap summary.

- [ ] **Step 1: Generate the pilot row inventory**

Run:

```bash
node -e "const fs=require('fs');const topics=JSON.parse(fs.readFileSync('data/topics.json','utf8')).topics;const by=new Map(topics.map(t=>[t.id,t]));const rows=JSON.parse(fs.readFileSync('data/curriculum-alignments.json','utf8')).alignments.filter(r=>r.curriculum==='ncert-class6-math-2026-27');for(const r of rows){const t=by.get(r.topicId);console.log('| `'+r.standardKey+'` | `'+r.topicId+'` | '+t.domain+' | '+t.name+' | `'+r.matchType+'` | pass | |');}"
```

Expected: 18 Markdown table rows.

- [ ] **Step 2: Create the audit document**

Create `docs/superpowers/specs/2026-07-09-cbse-ncert-class-6-math-pilot-coverage-audit.md` with this structure:

```markdown
# CBSE/NCERT Class 6 Math Pilot Coverage Audit

This audit reviews the existing codes-only `ncert-class6-math-2026-27`
alignment rows. It must not include copied upstream textbook, syllabus,
exercise, exemplar, or standard text.

## Baseline

- Source keys: 10
- Alignment rows: 18
- Current strand: Number System
- Board metadata: CBSE
- Class metadata: 6
- Subject metadata: Mathematics

## Row-Level QA

| Source key | Topic ID | Domain | Topic name | Match type | QA status | QA note |
|------------|----------|--------|------------|------------|-----------|---------|
```

Append the 18 generated table rows from Step 1, then add:

```markdown

## Coverage Findings

- The pilot is internally consistent as a small Number System slice, not a
  full-board coverage release.
- Direct rows are concentrated around whole-number place value, rounding,
  factors, multiples, primes, and common multiples.
- Supporting rows provide number-line, skip-counting, vocabulary, divisibility,
  place-value-pattern, and mathematical-argument scaffolding.
- One extension row intentionally reaches into a later factor/multiple topic for
  HCF, LCM, and prime-factorization continuity.

## Planned Gaps

- Geometry foundations remain unmapped.
- Perimeter and area measurement remain unmapped.
- Fractions remain unmapped.
- Data handling and presentation remain unmapped.
- Constructions remain unmapped.
- Symmetry remains unmapped.
- Integers and negative-number contexts remain unmapped.
- Broader patterning and algebraic generalisation remain unmapped.

## Recommendation

Use geometry and measurement as the next bounded slice with local source-key
prefix `M6.GM`. Keep the slice to 6-10 source keys and 12-25 alignment rows.
```

- [ ] **Step 3: Check for accidental upstream prose risk**

Run:

```bash
rg -n "exercise|chapter text|textbook text|learning outcome|question|answer" docs/superpowers/specs/2026-07-09-cbse-ncert-class-6-math-pilot-coverage-audit.md
```

Expected: no hits other than boundary statements, if any.

## Task 3: Create The Geometry And Measurement Seed Worksheet

**Files:**

- Create: `docs/superpowers/specs/2026-07-09-cbse-ncert-class-6-math-geometry-measurement-seed.md`

**Interfaces:**

- Consumes: existing Marble `Geometry` and `Measurement` topic IDs.
- Produces: a bounded seed list for the next mapping tranche.

- [ ] **Step 1: Verify candidate topic IDs**

Run:

```bash
node -e "const fs=require('fs');const topics=new Map(JSON.parse(fs.readFileSync('data/topics.json','utf8')).topics.map(t=>[t.id,t]));const ids=['mt_u23IGDxOpk','mt_MFfYcnv6Tv','mt_8OAGVdeTJ_','mt_h0CVtqI2xo','mt_e4V6hvcuEJ','mt_WtcFrxGOgw','mt_6xNmQLzuqm','mt_Jvvh5P06NV','mt_eMtV6tBSJm','mt_eiB3-6pu6a','mt_n0AlyLQwC9','mt_MJZA90uc6H'];const missing=ids.filter(id=>!topics.has(id));for(const id of ids){const t=topics.get(id);console.log('| `'+id+'` | '+t.domain+' | '+t.name+' | candidate | |');}if(missing.length){console.error('missing',missing);process.exit(1);}"
```

Expected: 12 candidate rows and no missing IDs.

- [ ] **Step 2: Create the seed worksheet**

Create `docs/superpowers/specs/2026-07-09-cbse-ncert-class-6-math-geometry-measurement-seed.md` with:

```markdown
# CBSE/NCERT Class 6 Math Geometry And Measurement Seed

This worksheet seeds the next recommended codes-only Class 6 Math expansion
slice. It uses existing Marble topic IDs only and must not include copied
upstream textbook, syllabus, exercise, exemplar, or standard text.

## Proposed Source-Key Prefix

Use `M6.GM` for the next local source-key prefix.

Potential source keys:

- `ncert-class6-math-2026-27:M6.GM.001`
- `ncert-class6-math-2026-27:M6.GM.002`
- `ncert-class6-math-2026-27:M6.GM.003`
- `ncert-class6-math-2026-27:M6.GM.004`
- `ncert-class6-math-2026-27:M6.GM.005`
- `ncert-class6-math-2026-27:M6.GM.006`
- `ncert-class6-math-2026-27:M6.GM.007`
- `ncert-class6-math-2026-27:M6.GM.008`

## Candidate Existing Marble Topics

| Topic ID | Domain | Topic name | Candidate status | Review note |
|----------|--------|------------|------------------|-------------|
| `mt_u23IGDxOpk` | Geometry | Parallel and perpendicular lines | candidate | Lines and line relationships candidate. |
| `mt_MFfYcnv6Tv` | Geometry | Right Angles & Turns | candidate | Right-angle and turn reasoning candidate. |
| `mt_8OAGVdeTJ_` | Geometry | Understanding angles | candidate | Angle concept candidate. |
| `mt_h0CVtqI2xo` | Geometry | Types of angles | candidate | Angle classification candidate. |
| `mt_e4V6hvcuEJ` | Geometry | Types of angles (age 8+) | candidate | Diagram convention and angle notation candidate. |
| `mt_WtcFrxGOgw` | Measurement | Perimeters of polygons | candidate | Perimeter from side lengths candidate. |
| `mt_6xNmQLzuqm` | Measurement | Understanding Area | candidate | Unit-square area candidate. |
| `mt_Jvvh5P06NV` | Measurement | Area by Tiling | candidate | Rectangle area through tiling candidate. |
| `mt_eMtV6tBSJm` | Measurement | Area of compound shapes | candidate | Additive area reasoning candidate. |
| `mt_eiB3-6pu6a` | Measurement | Estimating answers (age 9+) | candidate | Rectangle and square formula candidate. |
| `mt_n0AlyLQwC9` | Measurement | Perimeter of Compound Shapes | candidate | Composite rectilinear perimeter candidate. |
| `mt_MJZA90uc6H` | Measurement | Perimeter (age 10+) | candidate | Same-area and same-perimeter comparison candidate. |

## Next Tranche Boundary

The next data tranche should add only the reviewed subset of these keys and
rows. It should update `data/curriculum-standards.json`,
`data/curriculum-alignments.json`, `data/manifest.json`, and public docs only
after manual review is complete.
```

- [ ] **Step 3: Verify worksheet topic IDs resolve**

Run:

```bash
node -e "const fs=require('fs');const topics=new Set(JSON.parse(fs.readFileSync('data/topics.json','utf8')).topics.map(t=>t.id));const text=fs.readFileSync('docs/superpowers/specs/2026-07-09-cbse-ncert-class-6-math-geometry-measurement-seed.md','utf8');const ids=[...text.matchAll(/`(mt_[^`]+)`/g)].map(m=>m[1]);const missing=ids.filter(id=>!topics.has(id));console.log(JSON.stringify({ids:ids.length,unique:new Set(ids).size,missing},null,2));if(missing.length) process.exit(1);"
```

Expected: `missing` is an empty array.

## Task 4: Final Verification

**Files:**

- Verify: all docs created in this tranche.

**Interfaces:**

- Consumes: documentation-only changes.
- Produces: a clean handoff for the next data tranche.

- [ ] **Step 1: Run release validation**

Run:

```bash
npm run validate
```

Expected: validation passes with the existing 10 NCERT source keys and 18 alignment rows unchanged.

- [ ] **Step 2: Confirm no data files changed**

Run:

```bash
git diff --name-only -- data schema scripts package.json package-lock.json
```

Expected: no output.

- [ ] **Step 3: Inspect final diff**

Run:

```bash
git diff -- docs/superpowers/specs docs/superpowers/plans
```

Expected: diff shows only the coverage QA design, this implementation plan, the coverage audit worksheet, and the
geometry/measurement seed worksheet.

- [ ] **Step 4: Inspect final status**

Run:

```bash
git status --short
```

Expected: only documentation files from this tranche are modified or untracked, plus any unrelated pre-existing changes.
Do not stage, commit, or revert anything unless the user explicitly asks.
