# Algophony Dashboard

Next.js dashboard prototype for browsing prompts, generations, reports, and benchmark scores.

**Status:** Placeholder — to be scaffolded during Phase 5 (Weeks 10–11).

## Planned Features

- Browse prompt corpus with filtering by category, difficulty, and evaluation focus.
- View all generations for one prompt.
- Play audio if local files exist.
- View report side-by-side with metadata.
- Compare model outputs for one prompt.
- Export JSONL, CSV, Markdown.

## Tech Stack

- Next.js + TypeScript + Tailwind
- Local JSON/JSONL data loading (no database in v0.1)
- No authentication in v0.1

## Routes

```text
/algophony
/algophony/atlas
/algophony/benchmark
/algophony/reports
/algophony/references
/algophony/collaborate
/dashboard/prompts
/dashboard/generations
/dashboard/reports
/dashboard/compare/[prompt_id]
/dashboard/export
```
