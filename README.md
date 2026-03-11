# Tokengate.dev

Tokengate.dev is a hosted, zero-knowledge environment secret manager built as a Bun monorepo. The repository includes:

- `apps/web`: Next.js frontend intended for deployment on Vercel
- `apps/cli`: Bun-based CLI for local `.env` sync flows
- `packages/crypto`: shared browser/CLI cryptography primitives
- `packages/env-format`: `.env` parsing and normalization helpers
- `packages/sdk`: shared types and small client contracts
- `convex`: Convex schema and mutations/queries

## Stack

- Bun workspaces
- Next.js App Router
- Clerk auth
- Convex backend
- Shared zero-knowledge crypto between browser and CLI

## Quick start

```bash
bun install
bun test
bun run check
```

## Production setup

1. Create a Clerk JWT template named `convex`.
2. Set `CLERK_JWT_ISSUER_DOMAIN` to your Clerk issuer domain.
3. Set `NEXT_PUBLIC_CONVEX_URL` and `CONVEX_DEPLOYMENT` from your Convex deployment.
4. Deploy `apps/web` to Vercel and point the project root to this monorepo.
5. Run Convex separately with the same environment variables.
6. Set `TOKENGATE_VAULT_PASSPHRASE` when using the CLI so workspace keys are encrypted locally.

### Run the web app

```bash
bun run dev:web
```

### Run the CLI locally

```bash
bun run dev:cli -- status
```

### Run Convex

```bash
bun run dev:convex
```

## Required environment variables

See [`.env.example`](/home/islam/projects/env-sync/.env.example).

## Notes

- The shared crypto and env normalization code is implemented and tested.
- The web app and CLI both talk to the same Convex function contract.
- Clerk and Convex runtime wiring will work after the relevant project credentials are configured.
