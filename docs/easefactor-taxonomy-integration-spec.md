# EaseFactor Taxonomy Integration Spec

This document describes how an application like EaseFactor should use the
Marble Skill Taxonomy as a product capability. It is written from the
perspective of a product team integrating the taxonomy into an adaptive
learning platform, not from the perspective of this repository becoming an
application runtime.

## Executive Summary

The Marble Skill Taxonomy should become EaseFactor's curriculum intelligence
layer: the stable map of what learning means, how concepts depend on one
another, what evidence demonstrates mastery, and how topics connect to
curriculum standards.

EaseFactor should not expose the raw graph as the main product experience.
Learners, parents, and teachers need clear guidance, not a graph database UI.
The graph should power product decisions behind the scenes:

- what to diagnose,
- what a learner is ready to learn,
- what missing prerequisite explains a struggle,
- what a lesson, question, worksheet, or video teaches,
- what curriculum outcome a learning path supports,
- why a recommendation was made.

The clean product boundary is:

```text
Marble taxonomy defines the learning map.
EaseFactor owns learner state, content, planning, recommendations, and UX.
```

## Product Philosophy

### 1. Treat the taxonomy as a map, not a course

The taxonomy is not a lesson sequence, textbook, LMS, or tutoring engine. It is
a connected map of micro-topics, prerequisite relationships, curriculum
alignment, evidence criteria, and parent-friendly cluster summaries.

EaseFactor should use this map to organize learning, but it must still provide:

- content,
- diagnostics,
- activities,
- assessment logic,
- learner state,
- pacing,
- explanations,
- teacher and parent workflows.

The product should not say, "Here is the graph." It should say, "Here is what
your child is ready for next, and here is why."

### 2. Separate public knowledge from private learner state

The taxonomy is shared, versioned, and reusable. Learner state is private,
dynamic, and product-owned. Do not add user, child, customer, classroom, or
institution data to the taxonomy repository or taxonomy data files.

The taxonomy can answer:

- What is this topic?
- What does it depend on?
- What does it unlock?
- What evidence suggests mastery?
- Which standards or curriculum mappings does it support?

EaseFactor must answer:

- Has this learner mastered it?
- How confident are we?
- What evidence do we have?
- When was it last observed?
- What content was used?
- What intervention worked?
- What should happen next?

### 3. Make personalization explainable

The strongest product advantage is not merely adaptive sequencing. It is
explainable adaptive sequencing.

Every recommendation should be able to produce a short, human-readable reason:

- "This topic is ready because all hard prerequisites are secure."
- "This lesson is recommended because it unlocks four upcoming fraction
  topics."
- "This learner is struggling with area because multiplication arrays are still
  developing."
- "This worksheet supports Class 6 Number System and covers two reviewed
  standards alignments."

Opaque recommendations are easier to ship but harder to trust. The taxonomy
allows EaseFactor to build trust through clear prerequisite and curriculum
evidence.

### 4. Let standards filter the graph, not replace it

Board, class, and curriculum mappings should produce views over the canonical
graph. They should not fork the graph into separate topic systems.

Two modes are useful:

- `strictCurriculumView`: only topics explicitly aligned to the selected board,
  class, subject, strand, or standard.
- `learningGraphView`: aligned topics plus prerequisite closure from the
  canonical graph, including foundations the curriculum may assume but not
  name directly.

Use strict views for curriculum coverage reporting. Use learning views for
diagnosis, remediation, sequencing, and tutoring.

### 5. Design for evidence, not completion

Completion is not mastery. Watching a video, finishing a worksheet, or
answering one question correctly should not automatically mark a topic as
mastered.

EaseFactor should model mastery as a belief based on evidence:

- diagnostic results,
- practice performance,
- teacher observations,
- spaced review,
- error patterns,
- confidence decay over time,
- prerequisite consistency.

The taxonomy's `evidence` fields should shape what the product tries to
observe. The product's mastery engine should decide how strongly each
observation updates confidence.

## Current Taxonomy Capabilities

The v1 dataset provides:

- 1,590 micro-topic nodes in `data/topics.json`.
- 3,221 prerequisite edges in `data/dependencies.json`.
- subject, domain, type, age range, centrality, evidence, standards, and
  assessment prompts on topics.
- hard and soft prerequisite relationships with short reasons.
- curriculum standards and code references in `data/curriculum-standards.json`.
- richer board/class/subject/strand filtering in
  `data/curriculum-alignments.json`.
- parent-friendly summaries in `data/clusters.json`.
- release counts and SHA-256 checksums in `data/manifest.json`.

The public release intentionally excludes:

- learner mastery state,
- private user data,
- semantic embeddings,
- teaching research,
- product runtime code,
- interactive app state.

These exclusions are product design constraints, not gaps to patch inside the
dataset release.

## Recommended Product Architecture

EaseFactor should integrate the taxonomy through five product services or
modules.

```text
Taxonomy Importer
  -> Taxonomy Graph Store
  -> Learner Mastery Service
  -> Content Mapping Service
  -> Planner and Recommendation Service
  -> Product Surfaces
```

### 1. Taxonomy Importer

Purpose: ingest a specific taxonomy release into the EaseFactor runtime.

Responsibilities:

- load `topics.json`, `dependencies.json`, `curriculum-standards.json`,
  `curriculum-alignments.json`, `clusters.json`, and `manifest.json`;
- verify counts and checksums before import;
- preserve `taxonomyVersion`;
- reject imports where dependency endpoints do not resolve;
- record source file hashes for auditability;
- preserve codes-only curriculum boundaries.

The importer should be deterministic and idempotent. Importing the same release
twice should not create duplicate topics or edges.

### 2. Taxonomy Graph Store

Purpose: expose fast graph reads to the application.

Storage can be simple at first. Postgres tables, SQLite, or a document store
with precomputed adjacency maps are enough for v1 scale. A specialized graph
database is not required for the first implementation.

Minimum tables or collections:

- `taxonomy_releases`
- `topics`
- `topic_dependencies`
- `curriculum_standards`
- `curriculum_alignments`
- `clusters`
- `topic_prerequisite_closure` or cached traversal results
- `topic_unlock_closure` or cached traversal results

Important indexes:

- topic id,
- subject and domain,
- age range,
- standard key,
- curriculum, country, board, class, subject, strand,
- dependency topic id,
- dependency prerequisite id.

### 3. Learner Mastery Service

Purpose: store and derive private learner-topic mastery state.

This service should be product-owned and should never write back into the
taxonomy data files.

Core objects:

- `mastery_event`: raw observation from an activity, diagnostic, teacher
  override, or review session.
- `mastery_state`: derived belief for a learner-topic pair.
- `learning_gap`: missing or weak prerequisite that blocks a goal topic.
- `readiness_state`: whether a learner is ready to learn a target topic.

The service should support multiple mastery statuses:

- `unseen`
- `introduced`
- `developing`
- `secure`
- `needs_review`
- `blocked`

The most important value is not the label alone. It is the confidence,
evidence trail, and explanation.

### 4. Content Mapping Service

Purpose: connect EaseFactor content to taxonomy topics.

Any lesson, question, worksheet, video, game, quiz, or generated practice set
should be tagged against one or more topic IDs.

Content-topic mappings should include:

- `topicId`
- content id
- role: `teaches`, `practices`, `assesses`, `reviews`, or `extends`
- confidence: `machine`, `reviewed`, or `verified`
- evidence fields or rubric items covered
- estimated time
- difficulty
- prerequisite assumptions
- applicable curriculum filters

This service makes the graph actionable. Without content mappings, the planner
can identify what should happen next but cannot execute a product experience.

### 5. Planner and Recommendation Service

Purpose: decide what should happen next for a learner or class.

Inputs:

- learner mastery state,
- target curriculum or goal topics,
- taxonomy prerequisite graph,
- available content,
- session constraints,
- teacher or parent preferences,
- recent activity history.

Outputs:

- next-best topic,
- remediation plan,
- diagnostic plan,
- review plan,
- learning path,
- explanation,
- content recommendations.

The planner should be deterministic by default and explicitly versioned. If
machine learning or LLM-based ranking is added later, the system should retain
a rule-based explanation layer.

## API Design

The API should be internal first. A public developer API can come later after
the product semantics are stable.

### API Principles

- Version every taxonomy-facing endpoint.
- Include `taxonomyVersion` in graph responses.
- Keep raw taxonomy reads separate from learner-private endpoints.
- Return explanation fields with recommendations.
- Prefer topic IDs over names as stable identifiers.
- Do not expose child data through taxonomy endpoints.
- Do not include full text for codes-only curriculum sources unless rights are
  cleared.

## Taxonomy API

Read-only APIs for graph and curriculum lookup.

```http
GET /taxonomy/v1/releases/current
GET /taxonomy/v1/topics
GET /taxonomy/v1/topics/{topicId}
GET /taxonomy/v1/topics/{topicId}/prerequisites
GET /taxonomy/v1/topics/{topicId}/unlocks
GET /taxonomy/v1/topics/{topicId}/neighborhood
GET /taxonomy/v1/curricula
GET /taxonomy/v1/standards
GET /taxonomy/v1/curriculum-alignments
GET /taxonomy/v1/clusters
GET /taxonomy/v1/coverage
```

Example topic search:

```http
GET /taxonomy/v1/topics?subject=Mathematics&domain=Number%20System&age=11
```

Example topic response:

```json
{
  "taxonomyVersion": "v1",
  "topic": {
    "id": "mt_JwP9QFv6gQ",
    "type": "CONCEPTUAL",
    "subject": "Mathematics",
    "domain": "Number System",
    "name": "Example topic",
    "description": "Plain-language topic description.",
    "ageRange": {
      "start": 10,
      "end": 12
    },
    "centrality": 0.19,
    "evidence": [
      "Observable mastery criterion"
    ],
    "assessmentPrompt": "Can the learner demonstrate the idea?",
    "standards": [
      "ncert-class6-math-2026-27:M6.NS.001"
    ]
  }
}
```

Example prerequisite response:

```json
{
  "taxonomyVersion": "v1",
  "topicId": "mt_target",
  "depth": 2,
  "prerequisites": [
    {
      "topicId": "mt_prereq",
      "strength": "hard",
      "distance": 1,
      "reason": "Learner should understand the representation first."
    }
  ]
}
```

## Learner Mastery API

Private APIs for learner evidence and derived mastery state.

```http
GET /learners/{learnerId}/mastery
GET /learners/{learnerId}/mastery/{topicId}
POST /learners/{learnerId}/mastery-events
PATCH /learners/{learnerId}/mastery/{topicId}
GET /learners/{learnerId}/gaps
GET /learners/{learnerId}/readiness/{topicId}
```

Example mastery event:

```json
{
  "topicId": "mt_JwP9QFv6gQ",
  "taxonomyVersion": "v1",
  "source": "diagnostic_quiz",
  "activityId": "act_9821",
  "result": "partial",
  "score": 0.67,
  "evidence": [
    "Correctly placed 3 of 5 numbers on a number line"
  ],
  "observedAt": "2026-07-09T10:30:00Z"
}
```

Example mastery state:

```json
{
  "learnerId": "lrn_123",
  "topicId": "mt_JwP9QFv6gQ",
  "taxonomyVersion": "v1",
  "status": "developing",
  "confidence": 0.72,
  "lastEvidenceAt": "2026-07-09T10:30:00Z",
  "readyToLearn": true,
  "blockedBy": [],
  "explanation": "Recent diagnostic evidence is partial, but hard prerequisites are secure."
}
```

## Content Mapping API

APIs for tagging and retrieving learning content by topic.

```http
GET /content-maps/topics/{topicId}
GET /content-maps/content/{contentId}
POST /content-maps
PATCH /content-maps/{mappingId}
POST /content-maps/batch-review
```

Example mapping:

```json
{
  "contentId": "lesson_456",
  "topicId": "mt_JwP9QFv6gQ",
  "taxonomyVersion": "v1",
  "role": "teaches",
  "confidence": "reviewed",
  "coveredEvidence": [
    "Places whole numbers correctly on a number line"
  ],
  "estimatedMinutes": 14,
  "difficulty": "core",
  "reviewedBy": "curriculum_team"
}
```

## Planner API

APIs that convert graph, learner state, and content inventory into product
actions.

```http
POST /planner/v1/next-best-topics
POST /planner/v1/learning-path
POST /planner/v1/remediation-plan
POST /planner/v1/diagnostic-plan
POST /planner/v1/review-plan
POST /planner/v1/content-recommendations
```

Example next-best request:

```json
{
  "learnerId": "lrn_123",
  "goal": {
    "curriculum": "ncert-class6-math-2026-27",
    "board": "CBSE",
    "class": 6,
    "subject": "Mathematics",
    "strand": "Number System"
  },
  "constraints": {
    "sessionMinutes": 20,
    "maxNewTopics": 2,
    "includeReview": true
  },
  "preferences": {
    "prioritize": [
      "readiness",
      "unlockValue",
      "curriculumCoverage"
    ]
  }
}
```

Example next-best response:

```json
{
  "taxonomyVersion": "v1",
  "recommendations": [
    {
      "topicId": "mt_JwP9QFv6gQ",
      "rank": 1,
      "readiness": 0.84,
      "estimatedMinutes": 18,
      "prerequisiteStatus": {
        "secure": 5,
        "developing": 1,
        "missing": 0
      },
      "unlockValue": {
        "directUnlocks": 4,
        "twoHopUnlocks": 9
      },
      "reason": "The learner has no missing hard prerequisites, this topic supports the selected curriculum strand, and it unlocks several upcoming topics.",
      "content": [
        {
          "contentId": "lesson_456",
          "role": "teaches",
          "estimatedMinutes": 14
        }
      ]
    }
  ]
}
```

## Core Product Workflows

### Diagnostic onboarding

Goal: quickly estimate the learner's current position in the graph.

Required capabilities:

- choose diagnostic topics by age, curriculum, and high-centrality graph
  positions;
- include prerequisite probes for target curriculum topics;
- record raw mastery events;
- derive initial mastery state with confidence;
- identify high-impact gaps.

Output:

- secure topics,
- developing topics,
- likely gaps,
- recommended starting path,
- confidence limitations.

### Next-best lesson

Goal: choose a productive topic for the next session.

Required capabilities:

- filter candidate topics by curriculum goal or teacher assignment;
- remove topics blocked by missing hard prerequisites;
- score candidates by readiness, unlock value, curriculum relevance, review
  need, and available content;
- return a short explanation;
- attach suitable content.

Output:

- topic,
- reason,
- content,
- expected evidence to collect,
- fallback if the learner struggles.

### Remediation

Goal: explain and repair a struggle.

Required capabilities:

- start from a failed topic or activity;
- traverse hard prerequisites backward;
- compare prerequisite topics against mastery state;
- rank likely blockers;
- recommend the smallest repair path;
- avoid sending the learner too far back unless evidence supports it.

Output:

- blocker topics,
- why each matters,
- repair sequence,
- reassessment trigger.

### Curriculum coverage

Goal: show teachers, parents, or internal teams what has been covered against a
selected curriculum.

Required capabilities:

- strict curriculum filtering by board, class, subject, strand, or standard;
- distinguish aligned coverage from prerequisite support;
- separate taught, practiced, assessed, and mastered states;
- show alignment confidence;
- preserve codes-only licensing boundaries.

Output:

- coverage percentage,
- topic list,
- gaps,
- over-coverage or extension topics,
- evidence trail.

### Content authoring and QA

Goal: make content production graph-aware.

Required capabilities:

- assign topic IDs during content creation;
- show prerequisites authors must not assume;
- require evidence coverage for assessment items;
- review topic mappings before release;
- detect content gaps for high-priority topics.

Output:

- content-topic mapping,
- assessment coverage,
- authoring warnings,
- review status.

## Data Model Needed In EaseFactor

The following product-side models are needed in addition to the Marble data
files.

### `taxonomy_release`

- `version`
- `importedAt`
- `manifestHash`
- `sourceFileHashes`
- `status`
- `notes`

### `learner_topic_mastery`

- `learnerId`
- `topicId`
- `taxonomyVersion`
- `status`
- `confidence`
- `lastEvidenceAt`
- `lastReviewedAt`
- `blockedBy`
- `explanation`
- `updatedAt`

### `mastery_event`

- `eventId`
- `learnerId`
- `topicId`
- `taxonomyVersion`
- `source`
- `activityId`
- `score`
- `result`
- `evidence`
- `observedAt`
- `metadata`

### `content_topic_map`

- `mappingId`
- `contentId`
- `topicId`
- `taxonomyVersion`
- `role`
- `confidence`
- `coveredEvidence`
- `difficulty`
- `estimatedMinutes`
- `reviewStatus`
- `createdAt`
- `updatedAt`

### `planner_decision_log`

- `decisionId`
- `learnerId`
- `request`
- `candidateTopics`
- `selectedTopics`
- `scores`
- `explanation`
- `taxonomyVersion`
- `createdAt`

The planner decision log is important for debugging recommendations and
building trust with teachers and parents.

## Ranking And Scoring Approach

The first planner should be rule-based and inspectable.

Recommended factors:

- `readiness`: hard prerequisites secure or sufficiently developing.
- `blockerPenalty`: missing hard prerequisite count.
- `unlockValue`: downstream topics unlocked by mastering this topic.
- `curriculumFit`: direct or supporting alignment to the selected curriculum.
- `evidenceNeed`: weak or stale mastery evidence.
- `contentAvailability`: suitable content exists and is reviewed.
- `ageFit`: topic age range is appropriate for the learner.
- `reviewNeed`: prior mastery is decaying or has not been revisited.
- `teacherPriority`: explicit teacher assignment or override.

Example scoring sketch:

```text
score =
  readiness * 0.30
  + curriculumFit * 0.20
  + unlockValue * 0.15
  + evidenceNeed * 0.15
  + contentAvailability * 0.10
  + ageFit * 0.05
  + teacherPriority * 0.05
  - blockerPenalty
```

The exact weights should be tuned with product evidence. The important rule is
that the system must return both the result and the reason.

## Error Handling And Edge Cases

### Unknown topic ID

Return `404` from taxonomy endpoints. In learner or planner endpoints, mark the
request invalid and include the taxonomy version used by the caller.

### Version mismatch

If learner state references an older taxonomy version, the API should either:

- serve the old release if retained, or
- run a migration map, or
- return a clear `taxonomy_version_unsupported` error.

Do not silently reinterpret old topic IDs against a new release.

### Missing content

The planner should be able to recommend a topic even when reviewed content is
missing, but the response should clearly mark the execution gap:

```json
{
  "topicId": "mt_target",
  "recommendable": true,
  "servableNow": false,
  "reason": "The learner is ready, but no reviewed teaching content is mapped to this topic."
}
```

### Missing prerequisite evidence

Unknown is not the same as mastered. If a hard prerequisite has no evidence,
the planner should either probe it or avoid the target topic.

### Codes-only curriculum sources

For codes-only sources, product surfaces may show source codes and Marble-owned
alignment metadata. They must not restore or display upstream full text unless
rights clearance exists.

### Teacher override

Teachers should be able to override recommendations. The system should record
the override and continue to track prerequisite risk rather than hiding it.

## Privacy, Licensing, And Governance

### Privacy

Do not store learner state in the taxonomy repository or taxonomy data files.
Product databases must treat learner observations as private educational data.

Minimum expectations:

- tenant or institution boundaries,
- role-based access control,
- audit logs for teacher/admin access,
- data retention rules,
- parent/guardian visibility rules,
- deletion/export workflows where legally required.

### Licensing

The taxonomy uses a multi-license model:

- database structure and relationships under ODbL 1.0;
- Marble-authored textual content under CC BY-SA 4.0;
- upstream curriculum standards under their own licenses.

EaseFactor must preserve attribution and share-alike obligations for derivative
taxonomy databases. Product behavior, learner state, content, and UI can remain
proprietary, but modifications to the taxonomy database itself must be handled
according to the license.

### Provenance

Every product response that depends on curriculum alignment should be able to
trace:

- taxonomy version,
- topic ID,
- standard key,
- alignment source,
- alignment confidence,
- content mapping confidence.

## Implementation Phases

### Phase 1: Internal graph service

Build:

- taxonomy importer,
- read-only taxonomy API,
- prerequisite and unlock traversal,
- curriculum filtering,
- validation during import,
- simple admin or developer inspection endpoint.

Success criteria:

- current v1 dataset imports cleanly;
- topic, prerequisite, unlock, and curriculum filter APIs work;
- all responses include `taxonomyVersion`;
- codes-only boundaries are preserved.

### Phase 2: Learner mastery foundation

Build:

- mastery events,
- derived mastery state,
- readiness check,
- gap detection,
- basic diagnostic onboarding.

Success criteria:

- product can explain why a learner is ready or blocked for a topic;
- raw evidence is preserved separately from derived state;
- unknown prerequisite evidence is handled conservatively.

### Phase 3: Content mapping

Build:

- content-topic mapping model,
- review workflow for mappings,
- content lookup by topic,
- content gap reporting.

Success criteria:

- every recommended topic can be checked against available content;
- mappings distinguish teaches, practices, assesses, reviews, and extends;
- unreviewed machine mappings are visible as lower-confidence.

### Phase 4: Planner and recommendation engine

Build:

- next-best topic endpoint,
- remediation endpoint,
- learning path endpoint,
- explanation generator,
- decision logs.

Success criteria:

- recommendations are reproducible;
- explanations cite readiness, prerequisites, curriculum fit, and content;
- teacher overrides are supported without erasing graph risk.

### Phase 5: Product surfaces

Build:

- learner dashboard,
- parent explanation cards,
- teacher coverage dashboard,
- diagnostic flow,
- authoring and content QA tools.

Success criteria:

- graph complexity is hidden behind clear user-facing decisions;
- parent and teacher surfaces explain "why this next";
- curriculum coverage separates aligned topics from prerequisite support.

## What Must Be In Place

To make the vision work, EaseFactor needs the following foundations.

### Technical foundations

- versioned taxonomy import pipeline,
- graph read model with indexed topic and dependency lookups,
- prerequisite and unlock traversal,
- curriculum filtering and strict/learning graph modes,
- learner mastery event store,
- derived mastery state engine,
- content-topic mapping store,
- planner decision logs,
- API versioning,
- role-based authorization,
- observability for recommendation decisions.

### Product foundations

- clear learner, parent, teacher, and content-author workflows,
- diagnostic strategy for estimating initial mastery,
- definition of mastery statuses and confidence,
- policy for teacher overrides,
- explanation style guide,
- curriculum coverage semantics,
- remediation UX,
- review workflow for content mappings.

### Data foundations

- stable topic IDs,
- taxonomy version retention or migration strategy,
- content IDs mapped to topic IDs,
- reviewed mapping confidence,
- evidence criteria linked to assessments where possible,
- audit trail from recommendation to topic, prerequisite, content, and
  curriculum alignment.

### Governance foundations

- attribution placement,
- license compliance review,
- codes-only source display rules,
- child-data privacy controls,
- access logs,
- data retention and deletion processes,
- human review for high-impact curriculum mappings.

## Explicit Non-Goals

This approach should not:

- turn the taxonomy repo into an app backend;
- add child or customer data to this repository;
- expose the raw graph as the primary learner experience;
- treat video or worksheet completion as automatic mastery;
- fork topics per curriculum unless there is a deliberate breaking migration;
- display upstream full text for codes-only sources without rights clearance;
- rely on LLM recommendations without inspectable rule-based explanations.

## Open Product Decisions

The following decisions belong to the EaseFactor product team before
implementation:

- Which first curriculum, class, and subject should be the pilot?
- Should the first learner experience be diagnostic onboarding, next-best
  lesson, remediation, or teacher coverage?
- What mastery statuses should appear to parents and teachers?
- Who can override mastery state?
- What content inventory exists today and how reliably can it be mapped?
- How much taxonomy detail should be visible to teachers versus hidden behind
  explanations?
- How long should older taxonomy versions be retained for learner history?

## Recommended First Build

The best first build is not a full adaptive platform. It is a narrow,
trust-building slice:

```text
Class 6 Mathematics Number System
  -> import taxonomy v1
  -> filter curriculum-aligned topics
  -> compute prerequisite closure
  -> record diagnostic evidence
  -> identify gaps
  -> recommend the next topic with explanation
```

This slice proves the hardest product idea: EaseFactor can explain what a
learner should do next using a real curriculum graph, real evidence, and a
clear prerequisite trail.

