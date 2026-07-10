import test from 'node:test';
import assert from 'node:assert/strict';

import {withServer} from '../test-server.test-helper.mjs';

test('POST /learners/v1/readiness/:topicId returns ready and blocked status from synthetic mastery events', async () => {
    await withServer(async (baseUrl) => {
        const readyResponse = await fetch(`${baseUrl}/learners/v1/readiness/mt_FHIAv6dfhU`, {
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
            }),
        });
        const readyBody = await readyResponse.json();

        const blockedResponse = await fetch(`${baseUrl}/learners/v1/readiness/mt_FHIAv6dfhU`, {
            method: 'POST',
            headers: {'content-type': 'application/json'},
            body: JSON.stringify({
                learnerId: 'synthetic-learner',
                masteryEvents: [
                    {
                        learnerId: 'synthetic-learner',
                        topicId: 'mt_K5jM7vlVhA',
                        result: 'partial',
                        score: 0.5,
                        observedAt: '2026-07-09T10:00:00.000Z',
                    },
                ],
            }),
        });
        const blockedBody = await blockedResponse.json();

        assert.equal(readyResponse.status, 200);
        assert.equal(readyBody.taxonomyVersion, 'v1');
        assert.equal(readyBody.learnerId, 'synthetic-learner');
        assert.equal(readyBody.topicId, 'mt_FHIAv6dfhU');
        assert.equal(readyBody.readyToLearn, true);
        assert.deepEqual(readyBody.blockedBy, []);

        assert.equal(blockedResponse.status, 200);
        assert.equal(blockedBody.learnerId, 'synthetic-learner');
        assert.equal(blockedBody.readyToLearn, false);
        assert.ok(blockedBody.blockedBy.some((row) => row.topicId === 'mt_K5jM7vlVhA' && row.status === 'developing'));
        assert.ok(blockedBody.blockedBy.some((row) => row.topicId === 'mt_nZkL5-XjRX' && row.status === 'unseen'));
    });
});

test('POST /learners/v1/learning-gaps/:topicId ranks missing and weak prerequisites', async () => {
    await withServer(async (baseUrl) => {
        const response = await fetch(`${baseUrl}/learners/v1/learning-gaps/mt_FHIAv6dfhU`, {
            method: 'POST',
            headers: {'content-type': 'application/json'},
            body: JSON.stringify({
                learnerId: 'synthetic-learner',
                masteryEvents: [
                    {
                        learnerId: 'synthetic-learner',
                        topicId: 'mt_K5jM7vlVhA',
                        result: 'partial',
                        score: 0.5,
                        observedAt: '2026-07-09T10:00:00.000Z',
                    },
                ],
            }),
        });
        const body = await response.json();

        assert.equal(response.status, 200);
        assert.equal(body.taxonomyVersion, 'v1');
        assert.equal(body.learnerId, 'synthetic-learner');
        assert.equal(body.topicId, 'mt_FHIAv6dfhU');
        assert.deepEqual(body.gaps.map((row) => row.rank), [1, 2]);
        assert.deepEqual(body.gaps.map((row) => row.topicId), ['mt_nZkL5-XjRX', 'mt_K5jM7vlVhA']);
        assert.equal(body.gaps[0].status, 'unseen');
        assert.equal(body.gaps[1].status, 'developing');
    });
});

test('POST /learners/v1/mastery-summary returns latest status per topic with evidence trails', async () => {
    await withServer(async (baseUrl) => {
        const response = await fetch(`${baseUrl}/learners/v1/mastery-summary`, {
            method: 'POST',
            headers: {'content-type': 'application/json'},
            body: JSON.stringify({
                learnerId: 'synthetic-learner',
                masteryEvents: [
                    {
                        learnerId: 'synthetic-learner',
                        topicId: 'mt_FHIAv6dfhU',
                        taxonomyVersion: 'v1',
                        result: 'partial',
                        score: 0.52,
                        observedAt: '2026-07-09T10:00:00.000Z',
                    },
                    {
                        learnerId: 'synthetic-learner',
                        topicId: 'mt_y1XCVsIelg',
                        taxonomyVersion: 'v1',
                        result: 'secure',
                        score: 0.9,
                        observedAt: '2026-07-09T10:05:00.000Z',
                    },
                    {
                        learnerId: 'synthetic-learner',
                        topicId: 'mt_FHIAv6dfhU',
                        taxonomyVersion: 'v1',
                        result: 'secure',
                        score: 0.91,
                        observedAt: '2026-07-09T10:10:00.000Z',
                    },
                ],
            }),
        });
        const body = await response.json();

        assert.equal(response.status, 200);
        assert.equal(body.taxonomyVersion, 'v1');
        assert.equal(body.learnerId, 'synthetic-learner');
        assert.deepEqual(body.filter.topicIds, []);
        assert.equal(body.count, 2);
        assert.deepEqual(body.topics.map((row) => row.topicId), ['mt_FHIAv6dfhU', 'mt_y1XCVsIelg']);
        assert.equal(body.topics[0].status, 'secure');
        assert.equal(body.topics[0].confidence, 0.91);
        assert.equal(body.topics[0].lastEvidenceAt, '2026-07-09T10:10:00.000Z');
        assert.equal(body.topics[0].evidenceTrail.length, 2);
        assert.deepEqual(body.topics[0].evidenceTrail.map((row) => row.status), ['developing', 'secure']);
        assert.equal(body.topics[1].status, 'secure');
        assert.equal(body.explanation, 'Mastery summary is derived from submitted synthetic evidence only.');
    });
});

test('POST /learners/v1/mastery-summary filters and sorts requested topicIds', async () => {
    await withServer(async (baseUrl) => {
        const response = await fetch(`${baseUrl}/learners/v1/mastery-summary`, {
            method: 'POST',
            headers: {'content-type': 'application/json'},
            body: JSON.stringify({
                learnerId: 'synthetic-learner',
                topicIds: ['mt_y1XCVsIelg', 'mt_FHIAv6dfhU'],
                masteryEvents: [
                    {
                        topicId: 'mt_FHIAv6dfhU',
                        result: 'partial',
                        score: 0.52,
                        observedAt: '2026-07-09T10:00:00.000Z',
                    },
                    {
                        topicId: 'mt_nZkL5-XjRX',
                        result: 'secure',
                        score: 0.95,
                        observedAt: '2026-07-09T10:05:00.000Z',
                    },
                    {
                        topicId: 'mt_y1XCVsIelg',
                        result: 'review',
                        observedAt: '2026-07-09T10:10:00.000Z',
                    },
                ],
            }),
        });
        const body = await response.json();

        assert.equal(response.status, 200);
        assert.deepEqual(body.filter.topicIds, ['mt_FHIAv6dfhU', 'mt_y1XCVsIelg']);
        assert.equal(body.count, 2);
        assert.deepEqual(body.topics.map((row) => row.topicId), ['mt_FHIAv6dfhU', 'mt_y1XCVsIelg']);
        assert.deepEqual(body.topics.map((row) => row.status), ['developing', 'needs_review']);
        assert.ok(!body.topics.some((row) => row.topicId === 'mt_nZkL5-XjRX'));
    });
});

test('POST /learners/v1/mastery-summary returns 404 for unknown requested topicIds', async () => {
    await withServer(async (baseUrl) => {
        const response = await fetch(`${baseUrl}/learners/v1/mastery-summary`, {
            method: 'POST',
            headers: {'content-type': 'application/json'},
            body: JSON.stringify({
                topicIds: ['mt_missing'],
                masteryEvents: [],
            }),
        });
        const body = await response.json();

        assert.equal(response.status, 404);
        assert.equal(body.error.code, 'unknown_topic_id');
        assert.equal(body.error.details.topicId, 'mt_missing');
    });
});

test('POST /learners/v1/mastery-summary rejects malformed JSON', async () => {
    await withServer(async (baseUrl) => {
        const response = await fetch(`${baseUrl}/learners/v1/mastery-summary`, {
            method: 'POST',
            headers: {'content-type': 'application/json'},
            body: '{"masteryEvents":',
        });
        const body = await response.json();

        assert.equal(response.status, 400);
        assert.equal(body.error.code, 'invalid_json');
    });
});

test('POST learner readiness and gap endpoints return 404 for unknown topics', async () => {
    await withServer(async (baseUrl) => {
        const readiness = await fetch(`${baseUrl}/learners/v1/readiness/mt_missing`, {
            method: 'POST',
            headers: {'content-type': 'application/json'},
            body: JSON.stringify({masteryEvents: []}),
        });
        const gaps = await fetch(`${baseUrl}/learners/v1/learning-gaps/mt_missing`, {
            method: 'POST',
            headers: {'content-type': 'application/json'},
            body: JSON.stringify({masteryEvents: []}),
        });
        const readinessBody = await readiness.json();
        const gapsBody = await gaps.json();

        assert.equal(readiness.status, 404);
        assert.equal(readinessBody.error.code, 'unknown_topic_id');
        assert.equal(readinessBody.error.details.topicId, 'mt_missing');
        assert.equal(gaps.status, 404);
        assert.equal(gapsBody.error.code, 'unknown_topic_id');
        assert.equal(gapsBody.error.details.topicId, 'mt_missing');
    });
});

test('POST learner readiness and gap endpoints reject malformed JSON', async () => {
    await withServer(async (baseUrl) => {
        const readiness = await fetch(`${baseUrl}/learners/v1/readiness/mt_FHIAv6dfhU`, {
            method: 'POST',
            headers: {'content-type': 'application/json'},
            body: '{"masteryEvents":',
        });
        const gaps = await fetch(`${baseUrl}/learners/v1/learning-gaps/mt_FHIAv6dfhU`, {
            method: 'POST',
            headers: {'content-type': 'application/json'},
            body: '{"masteryEvents":',
        });
        const readinessBody = await readiness.json();
        const gapsBody = await gaps.json();

        assert.equal(readiness.status, 400);
        assert.equal(readinessBody.error.code, 'invalid_json');
        assert.equal(gaps.status, 400);
        assert.equal(gapsBody.error.code, 'invalid_json');
    });
});
