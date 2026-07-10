import {createServer} from 'node:http';
import {fileURLToPath} from 'node:url';

import {
    checkReadiness,
    deriveMasteryState,
    findLearningGaps,
    loadTaxonomyRelease,
    makeGraphStore,
} from './easefactor-reference.mjs';
import {buildParentCompanionJourney} from './easefactor/companion/parent-journey.mjs';
import {buildMasterySummary} from './easefactor/learner/mastery-summary.mjs';
import {buildDiagnosticPlan} from './easefactor/planner/diagnostic-plan.mjs';
import {recommendNextBestTopics} from './easefactor/planner/next-best-topics.mjs';
import {buildRemediationPlan} from './easefactor/planner/remediation-plan.mjs';
import {sendMappedError} from './easefactor/api/errors.mjs';
import {sendError, sendJson} from './easefactor/api/http-response.mjs';
import {paginate, parseNonNegativeInt, parseQuery} from './easefactor/api/query.mjs';
import {readJsonRequest} from './easefactor/api/request-body.mjs';
import {
    buildCoverage,
    filterAlignments,
    filterClusters,
    filterCurricula,
    filterStandards,
    filterTopics,
    releaseEnvelope,
} from './easefactor/api/taxonomy-presenter.mjs';

const routeGet = (res, pathParts, searchParams, {release, graph}) => {
    const query = parseQuery(searchParams);

    if (pathParts.length === 4 && pathParts.join('/') === 'taxonomy/v1/releases/current') {
        sendJson(res, 200, releaseEnvelope(release));
        return;
    }

    if (pathParts.length === 3 && pathParts.join('/') === 'taxonomy/v1/topics') {
        const matchingTopics = filterTopics(release.topics, query);
        const offset = parseNonNegativeInt(query.offset, 0);
        const limit = parseNonNegativeInt(query.limit, 100, {max: 500});
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
            if (!sendMappedError(res, error)) {
                throw error;
            }
        }
        return;
    }

    if (pathParts.length === 5 && pathParts[0] === 'taxonomy' && pathParts[1] === 'v1' && pathParts[2] === 'topics') {
        const topicId = pathParts[3];
        const depth = parseNonNegativeInt(query.depth, 1, {max: 10});
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
            if (!sendMappedError(res, error)) {
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
        const request = await readJsonRequest(req, res);
        if (request === null) return;

        try {
            sendJson(res, 200, buildParentCompanionJourney(graph, request));
        } catch (error) {
            sendMappedError(res, error, {
                fallbackCode: 'invalid_parent_journey_request',
                taxonomyVersion: release.taxonomyVersion,
            });
        }
        return;
    }

    if (pathParts.length === 3 && pathParts.join('/') === 'learners/v1/mastery-summary') {
        const request = await readJsonRequest(req, res);
        if (request === null) return;

        try {
            sendJson(res, 200, buildMasterySummary(graph, request));
        } catch (error) {
            sendMappedError(res, error, {
                fallbackCode: 'invalid_learner_request',
                taxonomyVersion: release.taxonomyVersion,
            });
        }
        return;
    }

    if (pathParts.length === 3 && pathParts.join('/') === 'planner/v1/next-best-topics') {
        const request = await readJsonRequest(req, res);
        if (request === null) return;

        try {
            const masteryByTopic = deriveMasteryState(request.masteryEvents ?? []);
            const response = recommendNextBestTopics(graph, {
                ...request,
                masteryByTopic,
            });
            sendJson(res, 200, response);
        } catch (error) {
            sendMappedError(res, error, {
                fallbackCode: 'invalid_planner_request',
                taxonomyVersion: release.taxonomyVersion,
            });
        }
        return;
    }

    if (pathParts.length === 3 && pathParts.join('/') === 'planner/v1/remediation-plan') {
        const request = await readJsonRequest(req, res);
        if (request === null) return;

        try {
            const masteryByTopic = deriveMasteryState(request.masteryEvents ?? []);
            const response = buildRemediationPlan(graph, {
                ...request,
                masteryByTopic,
            });
            sendJson(res, 200, response);
        } catch (error) {
            sendMappedError(res, error, {
                fallbackCode: 'invalid_planner_request',
                taxonomyVersion: release.taxonomyVersion,
            });
        }
        return;
    }

    if (pathParts.length === 3 && pathParts.join('/') === 'planner/v1/diagnostic-plan') {
        const request = await readJsonRequest(req, res);
        if (request === null) return;

        try {
            const masteryByTopic = deriveMasteryState(request.masteryEvents ?? []);
            const response = buildDiagnosticPlan(graph, {
                ...request,
                masteryByTopic,
            });
            sendJson(res, 200, response);
        } catch (error) {
            sendMappedError(res, error, {
                fallbackCode: 'invalid_planner_request',
                taxonomyVersion: release.taxonomyVersion,
            });
        }
        return;
    }

    if (pathParts.length === 4 && pathParts[0] === 'learners' && pathParts[1] === 'v1') {
        const endpoint = pathParts[2];
        const topicId = pathParts[3];
        const request = await readJsonRequest(req, res);
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
            sendMappedError(res, error, {
                fallbackCode: 'invalid_learner_request',
                taxonomyVersion: release.taxonomyVersion,
            });
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
