# Agent Workflow

This repo has setup files for both Codex and Claude Code:

- `AGENTS.md`
- `CLAUDE.md`

`AGENTS.md` is the canonical shared guidance. Codex reads it directly, while
`CLAUDE.md` imports it with `@AGENTS.md` so the two tools do not maintain
duplicate copies of the same rules. Nested instruction pairs provide
subtree-specific additions where needed.

The operating model is small, careful changes in a data-first repository. The
released JSON remains the source of truth; the EaseFactor reference modules and
the visualizer are bounded consumers of that data.

## Default Workflow

1. Read the relevant data, schema, and existing documentation before editing.
2. Keep changes tightly scoped.
3. Keep app work under `apps/` and reference integration work under
   `scripts/easefactor/`. Avoid adding new root frameworks, build systems,
   dependencies, generated files, or lockfiles unless the user explicitly asks
   for them.
4. Preserve topic IDs, standard keys, and dependency endpoints unless a breaking
   migration is intended.
5. Respect the codes-only curriculum boundary.
6. Run `npm run validate` before handing off.

## Surface-Specific Verification

- EaseFactor reference changes: `npm run test:easefactor`.
- EaseFactor API changes: `npm run test:easefactor-api`.
- Visualizer changes: follow `apps/visualizer/AGENTS.md`, including type-check,
  focused tests, and a production build when applicable.

## When Updating Data

Data changes usually require updates to:

- The edited `data/*.json` file.
- Its declared count, if records were added or removed.
- `data/manifest.json` file byte count.
- `data/manifest.json` SHA-256 checksum.
- Possibly the relevant `schema/*.json` file, if the data shape changes.
- Documentation, if behavior, coverage, or licensing boundaries changed.

## When Updating Documentation

Documentation changes do not require manifest updates because the manifest only
tracks released data files. Still run `npm run validate` to confirm the data
checkout remains consistent.

## Known Repo-Specific Caution

The manifest validates byte-level hashes. On Windows, CRLF conversion can break
those hashes. Keep `.gitattributes` in place and avoid tools that rewrite JSON
line endings to CRLF.
