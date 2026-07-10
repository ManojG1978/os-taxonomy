import test from 'node:test';
import assert from 'node:assert/strict';

import {loadTaxonomyRelease} from '../release/load-release.mjs';
import {makeGraphStore} from './graph-store.mjs';

test('builds a graph store with prerequisite and unlock traversal', () => {
  const graph = makeGraphStore(loadTaxonomyRelease());
  assert.equal(graph.taxonomyVersion, 'v1');

  const topic = graph.getTopic('mt_FHIAv6dfhU');
  assert.equal(topic.id, 'mt_FHIAv6dfhU');
  assert.equal(topic.subject, 'Mathematics');

  const prerequisites = graph.getPrerequisites('mt_FHIAv6dfhU', {depth: 2});
  assert.equal(prerequisites.taxonomyVersion, 'v1');
  assert.equal(prerequisites.topicId, 'mt_FHIAv6dfhU');
  assert.equal(prerequisites.depth, 2);
  assert.ok(Array.isArray(prerequisites.prerequisites));
  assert.ok(prerequisites.prerequisites.length >= 5);

  const unlocks = graph.getUnlocks('mt_nZkL5-XjRX', {depth: 1});
  assert.equal(unlocks.taxonomyVersion, 'v1');
  assert.equal(unlocks.topicId, 'mt_nZkL5-XjRX');
  assert.equal(unlocks.depth, 1);
  assert.ok(Array.isArray(unlocks.unlocks));
});

test('builds strict curriculum rows and includes expected topic', () => {
  const graph = makeGraphStore(loadTaxonomyRelease());

  const response = graph.getCurriculumTopics({
    curriculum: 'ncert-class6-math-2026-27',
    board: 'CBSE',
    class: 6,
    subject: 'Mathematics',
    strand: 'Number System',
  });

  assert.equal(response.taxonomyVersion, 'v1');
  assert.equal(response.filter.mode, 'strictCurriculumView');
  assert.equal(response.topics.length, 18);
  assert.equal(response.topics[0].viewRole, 'aligned');
  assert.ok(response.topics.some((row) => row.topicId === 'mt_FHIAv6dfhU'));
});

test('learningGraphView includes aligned and prerequisite roles', () => {
  const graph = makeGraphStore(loadTaxonomyRelease());

  const response = graph.getCurriculumTopics({
    curriculum: 'ncert-class6-math-2026-27',
    board: 'CBSE',
    class: 6,
    subject: 'Mathematics',
    strand: 'Number System',
    mode: 'learningGraphView',
    prerequisiteDepth: 2,
  });

  const roles = new Set(response.topics.map((row) => row.viewRole));

  assert.equal(response.taxonomyVersion, 'v1');
  assert.equal(response.filter.mode, 'learningGraphView');
  assert.equal(response.filter.prerequisiteDepth, 2);
  assert.ok(roles.has('aligned'), 'learning graph should include aligned rows');
  assert.ok(roles.has('prerequisite'), 'learning graph should include prerequisite rows');
  assert.ok(response.topics.some((row) => row.topicId === 'mt_FHIAv6dfhU' && row.viewRole === 'aligned'));
  assert.ok(response.topics.some((row) => row.viewRole === 'prerequisite'));
  assert.ok(response.topics.length > 18);
});

test('getUnlocks is reverse of dependencies', () => {
  const release = loadTaxonomyRelease();
  const graph = makeGraphStore(release);
  const firstDependency = release.dependencies[0];
  assert.ok(firstDependency);
  const unlocks = graph.getUnlocks(firstDependency.prerequisiteId, {depth: 1});

  assert.ok(unlocks.unlocks.some((row) => row.topicId === firstDependency.topicId && row.distance === 1));
});

test('unknown topic id throws a stable typed error', () => {
  const graph = makeGraphStore(loadTaxonomyRelease());

  assert.throws(
    () => graph.getTopic('mt_missing'),
    /unknown_topic_id: mt_missing/,
  );
});
