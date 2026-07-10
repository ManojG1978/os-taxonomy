const allowedContentRoles = new Set(['teaches', 'practices', 'assesses', 'reviews', 'extends']);
const allowedContentConfidence = new Set(['machine', 'reviewed', 'verified']);

const validateContentMappings = (graph, mappings) => {
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

export {validateContentMappings};
