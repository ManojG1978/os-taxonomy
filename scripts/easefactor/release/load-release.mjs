import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';

const readJson = (rootDir, name) => {
  const filePath = resolve(rootDir, 'data', name);
  const raw = readFileSync(filePath, 'utf8');
  return {
    raw,
    json: JSON.parse(raw),
    path: filePath,
  };
};

const sha256 = (text) => createHash('sha256').update(text).digest('hex');

const assertManifestChecksum = (manifest, sourceFileHashes, sourceName) => {
  const expected = manifest?.files?.[sourceName]?.sha256;
  if (!expected) {
    throw new Error(`missing_manifest_file_entry: ${sourceName}`);
  }
  const actual = sourceFileHashes[sourceName];
  if (actual !== expected) {
    throw new Error(`manifest_checksum_mismatch: ${sourceName} expected ${expected} got ${actual}`);
  }
};

const assertCount = (label, expected, actual) => {
  if (expected !== actual) {
    throw new Error(`manifest_count_mismatch: ${label} expected ${expected} got ${actual}`);
  }
};

export const loadTaxonomyRelease = (rootDir = process.cwd()) => {
  const dataDir = resolve(rootDir, 'data');
  const manifest = JSON.parse(readFileSync(resolve(dataDir, 'manifest.json'), 'utf8'));

  const sourceNames = [
    'topics.json',
    'dependencies.json',
    'curriculum-standards.json',
    'curriculum-alignments.json',
    'clusters.json',
  ];

  const loaded = sourceNames.reduce((acc, name) => {
    const {raw, json} = readJson(rootDir, name);
    acc[name] = json;
    acc.sourceHashes[name] = sha256(raw);
    return acc;
  }, {sourceHashes: {}});

  assertManifestChecksum(manifest, loaded.sourceHashes, 'topics.json');
  assertManifestChecksum(manifest, loaded.sourceHashes, 'dependencies.json');
  assertManifestChecksum(manifest, loaded.sourceHashes, 'curriculum-standards.json');
  assertManifestChecksum(manifest, loaded.sourceHashes, 'curriculum-alignments.json');
  assertManifestChecksum(manifest, loaded.sourceHashes, 'clusters.json');

  assertCount('topics', manifest.counts?.topics, loaded['topics.json'].topics.length);
  assertCount('dependencies', manifest.counts?.dependencies, loaded['dependencies.json'].dependencies.length);
  assertCount('curricula', manifest.counts?.curricula, loaded['curriculum-standards.json'].curricula.length);
  const curriculumStandardsCount = loaded['curriculum-standards.json'].curricula.reduce(
    (count, curriculum) => count + (Array.isArray(curriculum.topics) ? curriculum.topics.length : (curriculum.topicCount ?? 0)),
    0,
  );
  assertCount('curriculumStandards', manifest.counts?.curriculumStandards, curriculumStandardsCount);
  assertCount('clusters', manifest.counts?.clusters, loaded['clusters.json'].clusters.length);
  assertCount('curriculumAlignments', manifest.counts?.curriculumAlignments, loaded['curriculum-alignments.json'].alignments.length);

  const release = {
    taxonomyVersion: manifest.taxonomyVersion,
    manifest,
    topics: loaded['topics.json'].topics,
    dependencies: loaded['dependencies.json'].dependencies,
    curricula: loaded['curriculum-standards.json'].curricula,
    codesOnlySources: [...(loaded['curriculum-standards.json'].codesOnlySources ?? [])],
    alignments: loaded['curriculum-alignments.json'].alignments,
    clusters: loaded['clusters.json'].clusters,
    sourceFileHashes: loaded.sourceHashes,
  };

  return release;
};
