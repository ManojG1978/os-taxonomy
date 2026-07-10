# Curriculum Coverage

The release covers 1,590 micro-topics across 8 subjects, aligned to 8 curriculum
sources containing 3,301 standards or standard codes.

## Subject Coverage

| Subject                       | Topics |
|-------------------------------|-------:|
| Science                       |    547 |
| Mathematics                   |    503 |
| English                       |    286 |
| History                       |     90 |
| Personal & Social Development |     88 |
| Life Skills                   |     37 |
| Computing                     |     21 |
| Learning to Learn             |     18 |

## Domains By Subject

### Computing

- Artificial Intelligence

### English

- English Thinking
- Grammar & Punctuation
- Handwriting & Transcription
- Phonics & Word Reading
- Reading Comprehension
- Speaking & Listening
- Spelling & Word Study
- Vocabulary
- Writing Composition

### History

- Ancient Egypt
- Ancient Greece & Rome
- Historical Thinking
- Medieval Times

### Learning To Learn

- Learning to Learn

### Life Skills

- Entrepreneurship
- Money & Finance

### Mathematics

- Addition & Subtraction
- Algebra
- Counting & Cardinality
- Data & Statistics
- Fractions
- Geometry
- Mathematical Thinking
- Measurement
- Multiplication & Division
- Number Representation & Place Value
- Probability
- Ratio & Proportion

### Personal & Social Development

- Emotional Literacy
- Empathy & Social Awareness
- Friendship & Cooperation
- Responsible Decision-Making
- Self-Awareness
- Self-Regulation & Resilience

### Science

- Animals of the World
- Dinosaurs & Paleontology
- Earth's Systems
- Ecosystems & Habitats
- Energy
- Forces & Motion
- Insects & Minibeasts
- Matter & Materials
- Ocean Life
- Organisms & Life Processes
- Polar Regions
- Rainforests
- Scientific Inquiry
- Space Exploration
- Space Systems & Earth's History
- The Human Body
- Volcanoes & Earthquakes
- Waves, Light & Sound
- Weather & Climate

## Curriculum Sources

| Slug                        | Curriculum                                                                                                                  | Topic records | Text included  |
|-----------------------------|-----------------------------------------------------------------------------------------------------------------------------|--------------:|----------------|
| `uk-nc-2013`                | The National Curriculum in England: Key stages 1 and 2 framework document                                                   |         1,117 | Yes            |
| `ccss-ela`                  | Common Core State Standards for English Language Arts & Literacy in History/Social Studies, Science, and Technical Subjects |         1,028 | Yes            |
| `ccss-math`                 | Common Core State Standards for Mathematics                                                                                 |           503 | Yes            |
| `c3-social-studies`         | C3 Framework for Social Studies State Standards                                                                             |           338 | No, codes only |
| `ib-pyp-pspe`               | IB PYP Personal, Social and Physical Education Scope and Sequence                                                           |           138 | No, codes only |
| `ngss-k5`                   | Next Generation Science Standards K-5                                                                                       |            78 | No, codes only |
| `ngss-ms`                   | Next Generation Science Standards Middle School                                                                             |            59 | No, codes only |
| `ncert-class6-math-2026-27` | NCERT Class 6 Mathematics pilot                                                                                             |            40 | No, codes only |

## Alignment Infrastructure

The release includes `data/curriculum-alignments.json` as the richer
topic-to-standard alignment layer for board, class, subject, and curriculum
filtering.

The file currently includes a small reviewed India pilot mapping. It is not a
full-board coverage release.

## India Pilot Coverage

`ncert-class6-math-2026-27` provides codes-only source keys for small NCERT
Class 6 Mathematics pilot slices in Number System, Fractions,
Geometry/Measurement, Data Handling/Patterns, and Integers. Alignment rows use
`board: "CBSE"` so products can test CBSE-facing board, class, subject, and
strand filtering without treating the pilot as a full-board coverage release.

Current matrix:

| Source key   | Strand                 | Rows | Topic domains                                              | Match types        |
|--------------|------------------------|-----:|------------------------------------------------------------|--------------------|
| `M6.NS.001`  | Number System          |    2 | Number Representation & Place Value                        | direct             |
| `M6.NS.002`  | Number System          |    1 | Addition & Subtraction                                     | supporting         |
| `M6.NS.003`  | Number System          |    2 | Number Representation & Place Value                        | direct, supporting |
| `M6.NS.004`  | Number System          |    2 | Multiplication & Division                                  | direct             |
| `M6.NS.005`  | Number System          |    3 | Counting & Cardinality, Mathematical Thinking              | supporting         |
| `M6.NS.006`  | Number System          |    2 | Multiplication & Division, Mathematical Thinking           | direct, supporting |
| `M6.NS.007`  | Number System          |    2 | Multiplication & Division                                  | direct, extension  |
| `M6.NS.008`  | Number System          |    1 | Multiplication & Division                                  | supporting         |
| `M6.NS.009`  | Number System          |    2 | Number Representation & Place Value, Mathematical Thinking | supporting         |
| `M6.NS.010`  | Number System          |    1 | Mathematical Thinking                                      | supporting         |
| `M6.FR.001`  | Fractions              |    2 | Fractions                                                  | direct             |
| `M6.FR.002`  | Fractions              |    2 | Fractions                                                  | direct, supporting |
| `M6.FR.003`  | Fractions              |    2 | Fractions                                                  | direct, supporting |
| `M6.FR.004`  | Fractions              |    2 | Fractions                                                  | direct, supporting |
| `M6.FR.005`  | Fractions              |    2 | Fractions                                                  | direct, supporting |
| `M6.FR.006`  | Fractions              |    2 | Fractions                                                  | supporting, direct |
| `M6.FR.007`  | Fractions              |    2 | Fractions                                                  | direct, extension  |
| `M6.FR.008`  | Fractions              |    2 | Fractions                                                  | direct, supporting |
| `M6.GM.001`  | Geometry/Measurement   |    2 | Geometry                                                   | direct, supporting |
| `M6.GM.002`  | Geometry/Measurement   |    2 | Geometry                                                   | direct             |
| `M6.GM.003`  | Geometry/Measurement   |    2 | Geometry                                                   | direct, supporting |
| `M6.GM.004`  | Geometry/Measurement   |    2 | Geometry                                                   | direct, supporting |
| `M6.GM.005`  | Geometry/Measurement   |    2 | Measurement                                                | direct, supporting |
| `M6.GM.006`  | Geometry/Measurement   |    2 | Measurement                                                | direct             |
| `M6.GM.007`  | Geometry/Measurement   |    2 | Measurement                                                | direct, supporting |
| `M6.GM.008`  | Geometry/Measurement   |    2 | Measurement                                                | direct             |
| `M6.DH.001`  | Data Handling/Patterns |    2 | Data & Statistics                                          | supporting         |
| `M6.DH.002`  | Data Handling/Patterns |    2 | Data & Statistics                                          | direct, supporting |
| `M6.DH.003`  | Data Handling/Patterns |    2 | Data & Statistics                                          | supporting, direct |
| `M6.DH.004`  | Data Handling/Patterns |    2 | Data & Statistics                                          | supporting, direct |
| `M6.DH.005`  | Data Handling/Patterns |    2 | Data & Statistics, Mathematical Thinking                   | direct, supporting |
| `M6.DH.006`  | Data Handling/Patterns |    2 | Data & Statistics                                          | supporting, direct |
| `M6.DH.007`  | Data Handling/Patterns |    2 | Mathematical Thinking                                      | supporting, direct |
| `M6.DH.008`  | Data Handling/Patterns |    2 | Algebra                                                    | extension          |
| `M6.INT.001` | Integers               |    2 | Number Representation & Place Value                        | supporting, direct |
| `M6.INT.002` | Integers               |    2 | Number Representation & Place Value                        | direct, supporting |
| `M6.INT.003` | Integers               |    2 | Number Representation & Place Value                        | direct, supporting |
| `M6.INT.004` | Integers               |    2 | Number Representation & Place Value                        | direct, supporting |
| `M6.INT.005` | Integers               |    1 | Number Representation & Place Value                        | direct             |
| `M6.INT.006` | Integers               |    1 | Number Representation & Place Value                        | extension          |

Remaining useful Class 6 Mathematics gaps include Symmetry, Constructions, and
additional algebraic patterning cleanup.

## US And UK Framing

The primary US/UK curriculum anchors are:

- UK: National Curriculum in England, Key Stages 1 and 2.
- US: Common Core ELA, Common Core Math, NGSS K-5, NGSS Middle School, and C3
  Social Studies.

The repo also includes IB PYP PSPE as a broader international alignment source.

## Full Text Versus Codes Only

Some sources include full standard text. Others include only codes and keys
because their upstream licensing is more restrictive.

Full text is included for:

- `uk-nc-2013`
- `ccss-ela`
- `ccss-math`

Codes only:

- `ngss-k5`
- `ngss-ms`
- `c3-social-studies`
- `ib-pyp-pspe`
- `ncert-class6-math-2026-27`

Do not infer missing standard text from the codes-only files. If a product or
downstream dataset needs full text for those sources, rights clearance must be
handled outside this public release.
