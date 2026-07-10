import test from 'node:test';
import assert from 'node:assert/strict';

import {getJson, withServer} from '../test-server.test-helper.mjs';

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
