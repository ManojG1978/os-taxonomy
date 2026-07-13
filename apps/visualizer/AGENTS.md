# Visualizer Agent Instructions

This subtree is the app-local Marble Taxonomy graph explorer. It is a bounded
consumer of the repository's released JSON data, not a second source of
taxonomy truth.

## Commands

Run these commands from `apps/visualizer/`:

```bash
npm install
npm run dev
npm run typecheck
node --experimental-strip-types --test src/lib/alignmentFilters.test.mjs src/lib/graphLayout.test.mjs src/lib/graphTheme.test.mjs
npm run build
```

The development server uses `http://127.0.0.1:3100`.

## Editing Guidelines

- Keep visualizer code, dependencies, and generated output inside this subtree.
- Treat the root `data/*.json` files as read-only inputs for UI work. If a task
  explicitly changes release data, follow the root `AGENTS.md` manifest,
  checksum, licensing, and validation requirements.
- Preserve strict curriculum filtering: directly aligned topics are shown, and
  dependency edges remain only when both endpoints are visible.
- Keep reusable graph filtering, layout, and theme logic in `src/lib/` with
  focused Node tests. Keep rendering and interaction logic in components.
- Do not commit `.next/`, build output, caches, or other generated artifacts.

## Verification Before Handoff

Run the focused Node tests and `npm run typecheck` after library or component
changes. Run `npm run build` when changes affect production rendering, routing,
configuration, or dependencies. Also run the root `npm run validate` whenever
the task changes or depends on released taxonomy data.
