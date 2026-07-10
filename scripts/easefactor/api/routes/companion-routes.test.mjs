import test from 'node:test';
import assert from 'node:assert/strict';

import {withServer} from '../test-server.test-helper.mjs';
import {makeParentJourneyRequest} from '../../companion/parent-journey-fixture.test-helper.mjs';

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
