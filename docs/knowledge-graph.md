# Knowledge Graph Model

The Marble Skill Taxonomy is a directed education knowledge graph.

## Nodes

Nodes are micro-topics from `data/topics.json`. A micro-topic is intended to be
a single teachable idea, skill, representation, language target, or learning
strategy.

Each topic has:

- A stable `id` beginning with `mt_`.
- A `type`: `CONCEPTUAL`, `PROCEDURAL`, `REPRESENTATIONAL`, `LANGUAGE`, or
  `META`.
- A `subject` and usually a `domain`.
- A `name` and `description`.
- An approximate age range.
- `evidence` statements describing observable mastery.
- An optional `assessmentPrompt`, often with a `{{name}}` placeholder.
- Zero or more curriculum `standards` keys.
- An optional `centrality` score.

## Edges

Edges are prerequisite relationships from `data/dependencies.json`.

The edge direction is:

```text
topicId depends on prerequisiteId
```

For example, if a dependency says topic A depends on topic B, then B should be
understood before A. To compute "unlocks", reverse the edge direction.

Each dependency has:

- `topicId`: the topic being learned.
- `prerequisiteId`: the prerequisite topic.
- `strength`: `hard` or `soft`.
- `reason`: a short explanation of why the dependency exists.

The README describes the graph as a directed acyclic graph. The current
validator checks endpoint references and self-dependencies, but it does not yet
perform a full cycle check.

## Curriculum Alignment

Curriculum standards live in `data/curriculum-standards.json`. Topics refer to
standards by key using this format:

```text
<curriculum-slug>:<standard-code>
```

Examples of curriculum slugs include:

- `uk-nc-2013`
- `ccss-ela`
- `ccss-math`
- `ngss-k5`
- `ngss-ms`
- `c3-social-studies`
- `ib-pyp-pspe`

The alignment is many-to-many:

- One topic can map to multiple standards.
- One standard can be linked from multiple topics.
- Some curriculum records include full standard text.
- Some curriculum records intentionally include only code/key identifiers.

## Clusters

Clusters in `data/clusters.json` are not graph edges. They are summarized
groupings by `subject`, `domain`, and `ageRangeStart`.

Use clusters when a parent, educator, or product surface needs a compact domain
summary instead of individual topic rows.

## What Is Excluded

The public release intentionally excludes:

- Semantic embeddings.
- Child mastery beliefs or other per-child state.
- User or customer data.
- Teaching research.
- Interactive visualization code.

The media assets in `media/` are release illustrations, not the graph runtime.
