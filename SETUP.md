# Aegis — Setup

Aegis is a single-process Next.js 14 application. There is no separate API server, no Docker Compose, and no microservices — `npm run dev` starts the whole thing, including a local SQLite database that is created and migrated automatically on first boot.

## Prerequisites

- Node.js 20+ (Node 22 is what this build was verified against)
- An Anthropic API key (only required to run the Agentic Layer at `/agents` — every other module works fully without one)

## Install & run

```bash
npm install
cp .env.local.example .env.local   # then edit .env.local and set ANTHROPIC_API_KEY
npm run dev
```

Open http://localhost:3000 — you will land on the login screen. Pick any of the 8 demo personas and click **Fast login** (no password). Click **Regenerate demo data** at any time to wipe and re-seed the 10-system demo portfolio with fresh specifics.

## Environment variables

Create `.env.local` in the project root:

```
ANTHROPIC_API_KEY=sk-ant-...
```

If this is not set, every module works except the Agentic Layer (`/agents`), which will show a clear "not configured" message instead of a crash when you try to run an agent.

## Database

SQLite file at `./data/aegis.db` (WAL mode, foreign keys enforced). It is created and migrated automatically on first request — nothing to run manually. Delete the file (and its `-wal`/`-shm` siblings) to force a completely clean re-seed on next boot.

## Production build

```bash
npm run build
npm run start
```

## What's out of scope for this reference build

Declared explicitly in-app wherever relevant (never silently faked): SMTP email delivery, SSO/IdP federation, qualified electronic signatures, a live connection to the real EU database for high-risk AI systems, and a live connection to a real notified-body system. Authorised-representative, importer, and distributor obligations (Art. 22-24) are modeled as not-applicable to Eurobank with a stated rationale, since Eurobank is EU-established and deploys vendor systems internally rather than importing/distributing third-party systems.
