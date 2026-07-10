import test from 'node:test';
import assert from 'node:assert/strict';

import {withServer} from '../test-server.test-helper.mjs';

test('POST /planner/v1/next-best-topics derives mastery from JSON events', async () => {
    await withServer(async (baseUrl) => {
        const response = await fetch(`${baseUrl}/planner/v1/next-best-topics`, {
            method: 'POST',
            headers: {'content-type': 'application/json'},
            body: JSON.stringify({
                learnerId: 'synthetic-learner',
                masteryEvents: [
                    {
                        learnerId: 'synthetic-learner',
                        topicId: 'mt_K5jM7vlVhA',
                        result: 'secure',
                        score: 0.96,
                        observedAt: '2026-07-09T10:00:00.000Z',
                    },
                    {
                        learnerId: 'synthetic-learner',
                        topicId: 'mt_nZkL5-XjRX',
                        result: 'secure',
                        score: 0.94,
                        observedAt: '2026-07-09T10:05:00.000Z',
                    },
                ],
                contentMappings: [
                    {
                        contentId: 'content-number-system-factor-pairs',
                        topicId: 'mt_FHIAv6dfhU',
                        taxonomyVersion: 'v1',
                        role: 'teaches',
                        confidence: 'reviewed',
                        estimatedMinutes: 14,
                    },
                ],
                goal: {
                    curriculum: 'ncert-class6-math-2026-27',
                    board: 'CBSE',
                    class: 6,
                    subject: 'Mathematics',
                    strand: 'Number System',
                },
                constraints: {
                    includeReview: false,
                    maxNewTopics: 1,
                },
            }),
        });
        const body = await response.json();

        assert.equal(response.status, 200);
        assert.equal(body.taxonomyVersion, 'v1');
        assert.equal(body.learnerId, 'synthetic-learner');
        assert.equal(body.recommendations.length, 1);
        assert.equal(body.recommendations[0].rank, 1);
        assert.equal(body.decisionLog.scoringVersion, 'easefactor-reference-v1');
    });
});

test('POST /planner/v1/remediation-plan orders weak hard prerequisites with explanations and content availability', async () => {
    await withServer(async (baseUrl) => {
        const response = await fetch(`${baseUrl}/planner/v1/remediation-plan`, {
            method: 'POST',
            headers: {'content-type': 'application/json'},
            body: JSON.stringify({
                learnerId: 'synthetic-learner',
                targetTopicId: 'mt_FHIAv6dfhU',
                masteryEvents: [
                    {
                        learnerId: 'synthetic-learner',
                        topicId: 'mt_K5jM7vlVhA',
                        result: 'partial',
                        score: 0.5,
                        observedAt: '2026-07-09T10:00:00.000Z',
                    },
                ],
                contentMappings: [
                    {
                        contentId: 'content-factor-pairs-practice',
                        topicId: 'mt_nZkL5-XjRX',
                        taxonomyVersion: 'v1',
                        role: 'practices',
                        confidence: 'reviewed',
                        estimatedMinutes: 12,
                    },
                ],
            }),
        });
        const body = await response.json();

        assert.equal(response.status, 200);
        assert.equal(body.taxonomyVersion, 'v1');
        assert.equal(body.learnerId, 'synthetic-learner');
        assert.equal(body.targetTopicId, 'mt_FHIAv6dfhU');
        assert.equal(body.readyToLearnTarget, false);
        assert.deepEqual(body.steps.map((step) => step.rank), [1, 2]);
        assert.deepEqual(body.steps.map((step) => step.topicId), ['mt_nZkL5-XjRX', 'mt_K5jM7vlVhA']);
        assert.equal(body.steps[0].status, 'unseen');
        assert.equal(body.steps[0].servableNow, true);
        assert.equal(body.steps[0].content[0].contentId, 'content-factor-pairs-practice');
        assert.match(body.steps[0].explanation, /missing prerequisite evidence/i);
        assert.equal(body.steps[1].status, 'developing');
        assert.equal(body.steps[1].servableNow, false);
        assert.match(body.steps[1].explanation, /weak prerequisite evidence/i);
        assert.match(body.explanation, /repair 2 hard prerequisite/i);
    });
});

test('POST /planner/v1/remediation-plan returns 404 for unknown target topics', async () => {
    await withServer(async (baseUrl) => {
        const response = await fetch(`${baseUrl}/planner/v1/remediation-plan`, {
            method: 'POST',
            headers: {'content-type': 'application/json'},
            body: JSON.stringify({
                targetTopicId: 'mt_missing',
                masteryEvents: [],
            }),
        });
        const body = await response.json();

        assert.equal(response.status, 404);
        assert.equal(body.error.code, 'unknown_topic_id');
        assert.equal(body.error.details.topicId, 'mt_missing');
    });
});

test('POST /planner/v1/diagnostic-plan orders weak hard prerequisites with assessability and explanations', async () => {
    await withServer(async (baseUrl) => {
        const response = await fetch(`${baseUrl}/planner/v1/diagnostic-plan`, {
            method: 'POST',
            headers: {'content-type': 'application/json'},
            body: JSON.stringify({
                learnerId: 'synthetic-learner',
                targetTopicId: 'mt_FHIAv6dfhU',
                masteryEvents: [
                    {
                        learnerId: 'synthetic-learner',
                        topicId: 'mt_K5jM7vlVhA',
                        result: 'partial',
                        score: 0.5,
                        observedAt: '2026-07-09T10:00:00.000Z',
                    },
                ],
                contentMappings: [
                    {
                        contentId: 'assessment-factor-pairs-check',
                        topicId: 'mt_nZkL5-XjRX',
                        taxonomyVersion: 'v1',
                        role: 'assesses',
                        confidence: 'reviewed',
                        estimatedMinutes: 8,
                    },
                    {
                        contentId: 'practice-factor-pairs',
                        topicId: 'mt_K5jM7vlVhA',
                        taxonomyVersion: 'v1',
                        role: 'practices',
                        confidence: 'reviewed',
                        estimatedMinutes: 12,
                    },
                ],
            }),
        });
        const body = await response.json();

        assert.equal(response.status, 200);
        assert.equal(body.taxonomyVersion, 'v1');
        assert.equal(body.learnerId, 'synthetic-learner');
        assert.equal(body.targetTopicId, 'mt_FHIAv6dfhU');
        assert.equal(body.readyToLearnTarget, false);
        assert.deepEqual(body.steps.map((step) => step.rank), [1, 2]);
        assert.deepEqual(body.steps.map((step) => step.topicId), ['mt_nZkL5-XjRX', 'mt_K5jM7vlVhA']);
        assert.equal(body.steps[0].status, 'unseen');
        assert.equal(body.steps[0].assessableNow, true);
        assert.equal(body.steps[0].content[0].contentId, 'assessment-factor-pairs-check');
        assert.match(body.steps[0].readiness.explanation, /missing prerequisite evidence/i);
        assert.match(body.steps[0].gap.explanation, /blocks readiness/i);
        assert.equal(body.steps[1].status, 'developing');
        assert.equal(body.steps[1].assessableNow, false);
        assert.deepEqual(body.steps[1].content, []);
        assert.match(body.steps[1].readiness.explanation, /weak prerequisite evidence/i);
        assert.match(body.explanation, /Collect diagnostic evidence for 2 hard prerequisite/i);
    });
});

test('POST /planner/v1/diagnostic-plan skips secure hard prerequisites', async () => {
    await withServer(async (baseUrl) => {
        const response = await fetch(`${baseUrl}/planner/v1/diagnostic-plan`, {
            method: 'POST',
            headers: {'content-type': 'application/json'},
            body: JSON.stringify({
                targetTopicId: 'mt_FHIAv6dfhU',
                masteryEvents: [
                    {
                        topicId: 'mt_K5jM7vlVhA',
                        result: 'secure',
                        score: 0.95,
                        observedAt: '2026-07-09T10:00:00.000Z',
                    },
                    {
                        topicId: 'mt_nZkL5-XjRX',
                        result: 'partial',
                        score: 0.8,
                        observedAt: '2026-07-09T10:05:00.000Z',
                    },
                ],
            }),
        });
        const body = await response.json();

        assert.equal(response.status, 200);
        assert.equal(body.readyToLearnTarget, true);
        assert.deepEqual(body.steps, []);
        assert.match(body.explanation, /No diagnostic evidence is needed/i);
    });
});

test('POST /planner/v1/diagnostic-plan returns 404 for unknown target topics', async () => {
    await withServer(async (baseUrl) => {
        const response = await fetch(`${baseUrl}/planner/v1/diagnostic-plan`, {
            method: 'POST',
            headers: {'content-type': 'application/json'},
            body: JSON.stringify({
                targetTopicId: 'mt_missing',
                masteryEvents: [],
            }),
        });
        const body = await response.json();

        assert.equal(response.status, 404);
        assert.equal(body.error.code, 'unknown_topic_id');
        assert.equal(body.error.details.topicId, 'mt_missing');
    });
});

test('POST /planner/v1/diagnostic-plan rejects malformed JSON', async () => {
    await withServer(async (baseUrl) => {
        const response = await fetch(`${baseUrl}/planner/v1/diagnostic-plan`, {
            method: 'POST',
            headers: {'content-type': 'application/json'},
            body: '{"targetTopicId":',
        });
        const body = await response.json();

        assert.equal(response.status, 400);
        assert.equal(body.error.code, 'invalid_json');
    });
});

test('POST /planner/v1/remediation-plan rejects malformed JSON', async () => {
    await withServer(async (baseUrl) => {
        const response = await fetch(`${baseUrl}/planner/v1/remediation-plan`, {
            method: 'POST',
            headers: {'content-type': 'application/json'},
            body: '{"targetTopicId":',
        });
        const body = await response.json();

        assert.equal(response.status, 400);
        assert.equal(body.error.code, 'invalid_json');
    });
});

test('POST /planner/v1/next-best-topics rejects malformed JSON', async () => {
    await withServer(async (baseUrl) => {
        const response = await fetch(`${baseUrl}/planner/v1/next-best-topics`, {
            method: 'POST',
            headers: {'content-type': 'application/json'},
            body: '{"goal":',
        });
        const body = await response.json();

        assert.equal(response.status, 400);
        assert.equal(body.error.code, 'invalid_json');
    });
});
