import test from 'node:test';
import assert from 'node:assert/strict';

import {createEaseFactorApiServer} from './easefactor-api.mjs';
import {makeParentJourneyRequest} from './easefactor-parent-journey-fixture.test-helper.mjs';

const withServer = async (run) => {
    const server = createEaseFactorApiServer();
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
    const {port} = server.address();
    const baseUrl = `http://127.0.0.1:${port}`;

    try {
        await run(baseUrl);
    } finally {
        await new Promise((resolve, reject) => {
            server.close((error) => error ? reject(error) : resolve());
        });
    }
};

const getJson = async (baseUrl, path) => {
    const response = await fetch(`${baseUrl}${path}`);
    return {
        status: response.status,
        body: await response.json(),
    };
};

test('POST /companion/v1/parent-journey returns the deterministic parent journey', async () => {
    await withServer(async (baseUrl) => {
        const request = makeParentJourneyRequest();
        const firstResponse = await fetch(`${baseUrl}/companion/v1/parent-journey`, {method: 'POST', headers: {'content-type': 'application/json'}, body: JSON.stringify(request)});
        const secondResponse = await fetch(`${baseUrl}/companion/v1/parent-journey`, {method: 'POST', headers: {'content-type': 'application/json'}, body: JSON.stringify(request)});
        const first = await firstResponse.json();
        const second = await secondResponse.json();
        assert.equal(firstResponse.status, 200);
        assert.deepEqual(first, second);
        assert.equal(first.foundationalGap.topicId, 'mt_Kr3IyA6m-O');
        assert.equal(first.activity.review.status, 'reviewed');
        assert.equal(first.recheck.status, 'improved');
        assert.equal(first.parentOutcome.status, 'passed');
        assert.equal(first.privacy.persistence, 'none');
    });
});

test('POST parent journey rejects unsupported, non-consented, non-synthetic, and private requests', async () => {
    await withServer(async (baseUrl) => {
        const cases = [
            {patch: {context: {...makeParentJourneyRequest().context, language: 'hi-IN'}}, code: 'unsupported_parent_journey_context'},
            {patch: {consent: {...makeParentJourneyRequest().consent, scope: 'persistent'}}, code: 'invalid_consent_boundary'},
            {patch: {evidenceMode: 'production'}, code: 'synthetic_evidence_required'},
            {patch: {learnerId: 'child-123'}, code: 'private_data_not_allowed'},
            {patch: {storage: true}, code: 'private_data_not_allowed'},
        ];
        for (const {patch, code} of cases) {
            const response = await fetch(`${baseUrl}/companion/v1/parent-journey`, {method: 'POST', headers: {'content-type': 'application/json'}, body: JSON.stringify(makeParentJourneyRequest(patch))});
            const body = await response.json();
            assert.equal(response.status, 400, code);
            assert.equal(body.error.code, code);
        }
    });
});

test('POST parent journey preserves exact context and consent boundary error codes', async () => {
    await withServer(async (baseUrl) => {
        const cases = [
            {patch: {context: undefined}, code: 'unsupported_parent_journey_context'},
            {patch: {context: null}, code: 'unsupported_parent_journey_context'},
            {patch: {context: 'CBSE'}, code: 'unsupported_parent_journey_context'},
            {patch: {consent: undefined}, code: 'invalid_consent_boundary'},
            {patch: {consent: null}, code: 'invalid_consent_boundary'},
            {patch: {consent: 'request-only'}, code: 'invalid_consent_boundary'},
        ];
        for (const {patch, code} of cases) {
            const response = await fetch(`${baseUrl}/companion/v1/parent-journey`, {method: 'POST', headers: {'content-type': 'application/json'}, body: JSON.stringify(makeParentJourneyRequest(patch))});
            assert.equal(response.status, 400, code);
            assert.equal((await response.json()).error.code, code);
        }
    });
});

test('POST parent journey rejects malformed evidence with the normalized journey error', async () => {
    await withServer(async (baseUrl) => {
        const baseEvent = makeParentJourneyRequest().diagnosticEvents[0];
        const events = [
            {...baseEvent, result: undefined},
            {...baseEvent, result: 'nonsense'},
            {...baseEvent, score: undefined},
            {...baseEvent, score: 2},
            {...baseEvent, observedAt: undefined},
            {...baseEvent, observedAt: 'invalid'},
            {...baseEvent, observedAt: '2026-07-10T09:00:00.000'},
            {...baseEvent, observedAt: '2026-02-30T09:00:00.000Z'},
            {...baseEvent, taxonomyVersion: 'v2'},
            {...baseEvent, topicId: 'mt_missing'},
        ];
        for (const event of events) {
            const response = await fetch(`${baseUrl}/companion/v1/parent-journey`, {method: 'POST', headers: {'content-type': 'application/json'}, body: JSON.stringify(makeParentJourneyRequest({diagnosticEvents: [event]}))});
            assert.equal(response.status, 400);
            assert.equal((await response.json()).error.code, 'invalid_parent_journey_evidence');
        }
    });
});

test('POST parent journey returns malformed JSON and body-size errors', async () => {
    await withServer(async (baseUrl) => {
        const malformed = await fetch(`${baseUrl}/companion/v1/parent-journey`, {method: 'POST', headers: {'content-type': 'application/json'}, body: '{"context":'});
        assert.equal(malformed.status, 400);
        assert.equal((await malformed.json()).error.code, 'invalid_json');

        const oversized = await fetch(`${baseUrl}/companion/v1/parent-journey`, {method: 'POST', headers: {'content-type': 'application/json'}, body: JSON.stringify({padding: 'x'.repeat((1024 * 1024) + 1)})});
        assert.equal(oversized.status, 413);
        assert.equal((await oversized.json()).error.code, 'request_body_too_large');
    });
});

test('GET /taxonomy/v1/releases/current returns the current release envelope', async () => {
    await withServer(async (baseUrl) => {
        const {status, body} = await getJson(baseUrl, '/taxonomy/v1/releases/current');

        assert.equal(status, 200);
        assert.equal(body.taxonomyVersion, 'v1');
        assert.equal(body.release.taxonomyVersion, 'v1');
        assert.equal(body.release.counts.topics, 1590);
        assert.equal(body.release.sourceFileHashes['topics.json'].length, 64);
        assert.ok(body.release.codesOnlySources.includes('ncert-class6-math-2026-27'));
    });
});

test('GET /taxonomy/v1/topics lists and filters topics without planner state', async () => {
    await withServer(async (baseUrl) => {
        const {
            status,
            body
        } = await getJson(baseUrl, '/taxonomy/v1/topics?subject=Mathematics&domain=Number%20Representation%20%26%20Place%20Value&limit=5');

        assert.equal(status, 200);
        assert.equal(body.taxonomyVersion, 'v1');
        assert.equal(body.count, 5);
        assert.ok(body.totalMatching >= 5);
        assert.ok(body.topics.every((topic) => topic.subject === 'Mathematics'));
        assert.ok(body.topics.every((topic) => topic.domain === 'Number Representation & Place Value'));
    });
});

test('GET /taxonomy/v1/topics/:topicId returns 404 for unknown topics', async () => {
    await withServer(async (baseUrl) => {
        const known = await getJson(baseUrl, '/taxonomy/v1/topics/mt_FHIAv6dfhU');
        const missing = await getJson(baseUrl, '/taxonomy/v1/topics/mt_missing');

        assert.equal(known.status, 200);
        assert.equal(known.body.topic.id, 'mt_FHIAv6dfhU');
        assert.equal(missing.status, 404);
        assert.equal(missing.body.error.code, 'unknown_topic_id');
    });
});

test('GET prerequisite and unlock endpoints delegate graph traversal with depth', async () => {
    await withServer(async (baseUrl) => {
        const prereqs = await getJson(baseUrl, '/taxonomy/v1/topics/mt_FHIAv6dfhU/prerequisites?depth=2');
        const unlocks = await getJson(baseUrl, '/taxonomy/v1/topics/mt_nZkL5-XjRX/unlocks?depth=1');

        assert.equal(prereqs.status, 200);
        assert.equal(prereqs.body.topicId, 'mt_FHIAv6dfhU');
        assert.equal(prereqs.body.depth, 2);
        assert.ok(prereqs.body.prerequisites.length >= 2);
        assert.ok(prereqs.body.prerequisites.every((row) => row.distance <= 2));

        assert.equal(unlocks.status, 200);
        assert.equal(unlocks.body.topicId, 'mt_nZkL5-XjRX');
        assert.equal(unlocks.body.depth, 1);
        assert.ok(Array.isArray(unlocks.body.unlocks));
    });
});

test('GET /taxonomy/v1/curriculum-topics returns code-only alignment metadata', async () => {
    await withServer(async (baseUrl) => {
        const path = '/taxonomy/v1/curriculum-topics?curriculum=ncert-class6-math-2026-27&board=CBSE&class=6&subject=Mathematics&strand=Number%20System';
        const {status, body} = await getJson(baseUrl, path);

        assert.equal(status, 200);
        assert.equal(body.taxonomyVersion, 'v1');
        assert.equal(body.filter.curriculum, 'ncert-class6-math-2026-27');
        assert.ok(body.topics.length > 0);
        assert.ok(body.topics.every((row) => row.alignment.standardKey.startsWith('ncert-class6-math-2026-27:')));
        assert.ok(body.topics.every((row) => !Object.hasOwn(row.alignment, 'text')));
        assert.ok(body.topics.every((row) => !Object.hasOwn(row.alignment, 'data')));
    });
});

test('GET /taxonomy/v1/curricula lists curriculum metadata without expanding standards', async () => {
    await withServer(async (baseUrl) => {
        const {status, body} = await getJson(baseUrl, '/taxonomy/v1/curricula?country=IN&codesOnly=true');

        assert.equal(status, 200);
        assert.equal(body.taxonomyVersion, 'v1');
        assert.equal(body.filter.country, 'IN');
        assert.equal(body.filter.codesOnly, true);
        assert.equal(body.curricula.length, 1);
        assert.equal(body.curricula[0].slug, 'ncert-class6-math-2026-27');
        assert.equal(body.curricula[0].textIncluded, false);
        assert.equal(body.curricula[0].codesOnly, true);
        assert.equal(body.curricula[0].topicCount, 50);
        assert.equal(Object.hasOwn(body.curricula[0], 'topics'), false);
    });
});

test('GET /taxonomy/v1/standards lists and filters standards with pagination', async () => {
    await withServer(async (baseUrl) => {
        const {
            status,
            body
        } = await getJson(baseUrl, '/taxonomy/v1/standards?curriculum=ncert-class6-math-2026-27&subject=Mathematics&limit=3');

        assert.equal(status, 200);
        assert.equal(body.taxonomyVersion, 'v1');
        assert.equal(body.filter.curriculum, 'ncert-class6-math-2026-27');
        assert.equal(body.count, 3);
        assert.ok(body.totalMatching >= 3);
        assert.ok(body.standards.every((row) => row.curriculum === 'ncert-class6-math-2026-27'));
        assert.ok(body.standards.every((row) => row.key.startsWith('ncert-class6-math-2026-27:')));
        assert.ok(body.standards.every((row) => !Object.hasOwn(row, 'data')));
    });
});

test('GET /taxonomy/v1/curriculum-alignments lists filtered alignment rows', async () => {
    await withServer(async (baseUrl) => {
        const {
            status,
            body
        } = await getJson(baseUrl, '/taxonomy/v1/curriculum-alignments?curriculum=ncert-class6-math-2026-27&matchType=direct&limit=4');

        assert.equal(status, 200);
        assert.equal(body.taxonomyVersion, 'v1');
        assert.equal(body.filter.matchType, 'direct');
        assert.equal(body.count, 4);
        assert.ok(body.totalMatching >= 4);
        assert.ok(body.alignments.every((row) => row.curriculum === 'ncert-class6-math-2026-27'));
        assert.ok(body.alignments.every((row) => row.matchType === 'direct'));
        assert.ok(body.alignments.every((row) => !Object.hasOwn(row, 'text')));
        assert.ok(body.alignments.every((row) => !Object.hasOwn(row, 'data')));
    });
});

test('GET /taxonomy/v1/clusters lists filtered cluster summaries', async () => {
    await withServer(async (baseUrl) => {
        const {status, body} = await getJson(baseUrl, '/taxonomy/v1/clusters?subject=Mathematics&age=6&limit=2');

        assert.equal(status, 200);
        assert.equal(body.taxonomyVersion, 'v1');
        assert.equal(body.filter.subject, 'Mathematics');
        assert.equal(body.filter.age, 6);
        assert.equal(body.count, 2);
        assert.ok(body.totalMatching >= 2);
        assert.ok(body.clusters.every((row) => row.subject === 'Mathematics'));
        assert.ok(body.clusters.every((row) => row.ageRangeStart === 6));
    });
});

test('GET /taxonomy/v1/coverage summarizes curriculum alignment observability', async () => {
    await withServer(async (baseUrl) => {
        const {status, body} = await getJson(baseUrl, '/taxonomy/v1/coverage?curriculum=ncert-class6-math-2026-27');

        assert.equal(status, 200);
        assert.equal(body.taxonomyVersion, 'v1');
        assert.equal(body.filter.curriculum, 'ncert-class6-math-2026-27');
        assert.equal(body.coverage.length, 1);
        assert.equal(body.coverage[0].curriculum, 'ncert-class6-math-2026-27');
        assert.equal(body.coverage[0].codesOnly, true);
        assert.equal(body.coverage[0].standardCount, 50);
        assert.equal(body.coverage[0].alignmentCount, 94);
        assert.ok(body.coverage[0].alignedTopicCount > 0);
        assert.ok(body.coverage[0].subjects.includes('Mathematics'));
    });
});

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
