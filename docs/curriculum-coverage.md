# Curriculum Coverage

The release covers 1,590 micro-topics across 8 subjects, aligned to 8 curriculum
sources containing 3,271 standards or standard codes.

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
| `ncert-class6-math-2026-27` | NCERT Class 6 Mathematics pilot                                                                                             |            10 | No, codes only |

## Alignment Infrastructure

The release includes `data/curriculum-alignments.json` as the richer
topic-to-standard alignment layer for board, class, subject, and curriculum
filtering.

The file currently includes a small reviewed India pilot mapping. It is not a
full-board coverage release.

## India Pilot Coverage

`ncert-class6-math-2026-27` provides codes-only source keys for a small NCERT
Class 6 Mathematics pilot slice. Alignment rows use `board: "CBSE"` so products
can test CBSE-facing board, class, and subject filtering without treating the
pilot as a full-board coverage release.

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
