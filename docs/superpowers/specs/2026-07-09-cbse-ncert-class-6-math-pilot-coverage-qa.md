# CBSE/NCERT Class 6 Math Pilot Coverage QA Design

## Goal

Review the first CBSE-facing NCERT Class 6 Mathematics pilot mapping for
coverage quality, document gaps against the current Marble Mathematics topic
graph, and select the next bounded codes-only Class 6 Math slice to map.

## Scope

This is a documentation and planning tranche. It does not add source keys,
alignment rows, topics, dependencies, schemas, validation rules, manifest
checksums, or a filtering script.

The tranche produces:

- a row-level QA worksheet for the 18 existing pilot alignment rows
- a coverage gap summary for the current Number System pilot
- a next-slice recommendation using existing Marble topic IDs only
- a seed worksheet for the chosen next slice

## Current Pilot Shape

The current pilot source is `ncert-class6-math-2026-27`. It is codes-only and
contains 10 source keys:

- `M6.NS.001` through `M6.NS.010`

The current alignment layer contains 18 rows for this source, all with:

- `country: "IN"`
- `board: "CBSE"`
- `class: 6`
- `subject: "Mathematics"`
- `strand: "Number System"`
- `confidence: "reviewed"`
- `source: "manual"`

The rows currently cover:

- whole-number reading, writing, comparison, and rounding
- number-line representation
- factors, multiples, primes, and composites
- common factors and common multiples
- divisibility and remainder reasoning
- place-value patterns
- mathematical explanation support

## QA Questions

The row-level audit should answer these questions for each of the 18 rows:

- Does the `standardKey` resolve to the codes-only NCERT source?
- Does the `topicId` resolve to a current Marble Mathematics topic?
- Is the topic domain plausible for a Class 6 Number System pilot?
- Is `matchType` calibrated correctly as `direct`, `partial`, `supporting`, or
  `extension`?
- Is the row too broad, too narrow, or duplicated in a way that would confuse
  board/class filtering?
- Does any note or worksheet text risk copying upstream textbook, syllabus,
  exercise, exemplar, or standard prose?

## Expected Coverage Gaps

The current pilot intentionally does not cover the full Class 6 Mathematics
book. Based on the present Marble topic graph, obvious unmapped areas include:

- geometry foundations such as points, line segments, rays, lines, and angles
- perimeter and area measurement
- fractions
- data handling and presentation
- construction work
- symmetry
- integers and negative-number contexts
- broader patterning and algebraic generalisation

These are not defects in the first pilot. They should be documented as planned
expansion gaps so downstream consumers do not read the pilot as full-board
coverage.

## Recommended Next Slice

Choose geometry and measurement as the next small slice, with the local slice
code prefix `M6.GM`.

Rationale:

- It maps cleanly to existing Marble `Geometry` and `Measurement` topics.
- It exercises cross-domain Class 6 filtering without requiring new topic IDs.
- It is less likely than integers to overlap awkwardly with the current Number
  System pilot.
- It can stay compact: about 6-10 new source keys and 12-25 alignment rows.

Candidate Marble topic IDs to review:

| Candidate topic ID | Domain      | Topic name                       | Intended use                                 |
|--------------------|-------------|----------------------------------|----------------------------------------------|
| `mt_u23IGDxOpk`    | Geometry    | Parallel and perpendicular lines | Lines and relationships between lines        |
| `mt_MFfYcnv6Tv`    | Geometry    | Right Angles & Turns             | Right angles and turn reasoning              |
| `mt_8OAGVdeTJ_`    | Geometry    | Understanding angles             | Angle as shape or turn                       |
| `mt_h0CVtqI2xo`    | Geometry    | Types of angles                  | Acute and obtuse angle comparison            |
| `mt_e4V6hvcuEJ`    | Geometry    | Types of angles (age 8+)         | Diagram conventions and angle notation       |
| `mt_WtcFrxGOgw`    | Measurement | Perimeters of polygons           | Perimeter from side lengths                  |
| `mt_6xNmQLzuqm`    | Measurement | Understanding Area               | Area as unit-square coverage                 |
| `mt_Jvvh5P06NV`    | Measurement | Area by Tiling                   | Rectangle area through tiling                |
| `mt_eMtV6tBSJm`    | Measurement | Area of compound shapes          | Additive area reasoning                      |
| `mt_eiB3-6pu6a`    | Measurement | Estimating answers (age 9+)      | Rectangle and square area/perimeter formulas |
| `mt_n0AlyLQwC9`    | Measurement | Perimeter of Compound Shapes     | Composite rectilinear perimeter              |
| `mt_MJZA90uc6H`    | Measurement | Perimeter (age 10+)              | Same-area and same-perimeter comparisons     |

## Alternative Slice

If the QA audit shows the Number System pilot needs more immediate continuity,
choose an integers extension instead with local code prefix `M6.INT`.

Candidate Marble topic IDs to review:

| Candidate topic ID | Domain                              | Topic name                           | Intended use                                   |
|--------------------|-------------------------------------|--------------------------------------|------------------------------------------------|
| `mt_vXRzMbiPff`    | Number Representation & Place Value | Negative Numbers                     | Counting backward through zero                 |
| `mt_1KkvzwYxbR`    | Number Representation & Place Value | Negative numbers in context          | Interpreting negative numbers in real contexts |
| `mt_RVK655t391`    | Number Representation & Place Value | Measuring temperature                | Intervals across zero                          |
| `mt_9QzSnn8m80`    | Addition & Subtraction              | Positive and Negative Numbers        | Opposite directions or values                  |
| `mt_PsylzZ9lHW`    | Number Representation & Place Value | Fractions on a number line           | Integers on a unified number line              |
| `mt_uDJY0X0hgo`    | Number Representation & Place Value | Fractions on a number line (age 11+) | Ordering mixed positive and negative values    |
| `mt_RWUY7_IXvw`    | Number Representation & Place Value | Numbers on a number line             | Absolute value as distance from zero           |

Use this alternative only if the team wants the next slice to remain inside
number representation. Otherwise, geometry and measurement is the preferred
next expansion.

## Source Posture

Keep the source codes-only. The QA worksheet and next-slice worksheet may use
Marble-authored short labels and review notes, but must not include copied
upstream textbook, syllabus, exercise, exemplar, or standard text.

Official source URLs can be cited for provenance and manual review:

- NCERT textbook listing: https://ncert.nic.in/textbook.php?lemh1=6-6
- NCERT Class 6 Mathematics Chapter 2 PDF: https://ncert.nic.in/textbook/pdf/fegp102.pdf
- NCERT Class 6 Mathematics Chapter 6 PDF: https://ncert.nic.in/textbook/pdf/fegp106.pdf

## Verification

Because this tranche is documentation-only, no manifest update is expected.
Still run:

```bash
npm run validate
```

Expected result: validation passes with the existing 10 NCERT source keys and
18 alignment rows unchanged.
