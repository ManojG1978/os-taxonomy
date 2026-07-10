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

function skipComment(source, start) {
  if (source.startsWith('//', start)) {
    const lineEnd = source.indexOf('\n', start + 2);
    return lineEnd === -1 ? source.length : lineEnd + 1;
  }

  if (source.startsWith('/*', start)) {
    const commentEnd = source.indexOf('*/', start + 2);
    return commentEnd === -1 ? source.length : commentEnd + 2;
  }

  return start;
}

function skipTrivia(source, start) {
  let index = start;

  while (index < source.length) {
    if (/\s/.test(source[index])) {
      index += 1;
      continue;
    }

    const afterComment = skipComment(source, index);
    if (afterComment !== index) {
      index = afterComment;
      continue;
    }

    break;
  }

  return index;
}

function readQuotedString(source, start) {
  const quote = source[start];
  let value = '';

  for (let index = start + 1; index < source.length; index += 1) {
    if (source[index] === '\\') {
      if (index + 1 < source.length) {
        value += source[index + 1];
        index += 1;
      }
    } else if (source[index] === quote) {
      return {end: index + 1, value};
    } else {
      value += source[index];
    }
  }

  return {end: source.length, value};
}

function skipTemplateExpression(source, start) {
  let depth = 1;
  let index = start;

  while (index < source.length && depth > 0) {
    const afterComment = skipComment(source, index);
    if (afterComment !== index) {
      index = afterComment;
    } else if (source[index] === "'" || source[index] === '"') {
      index = readQuotedString(source, index).end;
    } else if (source[index] === '`') {
      index = skipTemplateLiteral(source, index);
    } else {
      if (source[index] === '{') depth += 1;
      if (source[index] === '}') depth -= 1;
      index += 1;
    }
  }

  return index;
}

function skipTemplateLiteral(source, start) {
  let index = start + 1;

  while (index < source.length) {
    if (source[index] === '\\') {
      index += 2;
    } else if (source[index] === '`') {
      return index + 1;
    } else if (source.startsWith('${', index)) {
      index = skipTemplateExpression(source, index + 2);
    } else {
      index += 1;
    }
  }

  return source.length;
}

function readIdentifier(source, start) {
  let end = start;
  while (end < source.length && /[A-Za-z0-9_$]/.test(source[end])) {
    end += 1;
  }
  return {end, value: source.slice(start, end)};
}

function readImportDeclaration(source, start) {
  let index = skipTrivia(source, start);

  if (source[index] === '(' || source[index] === '.') {
    return null;
  }

  if (source[index] === "'" || source[index] === '"') {
    return readQuotedString(source, index).value;
  }

  while (index < source.length && source[index] !== ';') {
    index = skipTrivia(source, index);
    if (/[A-Za-z_$]/.test(source[index])) {
      const identifier = readIdentifier(source, index);
      index = identifier.end;
      if (identifier.value === 'from') {
        index = skipTrivia(source, index);
        if (source[index] === "'" || source[index] === '"') {
          return readQuotedString(source, index).value;
        }
        return null;
      }
    } else if (source[index] === "'" || source[index] === '"') {
      index = readQuotedString(source, index).end;
    } else if (source[index] === '`') {
      index = skipTemplateLiteral(source, index);
    } else {
      index += 1;
    }
  }

  return null;
}

function readExportDeclaration(source, start) {
  const index = skipTrivia(source, start);
  if (source[index] !== '{' && source[index] !== '*') {
    return null;
  }
  return readImportDeclaration(source, index);
}

function staticModuleReferences(source) {
  const references = [];
  let index = 0;

  while (index < source.length) {
    const afterComment = skipComment(source, index);
    if (afterComment !== index) {
      index = afterComment;
    } else if (source[index] === "'" || source[index] === '"') {
      index = readQuotedString(source, index).end;
    } else if (source[index] === '`') {
      index = skipTemplateLiteral(source, index);
    } else if (/[A-Za-z_$]/.test(source[index])) {
      const identifier = readIdentifier(source, index);
      index = identifier.end;
      if (identifier.value === 'import') {
        const specifier = readImportDeclaration(source, index);
        if (specifier !== null) references.push(specifier);
      } else if (identifier.value === 'export') {
        const specifier = readExportDeclaration(source, index);
        if (specifier !== null) references.push(specifier);
      }
    } else {
      index += 1;
    }
  }

  return references;
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
    const imports = staticModuleReferences(source);

    if (imports.includes('node:http') && !rules.nodeHttpAllowed.has(sourceName)) {
      violations.push(`node:http: ${sourceName}`);
    }

    const importsFileSystem = imports.includes('node:fs') || imports.includes('node:fs/promises');
    const importsTaxonomyData = imports.some(
      (specifier) => /(^|[/\\])data[/\\][^/\\]+\.json$/.test(specifier),
    );
    const referencesTaxonomyData = /\b(?:resolve|join)\s*\([^)]*['"]data['"]/.test(source)
      || /['"](?:[^'"]*[/\\])?data[/\\][^'"]+\.json['"]/.test(source)
      || imports.some((specifier) => /(^|[/\\])data[/\\]/.test(specifier));
    if (
      (importsTaxonomyData || (importsFileSystem && referencesTaxonomyData))
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
