# Data Model

All released data is UTF-8 JSON under `data/`. Schemas live under `schema/`.

## `data/topics.json`

Purpose: graph nodes.

Top-level fields:

- `version`: taxonomy version.
- `topicCount`: declared count of topics.
- `topics`: array of micro-topic records.

Topic fields:

| Field              | Meaning                                                                                                |
|--------------------|--------------------------------------------------------------------------------------------------------|
| `id`               | Stable topic identifier. Must start with `mt_`.                                                        |
| `type`             | One of `CONCEPTUAL`, `PROCEDURAL`, `REPRESENTATIONAL`, `LANGUAGE`, `META`.                             |
| `subject`          | Broad subject such as Mathematics, English, Science, History, Computing, or Life Skills.               |
| `domain`           | More specific area within the subject. Can be null.                                                    |
| `name`             | Human-readable topic name. Can be null in the schema, though release examples generally provide names. |
| `description`      | Plain-language explanation of the topic.                                                               |
| `ageRangeStart`    | Approximate starting age. Can be null.                                                                 |
| `ageRangeEnd`      | Approximate ending age. Can be null.                                                                   |
| `centrality`       | Optional graph centrality score.                                                                       |
| `evidence`         | Observable mastery criteria.                                                                           |
| `assessmentPrompt` | Optional natural-language assessment prompt.                                                           |
| `standards`        | Curriculum standard keys referenced by this topic.                                                     |

Important usage notes:

- `assessmentPrompt` may contain `{{name}}`; substitute the learner's name or
  remove the placeholder before display.
- Treat `id` values as durable public identifiers.
- Do not add child-specific state to topics.

## `data/dependencies.json`

Purpose: graph edges.

Top-level fields:

- `version`: taxonomy version.
- `note`: optional file-level note.
- `edgeCount`: declared count of dependencies.
- `dependencies`: array of dependency records.

Dependency fields:

| Field            | Meaning                                                |
|------------------|--------------------------------------------------------|
| `topicId`        | Topic that has a prerequisite.                         |
| `prerequisiteId` | Topic that should come before `topicId`.               |
| `strength`       | `hard` or `soft`.                                      |
| `reason`         | Optional explanation of the prerequisite relationship. |

Read the edge as:

```text
topicId depends on prerequisiteId
```

## `data/curriculum-standards.json`

Purpose: external curriculum standards and standard codes used for topic
alignment.

Top-level fields:

- `note`: optional file-level note.
- `codesOnlySources`: sources where verbatim standard text is intentionally
  omitted.
- `curriculumCount`: declared count of curricula.
- `curricula`: array of curriculum source records.

Curriculum fields:

| Field          | Meaning                                                       |
|----------------|---------------------------------------------------------------|
| `slug`         | Stable curriculum source identifier.                          |
| `country`      | Country or framework jurisdiction label.                      |
| `name`         | Human-readable curriculum name.                               |
| `version`      | Curriculum version or publication label.                      |
| `sourceUrl`    | Source URL when available.                                    |
| `textIncluded` | Whether full standard text is included.                       |
| `license`      | Source license or license note.                               |
| `topicCount`   | Declared count of standard records in this curriculum object. |
| `topics`       | Array of standard records.                                    |

Standard record fields:

| Field  | Meaning                                                             |
|--------|---------------------------------------------------------------------|
| `key`  | Full standard key, usually `<slug>:<code>`.                         |
| `code` | Native standard code.                                               |
| `data` | Optional full-text metadata object. Omitted for codes-only sources. |

## `data/clusters.json`

Purpose: reader-friendly summaries for grouped curriculum areas.

Top-level fields:

- `version`: taxonomy version.
- `clusterCount`: declared count of clusters.
- `clusters`: array of cluster records.

Cluster fields:

| Field           | Meaning                       |
|-----------------|-------------------------------|
| `subject`       | Subject for the cluster.      |
| `domain`        | Domain inside the subject.    |
| `ageRangeStart` | Age-band starting age.        |
| `summary`       | Parent-friendly summary text. |

The cluster schema does not currently include `ageRangeEnd`; age buckets are
represented by `ageRangeStart`.

## `data/manifest.json`

Purpose: release inventory and integrity record.

Important fields:

- `dataset`: dataset name.
- `taxonomyVersion`: taxonomy version.
- `generatedAt`: release generation timestamp.
- `codesOnlySources`: source slugs whose full text is omitted.
- `counts`: release counts for topics, dependencies, curricula, standards,
  topic-standard links, clusters, and subjects.
- `files`: byte counts and SHA-256 checksums for released data files.
- `excluded`: intentionally omitted categories.

The validator computes file hashes from bytes on disk, so line endings matter.
The repo uses `.gitattributes` to keep JSON files LF-normalized.
