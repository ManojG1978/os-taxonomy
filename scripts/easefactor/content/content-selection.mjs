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

const isAssessableDiagnosticContent = (mapping) => (
  mapping.role === 'assesses' &&
  (mapping.confidence === 'reviewed' || mapping.confidence === 'verified')
);

export {
  buildContentIndex,
  buildContentSummary,
  estimateMinutes,
  isAssessableDiagnosticContent,
  isReviewedTeachingContent,
  isServableRemediationContent,
  safeNumber,
};
