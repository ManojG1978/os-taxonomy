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

const deriveMasteryState = (events = []) => {
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

export {deriveMasteryState, isSecureEnough};
