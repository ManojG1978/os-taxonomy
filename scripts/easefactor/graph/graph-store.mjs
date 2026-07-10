import {traverseGraph} from './traversal.mjs';

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
    const rows = traverseGraph(
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
    const rows = traverseGraph(
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
