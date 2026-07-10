import {readFileSync, readdirSync} from 'node:fs';
import {dirname, extname, relative, resolve, sep} from 'node:path';

const rules = {
  domainCannotImportApi: true,
  noCompositionRootImportsBelowRoot: true,
  nodeHttpAllowed: new Set(),
  taxonomyFileAccessAllowed: new Set(['release/load-release.mjs']),
  rejectCycles: true,
};

const excludedFileEndings = ['.test.mjs', '.test-helper.mjs', '.test-suite.mjs'];
const compositionRoots = new Set(['../easefactor-api.mjs', '../easefactor-reference.mjs']);

function normalizePath(filePath) {
  return filePath.split(sep).join('/');
}

function listProductionModules(rootDir) {
  const modules = [];

  function visit(directory) {
    for (const entry of readdirSync(directory, {withFileTypes: true})) {
      const filePath = resolve(directory, entry.name);
      if (entry.isDirectory()) {
        visit(filePath);
      } else if (
        entry.isFile()
        && entry.name.endsWith('.mjs')
        && !excludedFileEndings.some((ending) => entry.name.endsWith(ending))
      ) {
        modules.push(filePath);
      }
    }
  }

  visit(rootDir);
  return modules.sort();
}

function staticImports(source) {
  const imports = [];
  const importPattern = /\bimport\s+(?:[^'";]*?\s+from\s*)?['"]([^'"]+)['"]/g;
  let match;

  while ((match = importPattern.exec(source)) !== null) {
    imports.push(match[1]);
  }

  return imports;
}

function resolveImport(sourceFile, specifier) {
  let target = resolve(dirname(sourceFile), specifier);
  if (!extname(target)) {
    target += '.mjs';
  }
  return target;
}

export function findCycles(graph) {
  const cycles = [];
  const seen = new Set();
  const nodes = [...graph.keys()].sort();

  function visit(start, current, path, visited) {
    const targets = [...new Set(graph.get(current) ?? [])].sort();

    for (const target of targets) {
      if (target === start) {
        const cycle = [...path, start];
        const key = cycle.join('\0');
        if (!seen.has(key)) {
          seen.add(key);
          cycles.push(cycle);
        }
      } else if (target >= start && graph.has(target) && !visited.has(target)) {
        visited.add(target);
        visit(start, target, [...path, target], visited);
        visited.delete(target);
      }
    }
  }

  for (const start of nodes) {
    visit(start, start, [start], new Set([start]));
  }

  return cycles.sort((left, right) => left.join('\0').localeCompare(right.join('\0')));
}

export function analyzeArchitecture(rootDir) {
  const absoluteRoot = resolve(rootDir);
  const moduleFiles = listProductionModules(absoluteRoot);
  const moduleNames = new Set(moduleFiles.map((file) => normalizePath(relative(absoluteRoot, file))));
  const graph = new Map([...moduleNames].sort().map((moduleName) => [moduleName, []]));
  const violations = [];

  for (const sourceFile of moduleFiles) {
    const sourceName = normalizePath(relative(absoluteRoot, sourceFile));
    const source = readFileSync(sourceFile, 'utf8');
    const imports = staticImports(source);

    if (imports.includes('node:http') && !rules.nodeHttpAllowed.has(sourceName)) {
      violations.push(`node:http: ${sourceName}`);
    }

    const importsFileSystem = imports.includes('node:fs') || imports.includes('node:fs/promises');
    const referencesTaxonomyData = /\b(?:resolve|join)\s*\([^)]*['"]data['"]/.test(source)
      || /['"](?:[^'"]*[/\\])?data[/\\][^'"]+\.json['"]/.test(source)
      || imports.some((specifier) => /(^|[/\\])data[/\\]/.test(specifier));
    if (
      importsFileSystem
      && referencesTaxonomyData
      && !rules.taxonomyFileAccessAllowed.has(sourceName)
    ) {
      violations.push(`taxonomy-file-access: ${sourceName}`);
    }

    for (const specifier of imports) {
      if (!specifier.startsWith('.')) {
        continue;
      }

      const targetFile = resolveImport(sourceFile, specifier);
      const targetName = normalizePath(relative(absoluteRoot, targetFile));

      if (moduleNames.has(targetName)) {
        graph.get(sourceName).push(targetName);
      }

      if (
        rules.domainCannotImportApi
        && !sourceName.startsWith('api/')
        && targetName.startsWith('api/')
      ) {
        violations.push(`domain-to-api: ${sourceName} -> ${targetName}`);
      }

      if (rules.noCompositionRootImportsBelowRoot && compositionRoots.has(targetName)) {
        violations.push(`composition-root: ${sourceName} -> ${targetName}`);
      }
    }
  }

  for (const targets of graph.values()) {
    targets.sort();
  }

  if (rules.rejectCycles) {
    for (const cycle of findCycles(graph)) {
      violations.push(`cycle: ${cycle.join(' -> ')}`);
    }
  }

  return {graph, violations: [...new Set(violations)].sort()};
}
