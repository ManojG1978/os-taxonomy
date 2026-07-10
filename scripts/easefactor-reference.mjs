import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const readJson = (rootDir, name) => {
  const filePath = resolve(rootDir, 'data', name);
  const raw = readFileSync(filePath, 'utf8');
  return {
    raw,
    json: JSON.parse(raw),
    path: filePath,
  };
};

const sha256 = (text) => createHash('sha256').update(text).digest('hex');

const assertManifestChecksum = (manifest, sourceFileHashes, sourceName) => {
  const expected = manifest?.files?.[sourceName]?.sha256;
  if (!expected) {
    throw new Error(`missing_manifest_file_entry: ${sourceName}`);
  }
  const actual = sourceFileHashes[sourceName];
  if (actual !== expected) {
    throw new Error(`manifest_checksum_mismatch: ${sourceName} expected ${expected} got ${actual}`);
  }
};

const assertCount = (label, expected, actual) => {
  if (expected !== actual) {
    throw new Error(`manifest_count_mismatch: ${label} expected ${expected} got ${actual}`);
  }
};

export const loadTaxonomyRelease = (rootDir = process.cwd()) => {
  const dataDir = resolve(rootDir, 'data');
  const manifest = JSON.parse(readFileSync(resolve(dataDir, 'manifest.json'), 'utf8'));

  const sourceNames = [
    'topics.json',
    'dependencies.json',
    'curriculum-standards.json',
    'curriculum-alignments.json',
    'clusters.json',
  ];

  const loaded = sourceNames.reduce((acc, name) => {
    const {raw, json} = readJson(rootDir, name);
    acc[name] = json;
    acc.sourceHashes[name] = sha256(raw);
    return acc;
  }, {sourceHashes: {}});

  assertManifestChecksum(manifest, loaded.sourceHashes, 'topics.json');
  assertManifestChecksum(manifest, loaded.sourceHashes, 'dependencies.json');
  assertManifestChecksum(manifest, loaded.sourceHashes, 'curriculum-standards.json');
  assertManifestChecksum(manifest, loaded.sourceHashes, 'curriculum-alignments.json');
  assertManifestChecksum(manifest, loaded.sourceHashes, 'clusters.json');

  assertCount('topics', manifest.counts?.topics, loaded['topics.json'].topics.length);
  assertCount('dependencies', manifest.counts?.dependencies, loaded['dependencies.json'].dependencies.length);
  assertCount('curricula', manifest.counts?.curricula, loaded['curriculum-standards.json'].curricula.length);
  const curriculumStandardsCount = loaded['curriculum-standards.json'].curricula.reduce(
    (count, curriculum) => count + (Array.isArray(curriculum.topics) ? curriculum.topics.length : (curriculum.topicCount ?? 0)),
    0,
  );
  assertCount('curriculumStandards', manifest.counts?.curriculumStandards, curriculumStandardsCount);
  assertCount('clusters', manifest.counts?.clusters, loaded['clusters.json'].clusters.length);
  assertCount('curriculumAlignments', manifest.counts?.curriculumAlignments, loaded['curriculum-alignments.json'].alignments.length);

  const release = {
    taxonomyVersion: manifest.taxonomyVersion,
    manifest,
    topics: loaded['topics.json'].topics,
    dependencies: loaded['dependencies.json'].dependencies,
    curricula: loaded['curriculum-standards.json'].curricula,
    codesOnlySources: [...(loaded['curriculum-standards.json'].codesOnlySources ?? [])],
    alignments: loaded['curriculum-alignments.json'].alignments,
    clusters: loaded['clusters.json'].clusters,
    sourceFileHashes: loaded.sourceHashes,
  };

  return release;
};

const traversal = (startTopicId, getEdgeTargets, edgesBySource, maxDepth) => {
  const out = [];
  const visited = new Set([startTopicId]);
  let frontier = [startTopicId];
  let depth = 0;

  while (frontier.length && depth < maxDepth) {
    depth += 1;
    const next = [];
    for (const topicId of frontier) {
      const edges = edgesBySource[topicId] ?? [];
      for (const edge of edges) {
        const nextId = getEdgeTargets(edge);
        if (!visited.has(nextId)) {
          visited.add(nextId);
          out.push({
            topicId: nextId,
            strength: edge.strength,
            reason: edge.reason ?? null,
            distance: depth,
          });
          next.push(nextId);
        }
      }
    }
    frontier = next;
  }
  return out;
};

const normalizeConfidence = (value) => {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return null;
  }
  return Math.max(0, Math.min(1, value));
};

const statusDefaultConfidence = {
  secure: 0.95,
  developing: 0.6,
  needs_review: 0.3,
  blocked: 0.1,
  unseen: 0,
};

const deriveStatusFromEvidence = ({result, score}) => {
  const normalizedScore = normalizeConfidence(score);

  if (result === 'secure' || (normalizedScore !== null && normalizedScore >= 0.85)) {
    return 'secure';
  }
  if (result === 'partial' || (normalizedScore !== null && normalizedScore >= 0.5)) {
    return 'developing';
  }
  if (result === 'review') {
    return 'needs_review';
  }
  return 'blocked';
};

const toObservedAtEpoch = (observedAt) => {
  if (typeof observedAt === 'number' && Number.isFinite(observedAt)) {
    return observedAt;
  }
  if (typeof observedAt === 'string' || observedAt instanceof Date) {
    const parsed = Date.parse(observedAt);
    if (!Number.isNaN(parsed)) {
      return parsed;
    }
  }
  return Number.NEGATIVE_INFINITY;
};

export const deriveMasteryState = (events = []) => {
  const topicEventsById = new Map();
  const safeEvents = Array.isArray(events) ? events : [];

  for (const event of safeEvents) {
    if (!event?.topicId) {
      continue;
    }

    const topicEvents = topicEventsById.get(event.topicId) || [];
    topicEvents.push(event);
    topicEventsById.set(event.topicId, topicEvents);
  }

  const masteryByTopic = new Map();
  for (const [topicId, eventsForTopic] of topicEventsById.entries()) {
    const sortedEvidence = [...eventsForTopic].sort((a, b) =>
      toObservedAtEpoch(a.observedAt) - toObservedAtEpoch(b.observedAt),
    );

    const latestEvent = sortedEvidence[sortedEvidence.length - 1];
    const status = deriveStatusFromEvidence(latestEvent);
    const explicitConfidence = normalizeConfidence(latestEvent.score);
    const confidence = explicitConfidence ?? statusDefaultConfidence[status];
    const evidenceTrail = sortedEvidence.map((event) => {
      const eventConfidence = normalizeConfidence(event.score) ?? statusDefaultConfidence[deriveStatusFromEvidence(event)];
      return {
        learnerId: event.learnerId ?? null,
        topicId: event.topicId,
        taxonomyVersion: event.taxonomyVersion ?? null,
        result: event.result ?? null,
        score: typeof event.score === 'number' ? normalizeConfidence(event.score) : null,
        observedAt: event.observedAt ?? null,
        status: deriveStatusFromEvidence(event),
        confidence: eventConfidence,
      };
    });

    masteryByTopic.set(topicId, {
      learnerId: latestEvent.learnerId ?? null,
      topicId,
      taxonomyVersion: latestEvent.taxonomyVersion ?? null,
      status,
      confidence,
      lastEvidenceAt: latestEvent.observedAt ?? null,
      evidenceTrail,
      explanation: `${latestEvent.topicId} is ${status} with confidence ${confidence.toFixed(2)}`,
    });
  }

  return masteryByTopic;
};

const isSecureEnough = (masteryState) => (
  masteryState && (masteryState.status === 'secure' || (masteryState.status === 'developing' && masteryState.confidence >= 0.75))
);

const getMasteryState = (masteryByTopic, topicId) => {
  if (!masteryByTopic || typeof masteryByTopic.get !== 'function') {
    return null;
  }
  return masteryByTopic.get(topicId) ?? null;
};

export const checkReadiness = (graph, masteryByTopic, topicId) => {
  const prerequisites = graph.getPrerequisites(topicId, {depth: 1}).prerequisites.filter((row) => row.strength === 'hard');
  const blockedBy = [];
  const prerequisiteStatus = {
    secure: 0,
    developing: 0,
    needs_review: 0,
    blocked: 0,
    unseen: 0,
  };

  for (const prerequisite of prerequisites) {
    const masteryState = getMasteryState(masteryByTopic, prerequisite.topicId);
    if (!masteryState) {
      prerequisiteStatus.unseen += 1;
      blockedBy.push({
        topicId: prerequisite.topicId,
        status: 'unseen',
        confidence: 0,
        reason: prerequisite.reason ?? `Unknown evidence for prerequisite topic ${prerequisite.topicId}.`,
        strength: 'hard',
        distance: prerequisite.distance,
      });
      continue;
    }

    prerequisiteStatus[masteryState.status] = (prerequisiteStatus[masteryState.status] ?? 0) + 1;
    if (!isSecureEnough(masteryState)) {
      blockedBy.push({
        topicId: prerequisite.topicId,
        status: masteryState.status,
        confidence: masteryState.confidence,
        reason: prerequisite.reason ?? `Weak mastery evidence for prerequisite topic ${prerequisite.topicId}.`,
        strength: 'hard',
        distance: prerequisite.distance,
      });
    }
  }

  const readyToLearn = blockedBy.length === 0;
  const developStatus = getMasteryState(masteryByTopic, topicId)?.status === 'developing';
  const explanation = readyToLearn
    ? 'Hard prerequisite evidence is sufficient to proceed.'
    : 'Hard prerequisite evidence is missing or weak.';

  return {
    taxonomyVersion: graph.taxonomyVersion,
    topicId,
    readyToLearn,
    prerequisiteStatus,
    blockedBy,
    developing: developStatus,
    explanation,
  };
};

export const findLearningGaps = (graph, masteryByTopic, topicId) => {
  const readiness = checkReadiness(graph, masteryByTopic, topicId);
  const sortedGaps = [...readiness.blockedBy].sort((a, b) => {
    if (a.confidence !== b.confidence) {
      return a.confidence - b.confidence;
    }
    return a.topicId.localeCompare(b.topicId);
  });

  const gaps = sortedGaps.map((gap, idx) => ({
    rank: idx + 1,
    topicId: gap.topicId,
    status: gap.status,
    confidence: gap.confidence,
    whyItMatters: gap.reason,
  }));

  return {
    taxonomyVersion: graph.taxonomyVersion,
    topicId,
    gaps,
    explanation: `Learning gaps for ${topicId} are ranked by weakest evidence first.`,
  };
};

const allowedContentRoles = new Set(['teaches', 'practices', 'assesses', 'reviews', 'extends']);
const allowedContentConfidence = new Set(['machine', 'reviewed', 'verified']);
const parentJourneyContext = Object.freeze({board: 'CBSE', curriculum: 'ncert-class6-math-2026-27', class: 6, subject: 'Mathematics', language: 'en-IN', topicFamily: 'fractions-comparison'});
const parentConcern = Object.freeze({concernId: 'fraction-size-comparison', text: 'My child finds it hard to tell which fraction is bigger.', targetTopicId: 'mt_IfEgu0X449', foundationalTopicId: 'mt_Kr3IyA6m-O'});
const parentDiagnosticPrompts = Object.freeze([
  {rank: 1, promptId: 'name-fraction-parts', topicId: 'mt_vKcxX6iNOA', prompt: 'In 3/4, what do 3 and 4 tell us?'},
  {rank: 2, promptId: 'place-fraction-number-line', topicId: 'mt_Kr3IyA6m-O', prompt: 'Place 1/4, 1/2, and 3/4 between zero and one.'},
  {rank: 3, promptId: 'compare-fractions', topicId: 'mt_IfEgu0X449', prompt: 'Which is larger, 2/5 or 4/5, and how do you know?'},
]);
const parentRemediationSteps = Object.freeze([
  {rank: 1, actionId: 'locate-benchmark-fractions', topicId: 'mt_Kr3IyA6m-O', instruction: 'Locate one-half, one-quarter, and three-quarters on a line from zero to one.'},
  {rank: 2, actionId: 'place-fractions-zero-to-one', topicId: 'mt_Kr3IyA6m-O', instruction: 'Place unfamiliar proper fractions between zero and one.'},
  {rank: 3, actionId: 'compare-number-line-positions', topicId: 'mt_IfEgu0X449', instruction: 'Compare two fractions by checking which position is farther to the right.'},
]);
const reviewedHouseholdActivity = Object.freeze({
  activityId: 'household-fraction-strip-number-line-v1',
  version: 1,
  review: {status: 'reviewed', scope: 'Marble-authored Class 6 fraction comparison reference activity'},
  title: 'Build a fraction number line with paper strips',
  purpose: 'Connect fraction size to position between zero and one.',
  topicIds: ['mt_Kr3IyA6m-O', 'mt_IfEgu0X449'],
  materials: ['Two sheets of scrap paper', 'Pencil', 'Ruler or straight edge'],
  estimatedMinutes: 15,
  instructions: ['Mark zero and one at the ends of a paper strip.', 'Fold or measure to mark one-half, one-quarter, and three-quarters.', 'Ask the learner to place two new fractions and explain which is farther to the right.'],
  evidencePrompts: ['The learner places benchmark fractions between zero and one.', 'The learner compares two fractions by referring to their positions.'],
  accessibilityNotes: ['Read each instruction aloud if written directions are a barrier.', 'Use a longer strip and thicker marks if fine visual detail is difficult.'],
  safetyNotes: ['Use child-safe scissors only if strips must be cut; tearing or folding is sufficient.'],
  selectionReason: 'The submitted evidence points to fraction position on a number line as the first concept to strengthen.',
  contentMappings: [
    {contentId: 'household-fraction-strip-number-line-v1', topicId: 'mt_Kr3IyA6m-O', taxonomyVersion: 'v1', role: 'practices', confidence: 'reviewed', estimatedMinutes: 15},
    {contentId: 'household-fraction-strip-number-line-v1', topicId: 'mt_IfEgu0X449', taxonomyVersion: 'v1', role: 'extends', confidence: 'reviewed', estimatedMinutes: 15},
  ],
});

const safeNumber = (value, fallback = 0) => (
  typeof value === 'number' && Number.isFinite(value) ? value : fallback
);

const isReviewedTeachingContent = (mapping) => (
  (mapping.role === 'teaches' || mapping.role === 'practices') &&
  (mapping.confidence === 'reviewed' || mapping.confidence === 'verified')
);

const buildContentSummary = (content = []) => {
  const roleRank = {
    teaches: 0,
    practices: 1,
    assesses: 2,
    reviews: 3,
    extends: 4,
  };

  return [...content].sort((a, b) => {
    const roleDiff = (roleRank[a.role] ?? 99) - (roleRank[b.role] ?? 99);
    if (roleDiff !== 0) return roleDiff;

    const confidenceRank = {verified: 0, reviewed: 1, machine: 2};
    const confidenceDiff = (confidenceRank[a.confidence] ?? 99) - (confidenceRank[b.confidence] ?? 99);
    if (confidenceDiff !== 0) return confidenceDiff;

    const minutesDiff = safeNumber(a.estimatedMinutes, 0) - safeNumber(b.estimatedMinutes, 0);
    if (minutesDiff !== 0) return minutesDiff;

    return String(a.contentId ?? '').localeCompare(String(b.contentId ?? ''));
  }).map((item) => ({
    contentId: item.contentId,
    role: item.role,
    confidence: item.confidence,
    estimatedMinutes: safeNumber(item.estimatedMinutes, 0),
  }));
};

export const validateContentMappings = (graph, mappings) => {
  if (!Array.isArray(mappings)) {
    throw new Error('invalid_content_mappings: expected array');
  }

  for (const mapping of mappings) {
    if (!mapping || typeof mapping !== 'object') {
      throw new Error('invalid_content_mapping: expected object');
    }

    const topicId = mapping.topicId;
    graph.getTopic(topicId);

    if (mapping.taxonomyVersion !== graph.taxonomyVersion) {
      throw new Error(`taxonomy_version_mismatch: ${topicId} expected ${graph.taxonomyVersion} got ${mapping.taxonomyVersion}`);
    }

    if (!allowedContentRoles.has(mapping.role)) {
      throw new Error(`invalid_content_role: ${mapping.role}`);
    }

    if (!allowedContentConfidence.has(mapping.confidence)) {
      throw new Error(`invalid_content_confidence: ${mapping.confidence}`);
    }
  }

  return mappings;
};

const buildContentIndex = (mappings) => {
  const byTopicId = new Map();
  for (const mapping of mappings) {
    const rows = byTopicId.get(mapping.topicId) || [];
    rows.push(mapping);
    byTopicId.set(mapping.topicId, rows);
  }
  return byTopicId;
};

const isServableRemediationContent = (mapping) => (
    isReviewedTeachingContent(mapping) || (
        mapping.role === 'reviews' &&
        (mapping.confidence === 'reviewed' || mapping.confidence === 'verified')
    )
);

const estimateMinutes = (contentRows, readiness) => {
  if (!contentRows.length) {
    return readiness.readyToLearn ? 18 : 24;
  }

  const availableMinutes = contentRows
    .map((row) => safeNumber(row.estimatedMinutes, null))
    .filter((value) => value !== null);

  if (!availableMinutes.length) {
    return readiness.readyToLearn ? 15 : 20;
  }

  return Math.max(5, Math.round(availableMinutes.reduce((sum, value) => sum + value, 0) / availableMinutes.length));
};

const buildReason = ({goal, readiness, directUnlocks, twoHopUnlocks, reviewedContentCount, includeReview}) => {
  const parts = [];
  const curriculumLabel = goal.curriculum ? `Curriculum-aligned to ${goal.curriculum}.` : 'Curriculum-aligned recommendation for the requested slice.';
  parts.push(curriculumLabel);

  if (readiness.readyToLearn) {
    parts.push('Readiness is sufficient.');
  } else {
    parts.push(`Blocked by ${readiness.blockedBy.length} prerequisite${readiness.blockedBy.length === 1 ? '' : 's'}.`);
  }

  parts.push(`Unlock value: ${directUnlocks} direct and ${twoHopUnlocks} two-hop unlocks.`);

  if (reviewedContentCount > 0) {
    parts.push('Reviewed teaching content is available.');
  } else if (includeReview) {
    parts.push('No reviewed teaching content is available, so this is a review-only recommendation.');
  } else {
    parts.push('No reviewed teaching content is available.');
  }

  return parts.join(' ');
};

export const recommendNextBestTopics = (graph, request = {}) => {
  const goal = request.goal ?? {};
  const constraints = request.constraints ?? {};
  const includeReview = Boolean(constraints.includeReview);
  const masteryByTopic = request.masteryByTopic ?? new Map();
  const validatedContentMappings = validateContentMappings(graph, request.contentMappings ?? []);
  const contentByTopic = buildContentIndex(validatedContentMappings);
  const curriculumView = graph.getCurriculumTopics({
    ...goal,
    mode: 'strictCurriculumView',
  });

  const dedupedCandidates = [];
  const seenTopicIds = new Set();
  for (const row of curriculumView.topics) {
    if (!row?.topicId || seenTopicIds.has(row.topicId)) {
      continue;
    }
    seenTopicIds.add(row.topicId);
    dedupedCandidates.push(row);
  }

  const scoredCandidates = [];
  for (const candidate of dedupedCandidates) {
    const masteryState = getMasteryState(masteryByTopic, candidate.topicId);
    if (!includeReview && masteryState?.status === 'secure') {
      continue;
    }

    const readiness = checkReadiness(graph, masteryByTopic, candidate.topicId);
    const unlocks1 = graph.getUnlocks(candidate.topicId, {depth: 1}).unlocks;
    const unlocks2 = graph.getUnlocks(candidate.topicId, {depth: 2}).unlocks;
    const directUnlocks = unlocks1.length;
    const twoHopUnlocks = unlocks2.filter((row) => row.distance === 2).length;
    const contentRows = contentByTopic.get(candidate.topicId) || [];
    const reviewableContent = contentRows.filter(isReviewedTeachingContent);
    const contentAvailability = reviewableContent.length > 0
      ? 20 + (reviewableContent.length * 4)
      : contentRows.length > 0
        ? 6
        : 0;
    const curriculumFit = 25;
    const unlockValue = (directUnlocks * 5) + (twoHopUnlocks * 2);
    const evidenceNeed = readiness.readyToLearn ? 0 : Math.min(16, 8 + (readiness.blockedBy.length * 2));
    const goalClass = safeNumber(goal.class, null);
    const candidateClass = safeNumber(candidate.alignment?.class ?? candidate.topic?.class, null);
    const ageFit = goalClass !== null && candidateClass !== null
      ? Math.max(0, 10 - (Math.abs(goalClass - candidateClass) * 2))
      : 0;
    const teacherPriority = safeNumber(constraints.teacherPriority, 0);
    const blockerPenalty = readiness.blockedBy.length * 6;
    const readinessScore = readiness.readyToLearn ? 45 : Math.max(4, 18 - (readiness.blockedBy.length * 4));
    const score = readinessScore + curriculumFit + unlockValue + evidenceNeed + contentAvailability + ageFit + teacherPriority - blockerPenalty;

    const servedContent = buildContentSummary(contentRows);
    const estimatedMinutes = estimateMinutes(servedContent, readiness);
    const recommendable = readiness.readyToLearn || includeReview;
    const servableNow = recommendable && reviewableContent.length > 0;
    const reason = buildReason({
      goal,
      readiness,
      directUnlocks,
      twoHopUnlocks,
      reviewedContentCount: reviewableContent.length,
      includeReview,
    });

    scoredCandidates.push({
      topicId: candidate.topicId,
      candidate,
      score,
      readiness,
      estimatedMinutes,
      prerequisiteStatus: readiness.prerequisiteStatus,
      unlockValue: {
        directUnlocks,
        twoHopUnlocks,
      },
      recommendable,
      servableNow,
      reason,
      content: servedContent,
      scoring: {
        readinessScore,
        curriculumFit,
        unlockValue,
        evidenceNeed,
        contentAvailability,
        ageFit,
        teacherPriority,
        blockerPenalty,
      },
    });
  }

  scoredCandidates.sort((a, b) => {
    if (b.score !== a.score) {
      return b.score - a.score;
    }
    return a.topicId.localeCompare(b.topicId);
  });

  const maxNewTopics = Number.isInteger(request.constraints?.maxNewTopics)
    ? request.constraints.maxNewTopics
    : 3;
  const eligibleCandidates = includeReview
    ? scoredCandidates
    : scoredCandidates.filter((row) => row.recommendable);
  const selectedCandidates = eligibleCandidates.slice(0, Math.max(0, maxNewTopics));

  const recommendations = selectedCandidates.map((row, index) => ({
    topicId: row.topicId,
    rank: index + 1,
    score: row.score,
    readiness: row.readiness.readyToLearn,
    estimatedMinutes: row.estimatedMinutes,
    prerequisiteStatus: row.prerequisiteStatus,
    unlockValue: row.unlockValue,
    recommendable: row.recommendable,
    servableNow: row.servableNow,
    reason: row.reason,
    content: row.content,
  }));

  return {
    taxonomyVersion: graph.taxonomyVersion,
    learnerId: request.learnerId ?? null,
    recommendations,
    decisionLog: {
      candidateTopics: scoredCandidates.map((row) => ({
        topicId: row.topicId,
        score: row.score,
        readiness: row.readiness.readyToLearn,
        recommendable: row.recommendable,
        servableNow: row.servableNow,
      })),
      selectedTopics: recommendations.map((row) => ({
        topicId: row.topicId,
        rank: row.rank,
        score: row.score,
      })),
      scoringVersion: 'easefactor-reference-v1',
      explanation: 'Deterministic ranking prefers readiness, curriculum fit, unlock value, evidence need, content availability, age fit, teacher priority, and blocker pressure.',
    },
  };
};

const remediationStepExplanation = (gap) => {
    const evidenceLabel = gap.status === 'unseen'
        ? 'missing prerequisite evidence'
        : `weak prerequisite evidence (${gap.status}, confidence ${gap.confidence.toFixed(2)})`;
    return `Repair this hard prerequisite first because ${evidenceLabel} blocks readiness for the target topic. ${gap.reason}`;
};

export const buildRemediationPlan = (graph, request = {}) => {
    const targetTopicId = request.targetTopicId;
    if (typeof targetTopicId !== 'string' || targetTopicId.length === 0) {
        throw new Error('missing_target_topic_id');
    }

    const masteryByTopic = request.masteryByTopic ?? new Map();
    const readiness = checkReadiness(graph, masteryByTopic, targetTopicId);
    const validatedContentMappings = validateContentMappings(graph, request.contentMappings ?? []);
    const contentByTopic = buildContentIndex(validatedContentMappings);
    const orderedGaps = [...readiness.blockedBy].sort((a, b) => {
        if (a.confidence !== b.confidence) {
            return a.confidence - b.confidence;
        }
        return a.topicId.localeCompare(b.topicId);
    });

    const steps = orderedGaps.map((gap, index) => {
        const contentRows = contentByTopic.get(gap.topicId) || [];
        const servableContent = contentRows.filter(isServableRemediationContent);
        return {
            rank: index + 1,
            topicId: gap.topicId,
            status: gap.status,
            confidence: gap.confidence,
            strength: gap.strength,
            distance: gap.distance,
            servableNow: servableContent.length > 0,
            readiness: {
                targetTopicId,
                readyToLearnTarget: readiness.readyToLearn,
                blockerStatus: gap.status,
                blockerConfidence: gap.confidence,
            },
            gap: {
                whyItMatters: gap.reason,
                evidenceStatus: gap.status,
            },
            explanation: remediationStepExplanation(gap),
            content: buildContentSummary(contentRows),
        };
    });

    return {
        taxonomyVersion: graph.taxonomyVersion,
        learnerId: request.learnerId ?? null,
        targetTopicId,
        readyToLearnTarget: readiness.readyToLearn,
        prerequisiteStatus: readiness.prerequisiteStatus,
        steps,
        explanation: steps.length === 0
            ? `No hard prerequisite remediation is needed for ${targetTopicId}.`
            : `Repair ${steps.length} hard prerequisite${steps.length === 1 ? '' : 's'} before teaching ${targetTopicId}.`,
    };
};

const isAssessableDiagnosticContent = (mapping) => (
    mapping.role === 'assesses' &&
    (mapping.confidence === 'reviewed' || mapping.confidence === 'verified')
);

const diagnosticStepExplanation = (gap) => {
  const evidenceLabel = gap.status === 'unseen'
      ? 'missing prerequisite evidence'
      : `weak prerequisite evidence (${gap.status}, confidence ${gap.confidence.toFixed(2)})`;
  return `Collect diagnostic evidence first because ${evidenceLabel} blocks readiness for the target topic. ${gap.reason}`;
};

export const buildDiagnosticPlan = (graph, request = {}) => {
  const targetTopicId = request.targetTopicId;
  if (typeof targetTopicId !== 'string' || targetTopicId.length === 0) {
    throw new Error('missing_target_topic_id');
  }

  const masteryByTopic = request.masteryByTopic ?? new Map();
  const readiness = checkReadiness(graph, masteryByTopic, targetTopicId);
  const validatedContentMappings = validateContentMappings(graph, request.contentMappings ?? []);
  const contentByTopic = buildContentIndex(validatedContentMappings);
  const orderedGaps = [...readiness.blockedBy].sort((a, b) => {
    if (a.confidence !== b.confidence) {
      return a.confidence - b.confidence;
    }
    return a.topicId.localeCompare(b.topicId);
  });

  const steps = orderedGaps.map((gap, index) => {
    const contentRows = contentByTopic.get(gap.topicId) || [];
    const assessableContent = contentRows.filter(isAssessableDiagnosticContent);
    const evidenceLabel = gap.status === 'unseen'
        ? 'missing prerequisite evidence'
        : `weak prerequisite evidence (${gap.status}, confidence ${gap.confidence.toFixed(2)})`;

    return {
      rank: index + 1,
      topicId: gap.topicId,
      status: gap.status,
      confidence: gap.confidence,
      strength: gap.strength,
      distance: gap.distance,
      assessableNow: assessableContent.length > 0,
      readiness: {
        targetTopicId,
        readyToLearnTarget: readiness.readyToLearn,
        blockerStatus: gap.status,
        blockerConfidence: gap.confidence,
        explanation: `Readiness is blocked by ${evidenceLabel}.`,
      },
      gap: {
        whyItMatters: gap.reason,
        evidenceStatus: gap.status,
        explanation: `This hard prerequisite blocks readiness for ${targetTopicId}.`,
      },
      explanation: diagnosticStepExplanation(gap),
      content: buildContentSummary(assessableContent),
    };
  });

  return {
    taxonomyVersion: graph.taxonomyVersion,
    learnerId: request.learnerId ?? null,
    targetTopicId,
    readyToLearnTarget: readiness.readyToLearn,
    prerequisiteStatus: readiness.prerequisiteStatus,
    steps,
    explanation: steps.length === 0
        ? `No diagnostic evidence is needed before teaching ${targetTopicId}.`
        : `Collect diagnostic evidence for ${steps.length} hard prerequisite${steps.length === 1 ? '' : 's'} before teaching ${targetTopicId}.`,
  };
};

const parentJourneyError = (code, message = code) => Object.assign(new Error(message), {code});

export const validateReviewedHouseholdActivity = (graph, activity) => {
  try {
    const nonEmptyString = (value) => typeof value === 'string' && value.trim().length > 0;
    const nonEmptyStringArray = (value) => Array.isArray(value) && value.length > 0 && value.every(nonEmptyString);
    if (!activity || typeof activity !== 'object' || Array.isArray(activity)) throw new Error('Household activity must be an object.');
    if (!nonEmptyString(activity.activityId) || !Number.isInteger(activity.version) || activity.version <= 0) throw new Error('Household activity identity and version are required.');
    if (activity.review?.status !== 'reviewed' || !nonEmptyString(activity.review?.scope)) throw new Error('Household activity review metadata is invalid.');
    if (!nonEmptyString(activity.title) || !nonEmptyString(activity.purpose) || !nonEmptyString(activity.selectionReason)) throw new Error('Household activity title, purpose, and selection reason are required.');
    for (const field of ['materials', 'instructions', 'evidencePrompts', 'accessibilityNotes', 'safetyNotes']) {
      if (!nonEmptyStringArray(activity[field])) throw new Error(`Household activity ${field} must contain reviewed text.`);
    }
    if (typeof activity.estimatedMinutes !== 'number' || !Number.isFinite(activity.estimatedMinutes) || activity.estimatedMinutes <= 0) throw new Error('Household activity estimatedMinutes must be positive and finite.');

    const requiredTopicIds = new Set(['mt_Kr3IyA6m-O', 'mt_IfEgu0X449']);
    const activityTopicIds = new Set(activity.topicIds);
    if (!Array.isArray(activity.topicIds) || activity.topicIds.length !== requiredTopicIds.size || activityTopicIds.size !== requiredTopicIds.size || activity.topicIds.some((topicId) => !requiredTopicIds.has(topicId))) throw new Error('Household activity must use the reviewed topic set.');
    for (const topicId of activity.topicIds) graph.getTopic(topicId);
    const mappings = validateContentMappings(graph, activity.contentMappings);
    if (mappings.length === 0) throw new Error('Household activity content mappings are required.');
    const mappedTopicIds = new Set();
    for (const mapping of mappings) {
      if (mapping.contentId !== activity.activityId) throw new Error('Household activity mapping contentId must match activityId.');
      if (mapping.confidence !== 'reviewed' && mapping.confidence !== 'verified') throw new Error('Household activity mappings must be human reviewed.');
      mappedTopicIds.add(mapping.topicId);
    }
    if (mappedTopicIds.size !== requiredTopicIds.size || activity.topicIds.some((topicId) => !mappedTopicIds.has(topicId))) throw new Error('Household activity mapping topics must match activity topics.');
  } catch (error) {
    throw parentJourneyError('invalid_reviewed_activity', error?.message ?? 'Invalid reviewed household activity.');
  }
  return activity;
};

const buildParentOutcome = (responses, foundationalGap, remediationSteps) => {
  const expected = {
    foundationalGapTopicId: foundationalGap?.status === 'identified' ? foundationalGap.topicId : null,
    firstActionId: remediationSteps?.[0]?.actionId ?? null,
  };
  if (!responses || !expected.foundationalGapTopicId || !expected.firstActionId) return {status: 'not-measured', understoodGap: null, identifiedFirstAction: null, expected};
  const understoodGap = responses.foundationalGapTopicId === expected.foundationalGapTopicId;
  const identifiedFirstAction = responses.firstActionId === expected.firstActionId;
  return {status: understoodGap && identifiedFirstAction ? 'passed' : 'not-passed', understoodGap, identifiedFirstAction, expected};
};

const allowedParentJourneyFields = new Set(['context', 'concernId', 'evidenceMode', 'consent', 'diagnosticEvents', 'recheckEvents', 'parentOutcomeResponses']);
const allowedContextFields = new Set(['board', 'curriculum', 'class', 'subject', 'language', 'topicFamily']);
const allowedConsentFields = new Set(['purpose', 'scope', 'observationCapture']);
const allowedEvidenceFields = new Set(['topicId', 'taxonomyVersion', 'result', 'score', 'observedAt']);
const allowedOutcomeFields = new Set(['foundationalGapTopicId', 'firstActionId']);
const allowedParentJourneyEvidenceTopics = new Set(['mt_vKcxX6iNOA', 'mt_Kr3IyA6m-O', 'mt_IfEgu0X449']);
const isValidExplicitTimezoneTimestamp = (value) => {
  if (typeof value !== 'string') return false;
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2})(?:\.(\d+))?)?(Z|[+-](\d{2}):(\d{2}))$/);
  if (!match) return false;
  const [, yearText, monthText, dayText, hourText, minuteText, secondText = '0', , , offsetHourText = '0', offsetMinuteText = '0'] = match;
  const [year, month, day, hour, minute, second, offsetHour, offsetMinute] = [yearText, monthText, dayText, hourText, minuteText, secondText, offsetHourText, offsetMinuteText].map(Number);
  const leapYear = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const daysInMonth = [31, leapYear ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month - 1] ?? 0;
  return day >= 1 && day <= daysInMonth
    && hour <= 23 && minute <= 59 && second <= 59
    && offsetHour <= 23 && offsetMinute <= 59
    && Number.isFinite(Date.parse(value));
};
const assertOnlyFields = (value, allowedFields) => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw parentJourneyError('private_data_not_allowed', 'Journey sections must be objects with reviewed fields only.');
  const unexpected = Object.keys(value).find((field) => !allowedFields.has(field));
  if (unexpected) throw parentJourneyError('private_data_not_allowed', `Private, persistent, or unsupported field is not allowed: ${unexpected}.`);
};
const validateEvidenceTopics = (graph, events) => {
  if (!Array.isArray(events)) throw parentJourneyError('invalid_parent_journey_evidence', 'Evidence must be an array.');
  for (const event of events) {
    if (!event || typeof event !== 'object' || typeof event.topicId !== 'string') throw parentJourneyError('invalid_parent_journey_evidence', 'Each evidence event requires a topicId.');
    assertOnlyFields(event, allowedEvidenceFields);
    if (!allowedParentJourneyEvidenceTopics.has(event.topicId)) throw parentJourneyError('invalid_parent_journey_evidence', `Evidence topic is outside the reviewed parent journey: ${event.topicId}.`);
    if (!['secure', 'partial', 'review', 'blocked'].includes(event.result)) throw parentJourneyError('invalid_parent_journey_evidence', 'Evidence result is invalid.');
    if (typeof event.score !== 'number' || !Number.isFinite(event.score) || event.score < 0 || event.score > 1) throw parentJourneyError('invalid_parent_journey_evidence', 'Evidence score must be finite and between zero and one.');
    if (!isValidExplicitTimezoneTimestamp(event.observedAt)) throw parentJourneyError('invalid_parent_journey_evidence', 'Evidence observedAt must be a valid timestamp with an explicit timezone.');
    if (event.taxonomyVersion !== undefined && event.taxonomyVersion !== graph.taxonomyVersion) throw parentJourneyError('invalid_parent_journey_evidence', 'Evidence taxonomyVersion does not match the current taxonomy.');
    try {
      graph.getTopic(event.topicId);
    } catch (error) {
      throw parentJourneyError('invalid_parent_journey_evidence', error?.message ?? 'Evidence topic is invalid.');
    }
  }
};
const validateParentJourneyBoundary = (graph, request) => {
  assertOnlyFields(request, allowedParentJourneyFields);
  if (!request.context || typeof request.context !== 'object' || Array.isArray(request.context)) throw parentJourneyError('unsupported_parent_journey_context', 'Parent journey context is required.');
  if (!request.consent || typeof request.consent !== 'object' || Array.isArray(request.consent)) throw parentJourneyError('invalid_consent_boundary', 'Consent must be request-only diagnostic guidance.');
  assertOnlyFields(request.context, allowedContextFields);
  assertOnlyFields(request.consent, allowedConsentFields);
  if (request.parentOutcomeResponses !== undefined) assertOnlyFields(request.parentOutcomeResponses, allowedOutcomeFields);
  for (const [field, expected] of Object.entries(parentJourneyContext)) {
    if (request.context?.[field] !== expected) throw parentJourneyError('unsupported_parent_journey_context', `Unsupported parent journey ${field}.`);
  }
  if (request.concernId !== parentConcern.concernId) throw parentJourneyError('unsupported_parent_journey_context', 'Unsupported parent concern.');
  if (request.evidenceMode !== 'synthetic') throw parentJourneyError('synthetic_evidence_required', 'Only synthetic evidence is accepted.');
  if (request.consent?.purpose !== 'diagnostic-guidance' || request.consent?.scope !== 'request-only' || request.consent?.observationCapture !== 'request-only') throw parentJourneyError('invalid_consent_boundary', 'Consent must be request-only diagnostic guidance.');
  validateEvidenceTopics(graph, request.diagnosticEvents === undefined ? [] : request.diagnosticEvents);
  validateEvidenceTopics(graph, request.recheckEvents === undefined ? [] : request.recheckEvents);
};

export const buildParentCompanionJourney = (graph, request = {}) => {
  validateParentJourneyBoundary(graph, request);
  const activity = validateReviewedHouseholdActivity(graph, reviewedHouseholdActivity);
  const diagnosticMastery = deriveMasteryState(request.diagnosticEvents ?? []);
  const recheckMastery = deriveMasteryState(request.recheckEvents ?? []);
  const foundationalState = diagnosticMastery.get(parentConcern.foundationalTopicId) ?? null;
  const gapIdentified = foundationalState !== null && !isSecureEnough(foundationalState);
  const diagnosticPlan = buildDiagnosticPlan(graph, {targetTopicId: parentConcern.targetTopicId, masteryByTopic: diagnosticMastery, contentMappings: activity.contentMappings});
  const learningGaps = findLearningGaps(graph, diagnosticMastery, parentConcern.targetTopicId);
  const remediationPlan = buildRemediationPlan(graph, {targetTopicId: parentConcern.targetTopicId, masteryByTopic: diagnosticMastery, contentMappings: activity.contentMappings});
  const recheckState = recheckMastery.get(parentConcern.foundationalTopicId) ?? null;
  const foundationalGap = gapIdentified ? {status: 'identified', topicId: parentConcern.foundationalTopicId, evidenceStatus: foundationalState.status, confidence: foundationalState.confidence, graphGaps: learningGaps.gaps} : {status: 'not-enough-information', topicId: null, evidenceStatus: foundationalState?.status ?? 'unseen', confidence: foundationalState?.confidence ?? 0, nextPromptId: 'place-fraction-number-line'};
  const remediationSteps = gapIdentified ? parentRemediationSteps.map((row) => ({...row})) : [];
  return {
    taxonomyVersion: graph.taxonomyVersion,
    journeyVersion: 'parent-fractions-v1',
    intake: {context: {...parentJourneyContext}, concernId: parentConcern.concernId, concern: parentConcern.text},
    diagnostic: {prompts: parentDiagnosticPrompts.map((row) => ({...row})), evidenceCount: request.diagnosticEvents?.length ?? 0, plan: diagnosticPlan},
    foundationalGap,
    explanation: gapIdentified ? 'Comparing fractions is difficult because the submitted evidence shows that placing fractions by size on a number line is not yet consistent.' : 'There is not enough information to identify a foundational gap. Try the number-line diagnostic prompt first.',
    remediationSteps,
    remediationDecision: remediationPlan,
    activity: gapIdentified ? structuredClone(activity) : null,
    recheck: recheckState ? {status: isSecureEnough(recheckState) && gapIdentified ? 'improved' : 'needs-more-evidence', topicId: parentConcern.foundationalTopicId, evidenceStatus: recheckState.status, confidence: recheckState.confidence, prompt: 'Place 2/5 and 4/5 on the same number line, then explain which is larger.'} : {status: 'not-submitted', topicId: parentConcern.foundationalTopicId, evidenceStatus: 'unseen', confidence: 0, prompt: 'Place 2/5 and 4/5 on the same number line, then explain which is larger.'},
    parentOutcome: buildParentOutcome(request.parentOutcomeResponses, foundationalGap, remediationSteps),
    privacy: {evidenceMode: request.evidenceMode, scope: request.consent?.scope, persistence: 'none'},
  };
};

export const makeGraphStore = (release) => {
  const topicsById = new Map(release.topics.map((topic) => [topic.id, topic]));
  const prereqAdjacency = Object.create(null);
  const unlockAdjacency = Object.create(null);

  for (const dependency of release.dependencies) {
    if (!prereqAdjacency[dependency.topicId]) {
      prereqAdjacency[dependency.topicId] = [];
    }
    prereqAdjacency[dependency.topicId].push(dependency);

    if (!unlockAdjacency[dependency.prerequisiteId]) {
      unlockAdjacency[dependency.prerequisiteId] = [];
    }
    unlockAdjacency[dependency.prerequisiteId].push({
      topicId: dependency.topicId,
      prerequisiteId: dependency.prerequisiteId,
      strength: dependency.strength,
      reason: dependency.reason ?? null,
    });
  }

  const ensureKnownTopic = (topicId) => {
    if (!topicsById.has(topicId)) {
      throw new Error(`unknown_topic_id: ${topicId}`);
    }
  };

  const getTopic = (topicId) => {
    ensureKnownTopic(topicId);
    return topicsById.get(topicId);
  };

  const getPrerequisites = (topicId, {depth = 1} = {}) => {
    ensureKnownTopic(topicId);
    const rows = traversal(
      topicId,
      (edge) => edge.prerequisiteId,
      prereqAdjacency,
      Math.max(0, Number(depth) || 0),
    );

    return {
      taxonomyVersion: release.taxonomyVersion,
      topicId,
      depth: Math.max(0, Number(depth) || 0),
      prerequisites: rows,
    };
  };

  const getUnlocks = (topicId, {depth = 1} = {}) => {
    ensureKnownTopic(topicId);
    const rows = traversal(
      topicId,
      (edge) => edge.topicId,
      unlockAdjacency,
      Math.max(0, Number(depth) || 0),
    );

    return {
      taxonomyVersion: release.taxonomyVersion,
      topicId,
      depth: Math.max(0, Number(depth) || 0),
      unlocks: rows,
    };
  };

  const getCurriculumTopics = (query = {}) => {
    const mode = query.mode ?? 'strictCurriculumView';
    const filter = {...query, mode};

    const alignedRows = release.alignments.filter((alignment) => {
      const byCurriculum = query.curriculum == null || alignment.curriculum === query.curriculum;
      const byBoard = query.board == null || alignment.board === query.board;
      const byClass = query.class == null || alignment.class === query.class;
      const bySubject = query.subject == null || alignment.subject === query.subject;
      const byStrand = query.strand == null || alignment.strand === query.strand;
      return byCurriculum && byBoard && byClass && bySubject && byStrand;
    }).map((alignment) => ({
      taxonomyVersion: release.taxonomyVersion,
      topicId: alignment.topicId,
      viewRole: 'aligned',
      alignment,
      standardKey: alignment.standardKey,
      strength: 'hard',
      distance: 0,
      topic: getTopic(alignment.topicId),
      source: alignment.source,
    }));

    if (mode !== 'learningGraphView') {
      return {
        taxonomyVersion: release.taxonomyVersion,
        filter,
        topics: alignedRows,
      };
    }

    const prerequisiteDepth = Math.max(0, Number(query.prerequisiteDepth) || 0);
    const prerequisiteRowsByTopic = new Map();

    for (const row of alignedRows) {
      const prereqs = getPrerequisites(row.topicId, {depth: prerequisiteDepth}).prerequisites;
      for (const prereq of prereqs) {
        const key = `${prereq.topicId}:prerequisite`;
        if (prerequisiteRowsByTopic.has(key)) continue;
        prerequisiteRowsByTopic.set(key, {
          ...prereq,
          viewRole: 'prerequisite',
          topic: getTopic(prereq.topicId),
          taxonomyVersion: release.taxonomyVersion,
        });
      }
    }

    const rows = [...alignedRows, ...Array.from(prerequisiteRowsByTopic.values())].filter((row, idx, arr) =>
      arr.findIndex((other) => other.topicId === row.topicId && other.viewRole === row.viewRole) === idx,
    );

    return {
      taxonomyVersion: release.taxonomyVersion,
      filter: {...filter, prerequisiteDepth},
      topics: rows,
    };
  };

  return {
    getTopic,
    getPrerequisites,
    getUnlocks,
    getCurriculumTopics,
    learningGraphView: (query = {}) => getCurriculumTopics({mode: 'learningGraphView', ...query}),
    taxonomyVersion: release.taxonomyVersion,
  };
};

if (process.argv[1] && process.argv[1] === fileURLToPath(import.meta.url)) {
  const release = loadTaxonomyRelease(process.cwd());
  const graph = makeGraphStore(release);
  const goal = {
    curriculum: 'ncert-class6-math-2026-27',
    board: 'CBSE',
    class: 6,
    subject: 'Mathematics',
    strand: 'Number System',
  };
  const args = process.argv.slice(2);
  const isDemo = args.includes('--demo');

  if (isDemo) {
    const masteryByTopic = deriveMasteryState([
      {
        learnerId: 'synthetic-learner',
        topicId: 'mt_nZkL5-XjRX',
        taxonomyVersion: release.taxonomyVersion,
        result: 'secure',
        score: 0.9,
        observedAt: '2026-07-09T10:00:00.000Z',
      },
    ]);

    const response = recommendNextBestTopics(graph, {
      learnerId: 'synthetic-learner',
      goal,
      masteryByTopic,
      contentMappings: [
        {
          contentId: 'content-number-system-review',
          topicId: 'mt_FHIAv6dfhU',
          taxonomyVersion: release.taxonomyVersion,
          role: 'teaches',
          confidence: 'reviewed',
          estimatedMinutes: 14,
        },
      ],
      constraints: {
        includeReview: true,
        maxNewTopics: 3,
      },
    });

    console.log(JSON.stringify({
      taxonomyVersion: response.taxonomyVersion,
      goal,
      recommendations: response.recommendations,
      decisionLog: response.decisionLog,
    }, null, 2));
  } else {
    const view = graph.getCurriculumTopics({
      ...goal,
      mode: 'learningGraphView',
      prerequisiteDepth: 2,
    });
    console.log('learningGraphView summary:', {
      taxonomyVersion: view.taxonomyVersion,
      rowCount: view.topics.length,
      roleCounts: view.topics.reduce((counts, row) => {
        counts[row.viewRole] = (counts[row.viewRole] ?? 0) + 1;
        return counts;
      }, {}),
    });
  }
}
