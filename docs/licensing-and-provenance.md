# Licensing And Provenance

This dataset is multi-licensed. Read this page together with `README.md`,
`PROVENANCE.md`, `LICENSE`, `LICENSE-CONTENT`, and `CITATION.cff`.

## Dataset Layers

| Layer                                                                                                                           | License or status                        |
|---------------------------------------------------------------------------------------------------------------------------------|------------------------------------------|
| Database structure, IDs, topic-to-topic links, topic-to-standard links                                                          | ODbL 1.0                                 |
| Marble-authored text such as topic names, descriptions, evidence, assessment prompts, dependency reasons, and cluster summaries | CC BY-SA 4.0                             |
| Third-party curriculum standards in `data/curriculum-standards.json`                                                            | Governed by each upstream source's terms |

## Attribution

The README gives this attribution text:

```text
Marble Skill Taxonomy (v1) · © Generative Spark, Inc. (Marble) · https://withmarble.com · licensed under ODbL 1.0 (database) and CC BY-SA 4.0 (content).
```

Users must also preserve upstream notices for curriculum standards used from
`PROVENANCE.md`.

## Codes-Only Sources

Codes-only sources intentionally omit verbatim standard text. They retain
standard identifiers and topic-to-standard links.

Codes-only sources in this release:

- `ngss-k5`
- `ngss-ms`
- `c3-social-studies`
- `ib-pyp-pspe`

Do not add full standard text for these sources unless rights clearance has
been explicitly obtained.

## Full-Text Sources

Full standard text is included for:

- `uk-nc-2013`: UK Department for Education, Crown copyright, Open Government
  Licence v3.0.
- `ccss-ela`: Common Core ELA, under the CCSS Public License.
- `ccss-math`: Common Core Mathematics, under the CCSS Public License.

The Common Core license is purpose-limited and does not make those records
Marble-authored CC BY-SA content.

## Commercial Use Boundary

The README explains the practical distinction between:

- A derivative database: changes or extensions to the taxonomy database itself.
- A produced work: a product, app, model, or output built using the dataset.

The public README states that produced works can remain proprietary, while
derivative taxonomy databases must follow ODbL share-alike obligations.

This is documentation of the repo's stated model, not legal advice.

## Citation Metadata

`CITATION.cff` identifies the dataset as:

- Title: Marble Skill Taxonomy.
- Type: dataset.
- Version: `v1`.
- Release date: 2026-07-08.
- Repository: `https://github.com/withmarbleapp/os-taxonomy`.
- URL: `https://withmarble.com`.
