import {copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';

export const fixtureDataFiles = [
  'manifest.json',
  'topics.json',
  'dependencies.json',
  'curriculum-standards.json',
  'curriculum-alignments.json',
  'clusters.json',
];

export const makeReleaseFixture = () => {
  const rootDir = mkdtempSync(join(tmpdir(), 'easefactor-reference-'));
  const sourceDataDir = join(process.cwd(), 'data');
  const fixtureDataDir = join(rootDir, 'data');
  mkdirSync(fixtureDataDir, {recursive: true});
  for (const fileName of fixtureDataFiles) {
    copyFileSync(join(sourceDataDir, fileName), join(fixtureDataDir, fileName));
  }
  return {
    rootDir,
    cleanup: () => rmSync(rootDir, {recursive: true, force: true}),
  };
};

export const setManifestCountAndGetFixture = (countKey, nextCount) => {
  const fixture = makeReleaseFixture();
  const manifestPath = join(fixture.rootDir, 'data', 'manifest.json');
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
  manifest.counts = {...manifest.counts, [countKey]: nextCount};
  writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
  return fixture;
};
