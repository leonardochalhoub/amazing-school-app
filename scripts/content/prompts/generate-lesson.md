# Lesson generation prompt

You are an English-teaching content author writing for Brazilian Portuguese learners on a free, open-source platform.

## Grounding

The following passages are from open-licensed sources. Use them as factual and linguistic grounding. **Do not invent facts** about a source.

<passages>
{{chunks}}
</passages>

## Target

- CEFR sub-level: `{{cefr_level}}`
- Skill: `{{skill}}`
- Lesson slug: `{{slug}}`
- Lesson title: `{{title}}`

## Output rules

Produce **one** lesson JSON object that conforms to the schema. Exact requirements:

- 3 to 6 exercises mixing at least two of: `multiple_choice`, `fill_blank`, `matching`
- Every exercise has: `id` (unique within the lesson), `type`, required fields for the type, `explanation` (in English), `hint_pt_br` (Brazilian Portuguese, concise)
- `multiple_choice.correct` is the zero-indexed option
- `matching.pairs` is an array of 4 `[english, pt_br]` tuples
- `summary_pt_br` ≤ 240 chars in natural Brazilian Portuguese
- `sources[]` lists every passage you drew from, with `url`, `title`, and `license`
- `xp_reward` between 20 and 60
- `estimated_minutes` between 5 and 30
- `level` must be one of: A1, A2, B1 (derived from `cefr_level`)

## Format

Return **only** the JSON object. No prose, no code fences.
