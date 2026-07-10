import {sendMappedError} from '../errors.mjs';
import {sendJson} from '../http-response.mjs';
import {paginate, parseNonNegativeInt, parseQuery} from '../query.mjs';

const exact = (...expected) => (pathParts) => pathParts.length === expected.length
  && pathParts.every((part, index) => part === expected[index])
  ? {}
  : false;

const topic = (pathParts) => pathParts.length === 4
  && pathParts[0] === 'taxonomy'
  && pathParts[1] === 'v1'
  && pathParts[2] === 'topics'
  ? {topicId: pathParts[3]}
  : false;

const traversal = (kind) => (pathParts) => pathParts.length === 5
  && pathParts[0] === 'taxonomy'
  && pathParts[1] === 'v1'
  && pathParts[2] === 'topics'
  && pathParts[4] === kind
  ? {topicId: pathParts[3]}
  : false;

export const createTaxonomyRoutes = ({release, graph, presenter}) => [
  {
    method: 'GET',
    match: exact('taxonomy', 'v1', 'releases', 'current'),
    handle: ({res}) => sendJson(res, 200, presenter.releaseEnvelope(release)),
  },
  {
    method: 'GET',
    match: exact('taxonomy', 'v1', 'topics'),
    handle: ({res, url}) => {
      const query = parseQuery(url.searchParams);
      const matchingTopics = presenter.filterTopics(release.topics, query);
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
    },
  },
  {
    method: 'GET',
    match: topic,
    handle: ({res, params}) => {
      try {
        sendJson(res, 200, {
          taxonomyVersion: release.taxonomyVersion,
          topic: graph.getTopic(params.topicId),
        });
      } catch (error) {
        if (!sendMappedError(res, error)) throw error;
      }
    },
  },
  {
    method: 'GET',
    match: traversal('prerequisites'),
    handle: ({res, url, params}) => {
      const query = parseQuery(url.searchParams);
      const depth = parseNonNegativeInt(query.depth, 1, {max: 10});
      try {
        sendJson(res, 200, graph.getPrerequisites(params.topicId, {depth}));
      } catch (error) {
        if (!sendMappedError(res, error)) throw error;
      }
    },
  },
  {
    method: 'GET',
    match: traversal('unlocks'),
    handle: ({res, url, params}) => {
      const query = parseQuery(url.searchParams);
      const depth = parseNonNegativeInt(query.depth, 1, {max: 10});
      try {
        sendJson(res, 200, graph.getUnlocks(params.topicId, {depth}));
      } catch (error) {
        if (!sendMappedError(res, error)) throw error;
      }
    },
  },
  {
    method: 'GET',
    match: exact('taxonomy', 'v1', 'curriculum-topics'),
    handle: ({res, url}) => sendJson(res, 200, graph.getCurriculumTopics(parseQuery(url.searchParams))),
  },
  {
    method: 'GET',
    match: exact('taxonomy', 'v1', 'curricula'),
    handle: ({res, url}) => {
      const query = parseQuery(url.searchParams);
      const curricula = presenter.filterCurricula(release, query);
      sendJson(res, 200, {
        taxonomyVersion: release.taxonomyVersion,
        filter: query,
        count: curricula.length,
        curricula,
      });
    },
  },
  ...[
    ['standards', presenter.filterStandards, 'standards'],
    ['curriculum-alignments', presenter.filterAlignments, 'alignments'],
    ['clusters', presenter.filterClusters, 'clusters'],
  ].map(([endpoint, filter, responseKey]) => ({
    method: 'GET',
    match: exact('taxonomy', 'v1', endpoint),
    handle: ({res, url}) => {
      const query = parseQuery(url.searchParams);
      const matchingRows = filter(release, query);
      const page = paginate(matchingRows, query);
      sendJson(res, 200, {
        taxonomyVersion: release.taxonomyVersion,
        filter: query,
        count: page.rows.length,
        totalMatching: matchingRows.length,
        offset: page.offset,
        limit: page.limit,
        [responseKey]: page.rows,
      });
    },
  })),
  {
    method: 'GET',
    match: exact('taxonomy', 'v1', 'coverage'),
    handle: ({res, url}) => {
      const query = parseQuery(url.searchParams);
      const coverage = presenter.buildCoverage(release, query);
      sendJson(res, 200, {
        taxonomyVersion: release.taxonomyVersion,
        filter: query,
        count: coverage.length,
        coverage,
      });
    },
  },
];
