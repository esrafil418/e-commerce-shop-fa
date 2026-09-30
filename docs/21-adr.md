# 21. Architecture decision records

Status: process is active. Five decisions are accepted as the baseline.

## Purpose

Explain how architectural decisions are recorded and list the ones already made. The records themselves live in [adr/](adr/).

## Architecture decisions

ADRs are the durable reason behind a choice. Numbered docs describe how to build. If they conflict, the newer ADR wins, and the numbered doc should be updated in the same change.

Accepted baseline:

| ADR | Title |
| --- | --- |
| [0001](adr/0001-architecture.md) | Modular monolith on Next.js and Supabase |
| [0002](adr/0002-database.md) | PostgreSQL model, rials, and transactional checkout |
| [0003](adr/0003-state-management.md) | Where state is allowed to live |
| [0004](adr/0004-media-storage.md) | Cloudinary for media bytes |
| [0005](adr/0005-testing-strategy.md) | Vitest, Testing Library, Playwright, SQL integration |

## Important concepts

**Accepted.** The current rule.

**Superseded.** Kept for history. The replacement ADR links to it.

**Proposed.** Open question. Not a rule yet. Prefer resolving open questions in the roadmap rather than parking them as half-ADRs. An ADR is written when a decision is actually made.

## Implementation details

### When to write one

- A new runtime, datastore, or third-party that stores business data.
- A change to money representation, auth, or the pricing location.
- A new global client state mechanism.
- Dropping or replacing a test layer.

### When not to

- A new feature inside the existing boundaries.
- A component, a column that matches the current model, or a copy change.

### Template

```text
# NNNN. Title

- Status: Accepted | Superseded by NNNN
- Date: YYYY-MM-DD

## Purpose
## Context
## Decision
## Consequences
## Alternatives considered
## Implementation details
## Relevant file paths
## Environment variables
## Commands
## Security notes
## Common mistakes
## Testing strategy
## Future extension points
```

File name: `docs/adr/0006-short-title.md`. Do not renumber old files.

## Relevant file paths

```text
docs/adr/0001-architecture.md
docs/adr/0002-database.md
docs/adr/0003-state-management.md
docs/adr/0004-media-storage.md
docs/adr/0005-testing-strategy.md
```

## Environment variables

None for the ADR process.

## Commands

None. ADRs are markdown.

## Security notes

ADRs must not include secret values, customer data, or production URLs that embed credentials. They may name environment variable keys.

## Common mistakes

- Changing direction in a feature PR and leaving the old ADR as if it were still true.
- An ADR that is only a library advertisement with no alternatives.
- Duplicating a 20-page design into the ADR. Put the design in the numbered doc and the decision in the ADR.

## Testing strategy

There is no automated ADR test. Reviewers check that a boundary-changing PR links an ADR.

## Future extension points

Decisions already expected to need their own ADR when they stop being deferred:

- The live payment provider.
- A search engine other than Postgres.
- A second locale and an i18n library.
- Introducing Redis or a queue.
- Splitting admin into another deployable.
