# Aegis — EU AI Act Compliance & Governance Platform

A single-pane-of-glass reference implementation of Regulation (EU) 2024/1689 compliance and governance workflows, built for a fictional systemic Italian bank, **Eurobank Capital SpA**, modeled as both a Provider and a Deployer under the Act — sometimes for the same AI system at once.

Not a certified compliance tool. Not legal advice. See `/help/regulatory-context` in the running app.

## Quick start

See `SETUP.md`.

## What this is

- Next.js 14 (App Router) + TypeScript, single process, no external services.
- `better-sqlite3` database, schema + demo data auto-applied on boot.
- Real Anthropic tool-use loop agents (9 of them) behind a human-approval gate — nothing is written to an operational table until a person clicks Approve.
- A dual regulatory timeline (original Regulation (EU) 2024/1689 vs. the Digital Omnibus on AI's agreed-but-unpublished text), toggleable live across every date-driven screen.
- Eight fast-login personas, each with a permission-matrix-enforced dashboard.

## Where things live

- `lib/db/schema.ts` — the full data model.
- `lib/demo-data/` — the seeded 10-system demo portfolio and its generator.
- `lib/ai/` — agent definitions and the tool-use runner.
- `app/(app)/` — every authenticated module, grouped to match the obligation families in the Act (Provider suite, Deployer suite, cross-cutting operations, assurance).
- `app/(app)/help/` — in-app documentation, including the Archer portability appendix.
