# Marble Taxonomy Visualizer

Interactive Next.js app for exploring the JSON graph data in this repository.

## Run

```bash
cd apps/visualizer
npm install
npm run dev
```

Then open `http://127.0.0.1:3100`.

## Data

The app imports the release JSON files from `../../data` at build time. It does
not write to the taxonomy data, manifest, schemas, or provenance files.

The sidebar includes a curriculum filter backed by
`data/curriculum-alignments.json`. Selecting a curriculum, board, class, or
strand switches the graph into a strict aligned-topic view: only directly
aligned topics are shown, with prerequisite edges retained only when both
endpoints are visible.
