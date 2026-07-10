export const traverseGraph = (startTopicId, getEdgeTarget, edgesBySource, maxDepth) => {
  const out = [];
  const visited = new Set([startTopicId]);
  let frontier = [startTopicId];
  let depth = 0;
  while (frontier.length && depth < maxDepth) {
    depth += 1;
    const next = [];
    for (const topicId of frontier) {
      for (const edge of edgesBySource[topicId] ?? []) {
        const nextId = getEdgeTarget(edge);
        if (visited.has(nextId)) continue;
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
    frontier = next;
  }
  return out;
};
