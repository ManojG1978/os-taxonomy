# Marble Skill Taxonomy Documentation

This folder documents the Marble Skill Taxonomy repository as it exists in this
release. The repo is primarily a knowledge graph for primary and elementary
education curricula, with micro-topics as graph nodes, prerequisite
relationships as graph edges, and curriculum standards as external alignment
targets.

The strongest curriculum coverage is for US and UK education frameworks:

- UK National Curriculum for England, Key Stages 1 and 2.
- Common Core English Language Arts.
- Common Core Mathematics.
- Next Generation Science Standards K-5 and Middle School, shipped as
  codes-only references.
- C3 Social Studies, shipped as codes-only references.

The dataset also includes IB PYP Personal, Social and Physical Education
codes-only references. See [curriculum coverage](curriculum-coverage.md) and
[licensing and provenance](licensing-and-provenance.md) before redistributing
curriculum-aligned content.

## What The Repo Contains

- `data/topics.json`: 1,590 micro-topics. These are the graph nodes.
- `data/dependencies.json`: 3,221 prerequisite relationships. These are the
  graph edges.
- `data/curriculum-standards.json`: 8 curriculum sources and 3,301 standards or
  standard codes.
- `data/curriculum-alignments.json`: 76 reviewed board/class/subject alignment
  rows for richer filtering metadata.
- `data/clusters.json`: 183 subject/domain/age-band summaries.
- `data/manifest.json`: release counts, codes-only source list, and SHA-256
  checksums for the released data files.
- `schema/`: JSON Schemas for each data file.
- `scripts/validate.mjs`: dependency-free validator for structure, references,
  counts, and checksums.
- `media/`: visualization assets used by the README.
- `README.md`, `PROVENANCE.md`, `CHANGELOG.md`, `CITATION.cff`, `LICENSE`, and
  `LICENSE-CONTENT`: public-facing release, citation, and licensing material.

## Documentation Map

- [Knowledge graph model](knowledge-graph.md): how topics, dependencies,
  standards, and clusters fit together.
- [Data model](data-model.md): field-by-field explanation of the JSON files.
- [Curriculum coverage](curriculum-coverage.md): countries, curricula, text
  inclusion, and subject/domain coverage.
- [EaseFactor taxonomy integration spec](easefactor-taxonomy-integration-spec.md):
  product philosophy, architecture, API shape, and prerequisites for using the
  taxonomy inside an adaptive learning application.
- [EaseFactor reference slice](easefactor-reference-slice.md): dependency-free
  Class 6 Mathematics Number System integration example for the first build chain
  and service mapping.
- [Validation and release workflow](validation-and-release.md): how to verify
  integrity, checksums, and line endings.
- [Licensing and provenance](licensing-and-provenance.md): how the repo's
  ODbL, CC BY-SA, and third-party curriculum boundaries work.
- [Agent workflow](agent-workflow.md): Codex and Claude guidance for working in
  this repo.

## Core Mental Model

Think of this repository as a portable curriculum graph:

1. A learner-facing concept, skill, practice, or language idea is represented as
   a micro-topic.
2. A micro-topic may depend on earlier micro-topics.
3. A micro-topic may align to one or more curriculum standards.
4. Clusters summarize related topics at the subject/domain/age-band level.
5. The manifest records what was released and verifies the bytes of the release
   data.

This repo does not include a product runtime, user accounts, child data,
embeddings, or learner mastery state.
