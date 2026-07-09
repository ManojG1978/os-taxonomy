#!/usr/bin/env node
/**
 * validate.mjs — dependency-free integrity check for the dataset.
 *
 * Verifies structure, referential integrity (every edge endpoint and every
 * topic→standard reference resolves), the codes-only invariant, declared
 * counts, and the manifest SHA-256 checksums. Exits non-zero on any failure.
 *
 *   node scripts/validate.mjs
 */

import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {dirname, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const DATA = resolve(dirname(fileURLToPath(import.meta.url)), '..', 'data');
const load = (name) => JSON.parse(readFileSync(resolve(DATA, name), 'utf8'));
const bytesOf = (name) => readFileSync(resolve(DATA, name));

const errors = [];
const check = (cond, msg) => {
  if (!cond) errors.push(msg);
};

const topics = load('topics.json');
const deps = load('dependencies.json');
const standards = load('curriculum-standards.json');
const clusters = load('clusters.json');
const alignments = load('curriculum-alignments.json');
const manifest = load('manifest.json');

// --- declared counts match reality -----------------------------------------
check(topics.topicCount === topics.topics.length, `topics: topicCount ${topics.topicCount} != ${topics.topics.length}`);
check(deps.edgeCount === deps.dependencies.length, `dependencies: edgeCount ${deps.edgeCount} != ${deps.dependencies.length}`);
check(standards.curriculumCount === standards.curricula.length, `curricula: curriculumCount != length`);
check(clusters.clusterCount === clusters.clusters.length, `clusters: clusterCount != length`);
check(
    alignments.alignmentCount === alignments.alignments.length,
    `alignments: alignmentCount ${alignments.alignmentCount} != ${alignments.alignments.length}`,
);
check(
    manifest.counts?.curriculumAlignments === alignments.alignments.length,
    `manifest: curriculumAlignments ${manifest.counts?.curriculumAlignments} != ${alignments.alignments.length}`,
);

// --- topic ids + basic field validity --------------------------------------
const TYPES = new Set(['CONCEPTUAL', 'PROCEDURAL', 'REPRESENTATIONAL', 'LANGUAGE', 'META']);
const topicIds = new Set();
for (const t of topics.topics) {
  check(typeof t.id === 'string' && t.id.startsWith('mt_'), `topic id malformed: ${t.id}`);
  check(TYPES.has(t.type), `topic ${t.id}: bad type ${t.type}`);
  check(typeof t.description === 'string' && t.description.length > 0, `topic ${t.id}: empty description`);
  check(Array.isArray(t.evidence), `topic ${t.id}: evidence not array`);
  if (topicIds.has(t.id)) errors.push(`duplicate topic id: ${t.id}`);
  topicIds.add(t.id);
}

// --- standard keys ----------------------------------------------------------
const standardKeys = new Set();
const codesOnly = new Set(standards.codesOnlySources ?? []);
const curriculumSlugs = new Set();
for (const c of standards.curricula) {
  const expectFullText = !codesOnly.has(c.slug);
    curriculumSlugs.add(c.slug);
  check(c.textIncluded === expectFullText, `curriculum ${c.slug}: textIncluded ${c.textIncluded} disagrees with codesOnlySources`);
  check(c.topicCount === c.topics.length, `curriculum ${c.slug}: topicCount != length`);
  for (const s of c.topics) {
    check(s.key === `${c.slug}:${s.code}`, `standard key mismatch: ${s.key}`);
    if (standardKeys.has(s.key)) errors.push(`duplicate standard key: ${s.key}`);
    standardKeys.add(s.key);
    // codes-only invariant: no verbatim text for encumbered sources
    if (!expectFullText) check(!('data' in s), `codes-only source ${c.slug} leaks verbatim text at ${s.key}`);
  }
}

// --- referential integrity: dependencies ------------------------------------
for (const d of deps.dependencies) {
  check(topicIds.has(d.topicId), `dependency references unknown topicId ${d.topicId}`);
  check(topicIds.has(d.prerequisiteId), `dependency references unknown prerequisiteId ${d.prerequisiteId}`);
  check(d.topicId !== d.prerequisiteId, `self-dependency on ${d.topicId}`);
  check(d.strength === 'hard' || d.strength === 'soft', `bad strength ${d.strength}`);
}

// --- referential integrity: topic → standard -------------------------------
let danglingRefs = 0;
for (const t of topics.topics) {
  for (const key of t.standards) {
    if (!standardKeys.has(key)) {
      danglingRefs++;
      if (danglingRefs <= 5) errors.push(`topic ${t.id} references unknown standard ${key}`);
    }
  }
}
if (danglingRefs > 5) errors.push(`…and ${danglingRefs - 5} more unknown standard references`);

// --- referential integrity: curriculum alignments --------------------------
const MATCH_TYPES = new Set(['direct', 'partial', 'supporting', 'extension']);
const CONFIDENCE_LEVELS = new Set(['machine', 'reviewed', 'verified']);
const ALIGNMENT_SOURCES = new Set(['manual', 'machine', 'imported']);
const alignmentPairs = new Set();

for (const a of alignments.alignments) {
    check(typeof a.topicId === 'string' && a.topicId.startsWith('mt_'), `alignment topicId malformed: ${a.topicId}`);
    check(topicIds.has(a.topicId), `alignment references unknown topicId ${a.topicId}`);
    check(standardKeys.has(a.standardKey), `alignment references unknown standardKey ${a.standardKey}`);
    check(curriculumSlugs.has(a.curriculum), `alignment references unknown curriculum ${a.curriculum}`);
    check(typeof a.country === 'string' && a.country.trim().length > 0, `alignment ${a.topicId}/${a.standardKey}: empty country`);
    check(typeof a.board === 'string' && a.board.trim().length > 0, `alignment ${a.topicId}/${a.standardKey}: empty board`);
    check(typeof a.subject === 'string' && a.subject.trim().length > 0, `alignment ${a.topicId}/${a.standardKey}: empty subject`);
    check(
        typeof a.standardKey === 'string' && a.standardKey.startsWith(`${a.curriculum}:`),
        `alignment standardKey ${a.standardKey} does not match curriculum ${a.curriculum}`,
    );
    check(MATCH_TYPES.has(a.matchType), `alignment ${a.topicId}/${a.standardKey}: bad matchType ${a.matchType}`);
    check(CONFIDENCE_LEVELS.has(a.confidence), `alignment ${a.topicId}/${a.standardKey}: bad confidence ${a.confidence}`);
    check(ALIGNMENT_SOURCES.has(a.source), `alignment ${a.topicId}/${a.standardKey}: bad source ${a.source}`);

    const pair = `${a.topicId}\u0000${a.standardKey}`;
    if (alignmentPairs.has(pair)) errors.push(`duplicate alignment: ${a.topicId} -> ${a.standardKey}`);
    alignmentPairs.add(pair);
}

// --- manifest checksums -----------------------------------------------------
for (const [name, meta] of Object.entries(manifest.files ?? {})) {
  const actual = createHash('sha256').update(bytesOf(name)).digest('hex');
  check(actual === meta.sha256, `checksum mismatch for ${name}`);
}

// --- report -----------------------------------------------------------------
if (errors.length) {
  console.error(`✗ ${errors.length} problem(s):`);
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}
console.log(
  `✓ valid — ${topics.topics.length} topics, ${deps.dependencies.length} dependencies, ` +
    `${standardKeys.size} standards, ${alignments.alignments.length} alignments, ${clusters.clusters.length} clusters. ` +
    `Referential integrity + checksums OK.`,
);
