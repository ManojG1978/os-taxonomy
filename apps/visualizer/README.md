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
