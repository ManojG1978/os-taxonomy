# EaseFactor Reference Slice

This repository remains a **Marble Skill Taxonomy dataset release**: versioned
JSON data, schemas, provenance, licensing notes, and checksum-verified release
artifacts.

`scripts/easefactor-reference.mjs` is a **dependency-free implementation
example** for wiring a small EaseFactor-style integration slice against this
release data.

## What It Is

- A dependency-free runtime example that demonstrates how a product can use the
  release files (`topics`, `dependencies`, `curriculum-alignments`, and related
  artifacts).
- A documentation asset for a bounded integration path: first-pass planning and
  recommendation flow for **Class 6 Mathematics Number System**.
- A bridge reference that keeps graph logic (`script`), governance
  (`curriculum/manifest`), and product services separated by boundary.

Recommended first-build chain:

```text
Class 6 Mathematics Number System
  -> import taxonomy v1
  -> filter curriculum-aligned topics
  -> compute prerequisite closure
  -> record diagnostic evidence
  -> identify gaps
  -> recommend the next topic with explanation
```

## What It Is Not

- A full product backend.
- A learner database or content marketplace.
- A source of private learner/customer data.
- A place to publish upstream standard text for codes-only curriculums.

This repo does not store observations, user accounts, or RBAC policies.
Product state belongs in product services and product infrastructure.

## Run It

From the worktree root:

- `npm run validate`
- `npm run test:easefactor`
- `node scripts/easefactor-reference.mjs --demo`

The demo run is intentionally synthetic and prints a deterministic recommendation
trace for inspection.

## Product Service Mapping

Use this slice as the seam between the taxonomy dataset and EaseFactor services:

| Product Area | Script Function |
| --- | --- |
| Taxonomy Importer | `loadTaxonomyRelease` |
| Taxonomy Graph Store | `makeGraphStore` |
| Learner Mastery Service | `deriveMasteryState`, `checkReadiness`, `findLearningGaps` |
| Content Mapping Service | `validateContentMappings` |
| Planner Service | `recommendNextBestTopics` |

## Licensing And Privacy Boundaries

### Licensing

The script uses taxonomy metadata and alignment codes; it must preserve
curriculum licensing boundaries.

- `ncert-class6-math-2026-27` is treated as **codes-only**.
- Do not display or restore upstream full text for codes-only sources unless rights
  clearance exists for your environment.
- Keep attribution and source semantics from the release manifest and
  `licensing-and-provenance.md`.

### Privacy

All sample learner/content records in this repo are synthetic and
not production data.

Real learner observations belong to product-managed systems with:

- tenant boundaries,
- role-based access control,
- audit logging,
- retention policy,
- deletion/export workflows where required by policy or regulation.

All learner, content, and classroom data remains outside the taxonomy release
files and `docs/` docs.
