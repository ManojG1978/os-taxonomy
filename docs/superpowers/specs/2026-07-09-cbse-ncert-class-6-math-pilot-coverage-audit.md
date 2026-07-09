# CBSE/NCERT Class 6 Math Pilot Coverage Audit

This audit reviews the existing codes-only `ncert-class6-math-2026-27`
alignment rows. It must not include copied upstream textbook, syllabus,
exercise, exemplar, or standard text.

## Baseline

- Source keys: 10
- Alignment rows: 18
- Current strand: Number System
- Board metadata: CBSE
- Class metadata: 6
- Subject metadata: Mathematics

## Row-Level QA

| Source key                            | Topic ID        | Domain                              | Topic name                               | Match type   | QA status | QA note                                                                                  |
|---------------------------------------|-----------------|-------------------------------------|------------------------------------------|--------------|-----------|------------------------------------------------------------------------------------------|
| `ncert-class6-math-2026-27:M6.NS.001` | `mt_JwP9QFv6gQ` | Number Representation & Place Value | Reading and writing numbers (age 9+)     | `direct`     | pass      | Resolves to an existing Marble topic and fits the pilot strand.                          |
| `ncert-class6-math-2026-27:M6.NS.001` | `mt_xMt1TLTs--` | Number Representation & Place Value | Working with Large Numbers               | `direct`     | pass      | Resolves to an existing Marble topic and fits the pilot strand.                          |
| `ncert-class6-math-2026-27:M6.NS.002` | `mt_19j_5AuuQI` | Addition & Subtraction              | Numbers on a number line                 | `supporting` | pass      | Number-line support is plausible for the pilot.                                          |
| `ncert-class6-math-2026-27:M6.NS.003` | `mt_5NwqN6pf_A` | Number Representation & Place Value | Rounding Large Numbers                   | `direct`     | pass      | Resolves to an existing Marble topic and fits the pilot strand.                          |
| `ncert-class6-math-2026-27:M6.NS.003` | `mt_NLSfvB9vUl` | Number Representation & Place Value | Rounding to 10, 100, 1000                | `supporting` | pass      | Earlier rounding support is plausible for the pilot.                                     |
| `ncert-class6-math-2026-27:M6.NS.004` | `mt_nZkL5-XjRX` | Multiplication & Division           | Factor Pairs & Commutativity             | `direct`     | pass      | Resolves to an existing Marble topic and fits the pilot strand.                          |
| `ncert-class6-math-2026-27:M6.NS.004` | `mt_FHIAv6dfhU` | Multiplication & Division           | Factors, multiples, and primes           | `direct`     | pass      | Resolves to an existing Marble topic and fits the pilot strand.                          |
| `ncert-class6-math-2026-27:M6.NS.005` | `mt_IzQvs7k_sE` | Counting & Cardinality              | Skip Counting (4s, 8s, 50s, 100s)        | `supporting` | pass      | Multiples fluency support is plausible for the pilot.                                    |
| `ncert-class6-math-2026-27:M6.NS.005` | `mt_7rJM8eWUfw` | Counting & Cardinality              | Counting in 6s                           | `supporting` | pass      | Multiples fluency support is plausible for the pilot.                                    |
| `ncert-class6-math-2026-27:M6.NS.005` | `mt_2jbUekyTu4` | Mathematical Thinking               | Extending Table Patterns                 | `supporting` | pass      | Pattern support is plausible for multiples work.                                         |
| `ncert-class6-math-2026-27:M6.NS.006` | `mt_y1XCVsIelg` | Multiplication & Division           | Prime numbers                            | `direct`     | pass      | Resolves to an existing Marble topic and fits the pilot strand.                          |
| `ncert-class6-math-2026-27:M6.NS.006` | `mt_xfwv0M83mJ` | Mathematical Thinking               | Precise Maths Vocabulary                 | `supporting` | pass      | Vocabulary support is plausible for prime/composite language.                            |
| `ncert-class6-math-2026-27:M6.NS.007` | `mt_FHIAv6dfhU` | Multiplication & Division           | Factors, multiples, and primes           | `direct`     | pass      | Reuse is acceptable because the source key targets related factor/multiple coverage.     |
| `ncert-class6-math-2026-27:M6.NS.007` | `mt_xhoOWnhtHq` | Multiplication & Division           | Factors, multiples, and primes (age 11+) | `extension`  | pass      | Extension calibration is appropriate for later HCF, LCM, and factorisation continuity.   |
| `ncert-class6-math-2026-27:M6.NS.008` | `mt_p-nbe0w_lf` | Multiplication & Division           | Division with remainders                 | `supporting` | pass      | Remainder reasoning support is plausible for divisibility work.                          |
| `ncert-class6-math-2026-27:M6.NS.009` | `mt_QqG6IdmTSE` | Number Representation & Place Value | Place Value x 10 Pattern                 | `supporting` | pass      | Place-value pattern support is plausible for the pilot.                                  |
| `ncert-class6-math-2026-27:M6.NS.009` | `mt_hlGKg5M7qJ` | Mathematical Thinking               | Fractions, Decimals & Percentages        | `supporting` | pass      | Structural reasoning support is plausible, but should not be treated as direct coverage. |
| `ncert-class6-math-2026-27:M6.NS.010` | `mt_j5YqQnN6xe` | Mathematical Thinking               | Constructing mathematical arguments      | `supporting` | pass      | Reasoning support is plausible for explaining number-system work.                        |

## Coverage Findings

- The pilot is internally consistent as a small Number System slice, not a
  full-board coverage release.
- Direct rows are concentrated around whole-number place value, rounding,
  factors, multiples, primes, and common multiples.
- Supporting rows provide number-line, skip-counting, vocabulary, divisibility,
  place-value-pattern, and mathematical-argument scaffolding.
- One extension row intentionally reaches into a later factor/multiple topic for
  HCF, LCM, and prime-factorization continuity.

## Planned Gaps

- Geometry foundations remain unmapped.
- Perimeter and area measurement remain unmapped.
- Fractions remain unmapped.
- Data handling and presentation remain unmapped.
- Constructions remain unmapped.
- Symmetry remains unmapped.
- Integers and negative-number contexts remain unmapped.
- Broader patterning and algebraic generalisation remain unmapped.

## Recommendation

Use geometry and measurement as the next bounded slice with local source-key
prefix `M6.GM`. Keep the slice to 6-10 source keys and 12-25 alignment rows.
