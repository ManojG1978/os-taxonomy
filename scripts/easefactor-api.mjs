import {createServer} from 'node:http';
import {fileURLToPath} from 'node:url';

import {
    buildDiagnosticPlan,
    buildParentCompanionJourney,
    buildRemediationPlan,
    checkReadiness,
    deriveMasteryState,
    findLearningGaps,
    loadTaxonomyRelease,
    makeGraphStore,
    recommendNextBestTopics,
} from './easefactor-reference.mjs';

const jsonHeaders = {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
};

const sendJson = (res, statusCode, body) => {
    res.writeHead(statusCode, jsonHeaders);
    res.end(JSON.stringify(body, null, 2));
};

const errorBody = (code, message, details = undefined) => ({
    error: {
        code,
        message,
        ...(details === undefined ? {} : {details}),
    },
});

const sendError = (res, statusCode, code, message, details = undefined) => {
    sendJson(res, statusCode, errorBody(code, message, details));
};

const parsePositiveInt = (value, fallback, {max = 1000} = {}) => {
    const parsed = Number.parseInt(value, 10);
    if (!Number.isFinite(parsed) || parsed < 0) {
        return fallback;
    }
    return Math.min(parsed, max);
};

const parseQuery = (searchParams) => {
    const query = {};
    for (const [key, value] of searchParams.entries()) {
        if (key === 'class' || key === 'age' || key === 'depth' || key === 'prerequisiteDepth' || key === 'limit' || key === 'offset') {
            query[key] = Number.parseInt(value, 10);
        } else if (key === 'codesOnly') {
            query[key] = value === 'true' ? true : value === 'false' ? false : value;
        } else {
            query[key] = value;
        }
    }
    return query;
};

const readJsonBody = async (req, {maxBytes = 1024 * 1024} = {}) => {
    const chunks = [];
    let totalBytes = 0;

    for await (const chunk of req) {
        totalBytes += chunk.length;
        if (totalBytes > maxBytes) {
            const error = new Error('request_body_too_large');
            error.code = 'request_body_too_large';
            throw error;
        }
        chunks.push(chunk);
    }

    const raw = Buffer.concat(chunks).toString('utf8');
    if (!raw.trim()) {
        return {};
    }

    try {
        return JSON.parse(raw);
    } catch (error) {
        error.code = 'invalid_json';
        throw error;
    }
};

const releaseEnvelope = (release) => ({
    taxonomyVersion: release.taxonomyVersion,
    release: {
        taxonomyVersion: release.taxonomyVersion,
        counts: release.manifest.counts,
        subjects: release.manifest.subjects,
        files: release.manifest.files,
        codesOnlySources: release.codesOnlySources,
        sourceFileHashes: release.sourceFileHashes,
    },
});

const filterTopics = (topics, query) => {
    const age = Number.isFinite(query.age) ? query.age : null;
    return topics.filter((topic) => {
        const subjectMatches = query.subject == null || topic.subject === query.subject;
        const domainMatches = query.domain == null || topic.domain === query.domain;
        const typeMatches = query.type == null || topic.type === query.type;
        const standardMatches = query.standard == null || (topic.standards ?? []).includes(query.standard);
        const ageMatches = age == null || (
            Number.isFinite(topic.ageRangeStart) &&
            Number.isFinite(topic.ageRangeEnd) &&
            topic.ageRangeStart <= age &&
            topic.ageRangeEnd >= age
        );
        return subjectMatches && domainMatches && typeMatches && standardMatches && ageMatches;
    });
};

const paginate = (rows, query, {defaultLimit = 100, maxLimit = 500} = {}) => {
    const offset = parsePositiveInt(query.offset, 0);
    const limit = parsePositiveInt(query.limit, defaultLimit, {max: maxLimit});
    return {
        offset,
        limit,
        rows: rows.slice(offset, offset + limit),
    };
};

const setValues = (rows, pick) => [...new Set(rows.map(pick).filter((value) => value != null))].sort((a, b) =>
    String(a).localeCompare(String(b)),
);

const curriculumSummary = (curriculum, release) => ({
    slug: curriculum.slug,
    country: curriculum.country,
    name: curriculum.name,
    version: curriculum.version,
    sourceUrl: curriculum.sourceUrl,
    textIncluded: curriculum.textIncluded,
    codesOnly: release.codesOnlySources.includes(curriculum.slug),
    license: curriculum.license,
    topicCount: curriculum.topicCount ?? (curriculum.topics ?? []).length,
});

const filterCurricula = (release, query) => release.curricula
    .map((curriculum) => curriculumSummary(curriculum, release))
    .filter((curriculum) => {
        const bySlug = query.curriculum == null || curriculum.slug === query.curriculum;
        const byCountry = query.country == null || curriculum.country === query.country;
        const byCodesOnly = query.codesOnly == null || curriculum.codesOnly === query.codesOnly;
        return bySlug && byCountry && byCodesOnly;
    });

const standardRows = (release) => release.curricula.flatMap((curriculum) => {
    const summary = curriculumSummary(curriculum, release);
    return (curriculum.topics ?? []).map((standard) => ({
        taxonomyVersion: release.taxonomyVersion,
        curriculum: curriculum.slug,
        country: curriculum.country,
        curriculumName: curriculum.name,
        textIncluded: curriculum.textIncluded,
        codesOnly: summary.codesOnly,
        key: standard.key,
        code: standard.code,
        ...(standard.data === undefined ? {} : {data: standard.data}),
    }));
});

const alignmentsByStandardKey = (release) => {
    const byKey = new Map();
    for (const alignment of release.alignments) {
        const rows = byKey.get(alignment.standardKey) || [];
        rows.push(alignment);
        byKey.set(alignment.standardKey, rows);
    }
    return byKey;
};

const filterStandards = (release, query) => {
    const alignmentIndex = alignmentsByStandardKey(release);
    return standardRows(release).filter((standard) => {
        const alignedRows = alignmentIndex.get(standard.key) || [];
        const subject = standard.data?.subject;
        const domain = standard.data?.domain;
        const matchesAlignment = (key, value) => value == null || alignedRows.some((alignment) => alignment[key] === value);

        const byCurriculum = query.curriculum == null || standard.curriculum === query.curriculum;
        const byCountry = query.country == null || standard.country === query.country;
        const bySubject = query.subject == null || subject === query.subject || matchesAlignment('subject', query.subject);
        const byDomain = query.domain == null || domain === query.domain;
        const byBoard = matchesAlignment('board', query.board);
        const byClass = matchesAlignment('class', query.class);
        const byStrand = matchesAlignment('strand', query.strand);
        const byKey = query.key == null || standard.key === query.key;
        const byCode = query.code == null || standard.code === query.code;
        const byCodesOnly = query.codesOnly == null || standard.codesOnly === query.codesOnly;
        return byCurriculum && byCountry && bySubject && byDomain && byBoard && byClass && byStrand && byKey && byCode && byCodesOnly;
    });
};

const filterAlignments = (release, query) => release.alignments.filter((alignment) => {
    const byTopic = query.topicId == null || alignment.topicId === query.topicId;
    const byStandard = query.standardKey == null || alignment.standardKey === query.standardKey;
    const byCurriculum = query.curriculum == null || alignment.curriculum === query.curriculum;
    const byCountry = query.country == null || alignment.country === query.country;
    const byBoard = query.board == null || alignment.board === query.board;
    const byClass = query.class == null || alignment.class === query.class;
    const bySubject = query.subject == null || alignment.subject === query.subject;
    const byStrand = query.strand == null || alignment.strand === query.strand;
    const byMatch = query.matchType == null || alignment.matchType === query.matchType;
    const byConfidence = query.confidence == null || alignment.confidence === query.confidence;
    return byTopic && byStandard && byCurriculum && byCountry && byBoard && byClass && bySubject && byStrand && byMatch && byConfidence;
});

const filterClusters = (release, query) => release.clusters.filter((cluster) => {
    const bySubject = query.subject == null || cluster.subject === query.subject;
    const byDomain = query.domain == null || cluster.domain === query.domain;
    const byAge = query.age == null || cluster.ageRangeStart === query.age;
    return bySubject && byDomain && byAge;
});

const buildCoverage = (release, query) => {
    const standardsByCurriculum = new Map();
    for (const row of standardRows(release)) {
        const rows = standardsByCurriculum.get(row.curriculum) || [];
        rows.push(row);
        standardsByCurriculum.set(row.curriculum, rows);
    }

    const alignmentsByCurriculum = new Map();
    for (const alignment of release.alignments) {
        const rows = alignmentsByCurriculum.get(alignment.curriculum) || [];
        rows.push(alignment);
        alignmentsByCurriculum.set(alignment.curriculum, rows);
    }

    return filterCurricula(release, query).map((curriculum) => {
        const standards = standardsByCurriculum.get(curriculum.slug) || [];
        const alignments = alignmentsByCurriculum.get(curriculum.slug) || [];
        return {
            taxonomyVersion: release.taxonomyVersion,
            curriculum: curriculum.slug,
            country: curriculum.country,
            name: curriculum.name,
            textIncluded: curriculum.textIncluded,
            codesOnly: curriculum.codesOnly,
            standardCount: standards.length,
            alignmentCount: alignments.length,
            alignedStandardCount: new Set(alignments.map((row) => row.standardKey)).size,
            alignedTopicCount: new Set(alignments.map((row) => row.topicId)).size,
            subjects: setValues(alignments, (row) => row.subject),
            boards: setValues(alignments, (row) => row.board),
            classes: setValues(alignments, (row) => row.class),
            strands: setValues(alignments, (row) => row.strand),
        };
    });
};

const handleKnownGraphError = (res, error) => {
    const message = String(error?.message ?? '');
    const unknownTopic = message.match(/^unknown_topic_id: (.+)$/);
    if (unknownTopic) {
        sendError(res, 404, 'unknown_topic_id', `Unknown topic id: ${unknownTopic[1]}`, {topicId: unknownTopic[1]});
        return true;
    }
    return false;
};

const parentJourneyErrorStatus = {
    unsupported_parent_journey_context: 400,
    invalid_consent_boundary: 400,
    synthetic_evidence_required: 400,
    private_data_not_allowed: 400,
    invalid_parent_journey_evidence: 400,
    invalid_reviewed_activity: 500,
};

const handleParentJourneyError = (res, error, taxonomyVersion) => {
    if (handleKnownGraphError(res, error)) return true;
    const statusCode = parentJourneyErrorStatus[error?.code];
    if (!statusCode) return false;
    sendError(res, statusCode, error.code, error.message, {taxonomyVersion});
    return true;
};

const readSyntheticMasteryRequest = async (req, res) => {
    try {
        return await readJsonBody(req);
    } catch (error) {
        if (error.code === 'invalid_json') {
            sendError(res, 400, 'invalid_json', 'Request body must be valid JSON.');
            return null;
        }
        if (error.code === 'request_body_too_large') {
            sendError(res, 413, 'request_body_too_large', 'Request body exceeds 1 MB.');
            return null;
        }
        throw error;
    }
};

const normalizeTopicIdFilter = (topicIds) => (
    Array.isArray(topicIds)
        ? [...new Set(topicIds.filter((topicId) => typeof topicId === 'string' && topicId.length > 0))].sort((a, b) => a.localeCompare(b))
        : []
);

const buildMasterySummary = (graph, request = {}) => {
    const filteredTopicIds = normalizeTopicIdFilter(request.topicIds);
    for (const topicId of filteredTopicIds) {
        graph.getTopic(topicId);
    }

    const masteryByTopic = deriveMasteryState(request.masteryEvents ?? []);
    const allowedTopicIds = filteredTopicIds.length > 0 ? new Set(filteredTopicIds) : null;
    const topics = Array.from(masteryByTopic.values())
        .filter((state) => allowedTopicIds === null || allowedTopicIds.has(state.topicId))
        .sort((a, b) => a.topicId.localeCompare(b.topicId));

    return {
        taxonomyVersion: graph.taxonomyVersion,
        learnerId: request.learnerId ?? null,
        filter: {
            topicIds: filteredTopicIds,
        },
        count: topics.length,
        topics,
        explanation: 'Mastery summary is derived from submitted synthetic evidence only.',
    };
};

const routeGet = (res, pathParts, searchParams, {release, graph}) => {
    const query = parseQuery(searchParams);

    if (pathParts.length === 4 && pathParts.join('/') === 'taxonomy/v1/releases/current') {
        sendJson(res, 200, releaseEnvelope(release));
        return;
    }

    if (pathParts.length === 3 && pathParts.join('/') === 'taxonomy/v1/topics') {
        const matchingTopics = filterTopics(release.topics, query);
        const offset = parsePositiveInt(query.offset, 0);
        const limit = parsePositiveInt(query.limit, 100, {max: 500});
        const topics = matchingTopics.slice(offset, offset + limit);
        sendJson(res, 200, {
            taxonomyVersion: release.taxonomyVersion,
            filter: query,
            count: topics.length,
            totalMatching: matchingTopics.length,
            offset,
            limit,
            topics,
        });
        return;
    }

    if (pathParts.length === 4 && pathParts[0] === 'taxonomy' && pathParts[1] === 'v1' && pathParts[2] === 'topics') {
        try {
            sendJson(res, 200, {
                taxonomyVersion: release.taxonomyVersion,
                topic: graph.getTopic(pathParts[3]),
            });
        } catch (error) {
            if (!handleKnownGraphError(res, error)) {
                throw error;
            }
        }
        return;
    }

    if (pathParts.length === 5 && pathParts[0] === 'taxonomy' && pathParts[1] === 'v1' && pathParts[2] === 'topics') {
        const topicId = pathParts[3];
        const depth = parsePositiveInt(query.depth, 1, {max: 10});
        try {
            if (pathParts[4] === 'prerequisites') {
                sendJson(res, 200, graph.getPrerequisites(topicId, {depth}));
                return;
            }
            if (pathParts[4] === 'unlocks') {
                sendJson(res, 200, graph.getUnlocks(topicId, {depth}));
                return;
            }
        } catch (error) {
            if (!handleKnownGraphError(res, error)) {
                throw error;
            }
            return;
        }
    }

    if (pathParts.length === 3 && pathParts.join('/') === 'taxonomy/v1/curriculum-topics') {
        const view = graph.getCurriculumTopics(query);
        sendJson(res, 200, view);
        return;
    }

    if (pathParts.length === 3 && pathParts.join('/') === 'taxonomy/v1/curricula') {
        const curricula = filterCurricula(release, query);
        sendJson(res, 200, {
            taxonomyVersion: release.taxonomyVersion,
            filter: query,
            count: curricula.length,
            curricula,
        });
        return;
    }

    if (pathParts.length === 3 && pathParts.join('/') === 'taxonomy/v1/standards') {
        const matchingStandards = filterStandards(release, query);
        const page = paginate(matchingStandards, query);
        sendJson(res, 200, {
            taxonomyVersion: release.taxonomyVersion,
            filter: query,
            count: page.rows.length,
            totalMatching: matchingStandards.length,
            offset: page.offset,
            limit: page.limit,
            standards: page.rows,
        });
        return;
    }

    if (pathParts.length === 3 && pathParts.join('/') === 'taxonomy/v1/curriculum-alignments') {
        const matchingAlignments = filterAlignments(release, query);
        const page = paginate(matchingAlignments, query);
        sendJson(res, 200, {
            taxonomyVersion: release.taxonomyVersion,
            filter: query,
            count: page.rows.length,
            totalMatching: matchingAlignments.length,
            offset: page.offset,
            limit: page.limit,
            alignments: page.rows,
        });
        return;
    }

    if (pathParts.length === 3 && pathParts.join('/') === 'taxonomy/v1/clusters') {
        const matchingClusters = filterClusters(release, query);
        const page = paginate(matchingClusters, query);
        sendJson(res, 200, {
            taxonomyVersion: release.taxonomyVersion,
            filter: query,
            count: page.rows.length,
            totalMatching: matchingClusters.length,
            offset: page.offset,
            limit: page.limit,
            clusters: page.rows,
        });
        return;
    }

    if (pathParts.length === 3 && pathParts.join('/') === 'taxonomy/v1/coverage') {
        const coverage = buildCoverage(release, query);
        sendJson(res, 200, {
            taxonomyVersion: release.taxonomyVersion,
            filter: query,
            count: coverage.length,
            coverage,
        });
        return;
    }

    sendError(res, 404, 'not_found', 'Endpoint not found.');
};

const routePost = async (req, res, pathParts, {release, graph}) => {
    if (pathParts.length === 3 && pathParts.join('/') === 'companion/v1/parent-journey') {
        const request = await readSyntheticMasteryRequest(req, res);
        if (request === null) return;

        try {
            sendJson(res, 200, buildParentCompanionJourney(graph, request));
        } catch (error) {
            if (handleParentJourneyError(res, error, release.taxonomyVersion)) return;
            sendError(res, 400, 'invalid_parent_journey_request', error.message, {taxonomyVersion: release.taxonomyVersion});
        }
        return;
    }

    if (pathParts.length === 3 && pathParts.join('/') === 'learners/v1/mastery-summary') {
        const request = await readSyntheticMasteryRequest(req, res);
        if (request === null) return;

        try {
            sendJson(res, 200, buildMasterySummary(graph, request));
        } catch (error) {
            if (handleKnownGraphError(res, error)) {
                return;
            }
            sendError(res, 400, 'invalid_learner_request', error.message, {taxonomyVersion: release.taxonomyVersion});
        }
        return;
    }

    if (pathParts.length === 3 && pathParts.join('/') === 'planner/v1/next-best-topics') {
        const request = await readSyntheticMasteryRequest(req, res);
        if (request === null) return;

        try {
            const masteryByTopic = deriveMasteryState(request.masteryEvents ?? []);
            const response = recommendNextBestTopics(graph, {
                ...request,
                masteryByTopic,
            });
            sendJson(res, 200, response);
        } catch (error) {
            if (handleKnownGraphError(res, error)) {
                return;
            }
            sendError(res, 400, 'invalid_planner_request', error.message, {taxonomyVersion: release.taxonomyVersion});
        }
        return;
    }

    if (pathParts.length === 3 && pathParts.join('/') === 'planner/v1/remediation-plan') {
        const request = await readSyntheticMasteryRequest(req, res);
        if (request === null) return;

        try {
            const masteryByTopic = deriveMasteryState(request.masteryEvents ?? []);
            const response = buildRemediationPlan(graph, {
                ...request,
                masteryByTopic,
            });
            sendJson(res, 200, response);
        } catch (error) {
            if (handleKnownGraphError(res, error)) {
                return;
            }
            sendError(res, 400, 'invalid_planner_request', error.message, {taxonomyVersion: release.taxonomyVersion});
        }
        return;
    }

    if (pathParts.length === 3 && pathParts.join('/') === 'planner/v1/diagnostic-plan') {
        const request = await readSyntheticMasteryRequest(req, res);
        if (request === null) return;

        try {
            const masteryByTopic = deriveMasteryState(request.masteryEvents ?? []);
            const response = buildDiagnosticPlan(graph, {
                ...request,
                masteryByTopic,
            });
            sendJson(res, 200, response);
        } catch (error) {
            if (handleKnownGraphError(res, error)) {
                return;
            }
            sendError(res, 400, 'invalid_planner_request', error.message, {taxonomyVersion: release.taxonomyVersion});
        }
        return;
    }

    if (pathParts.length === 4 && pathParts[0] === 'learners' && pathParts[1] === 'v1') {
        const endpoint = pathParts[2];
        const topicId = pathParts[3];
        const request = await readSyntheticMasteryRequest(req, res);
        if (request === null) return;

        try {
            const masteryByTopic = deriveMasteryState(request.masteryEvents ?? []);

            if (endpoint === 'readiness') {
                sendJson(res, 200, {
                    learnerId: request.learnerId ?? null,
                    ...checkReadiness(graph, masteryByTopic, topicId),
                });
                return;
            }

            if (endpoint === 'learning-gaps') {
                sendJson(res, 200, {
                    learnerId: request.learnerId ?? null,
                    ...findLearningGaps(graph, masteryByTopic, topicId),
                });
                return;
            }
        } catch (error) {
            if (handleKnownGraphError(res, error)) {
                return;
            }
            sendError(res, 400, 'invalid_learner_request', error.message, {taxonomyVersion: release.taxonomyVersion});
            return;
        }
    }

    sendError(res, 404, 'not_found', 'Endpoint not found.');
};

export const createEaseFactorApiServer = ({rootDir = process.cwd()} = {}) => {
    const release = loadTaxonomyRelease(rootDir);
    const graph = makeGraphStore(release);

    return createServer(async (req, res) => {
        try {
            const url = new URL(req.url, 'http://127.0.0.1');
            const pathParts = url.pathname.split('/').filter(Boolean).map(decodeURIComponent);

            if (req.method === 'GET') {
                routeGet(res, pathParts, url.searchParams, {release, graph});
                return;
            }

            if (req.method === 'POST') {
                await routePost(req, res, pathParts, {release, graph});
                return;
            }

            sendError(res, 405, 'method_not_allowed', 'Method not allowed.');
        } catch (error) {
            sendError(res, 500, 'internal_error', error.message);
        }
    });
};

if (process.argv[1] && process.argv[1] === fileURLToPath(import.meta.url)) {
    const portArgIndex = process.argv.indexOf('--port');
    const port = portArgIndex >= 0
        ? Number.parseInt(process.argv[portArgIndex + 1], 10)
        : Number.parseInt(process.env.PORT ?? '3080', 10);
    const host = process.env.HOST ?? '127.0.0.1';
    const server = createEaseFactorApiServer();

    server.listen(port, host, () => {
        const address = server.address();
        console.log(`EaseFactor reference API listening on http://${address.address}:${address.port}`);
    });
}
