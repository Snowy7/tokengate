// Full plain-text documentation for AI consumption

export async function GET() {
  const content = `# Tokengate — Complete Documentation

End-to-end encrypted environment variable management.
Website: https://tokengate.dev
GitHub: https://github.com/Snowy7/tokengate

---

## Overview

Tokengate is a complete system for managing environment variables securely:
- CLI tool for push/pull of encrypted .env files
- Web dashboard for viewing/editing secrets
- TypeScript SDK for type-safe env var access
- Framework plugins for Next.js and Vite
- Zero-knowledge encryption — secrets encrypted client-side before upload

Architecture: Convex backend, Clerk authentication, AES-256-GCM encryption with per-environment password-derived keys (PBKDF2, 300k iterations).

---

## Installation

### CLI
\`\`\`bash
npm install -g @tokengate/cli
# or
bunx tokengate
\`\`\`

### SDK
\`\`\`bash
npm install @tokengate/env
\`\`\`

### Next.js
\`\`\`bash
npm install @tokengate/env-next @tokengate/env
\`\`\`

### Vite
\`\`\`bash
npm install @tokengate/env-vite @tokengate/env
\`\`\`

---

#cli
## CLI Commands

### tokengate login [label]
Authenticate via browser. Registers a device keypair (RSA-2048).

### tokengate init
Interactive setup wizard:
1. Select or create workspace
2. Select or create project
3. Select or create environment (sets encryption password)
4. Scans for .env files and links them
5. Saves .tokengate.json (commit this to git)

### tokengate push
Scans .env files, shows status (changed/synced/new/unmapped), encrypts and uploads.
- Asks to link unmapped files
- Shows per-file status before push
- Detects conflicts via revision numbers

### tokengate pull
Fetches latest encrypted revisions, decrypts locally, writes to disk.
- Warns before overwriting local files
- Auto-discovers remote files if no local mappings

### tokengate history
Shows revision history for mapped files with timestamps and content hashes.

### tokengate scan
Scans codebase for hardcoded secret values:
- Reads all mapped .env files, extracts values >= 8 chars
- Searches .ts, .js, .py, .go, .yaml, .json, .sh, etc.
- Reports file:line:column with snippet
- Exits with code 1 if leaks found (CI-friendly)

### tokengate generate-types
Reads tokengate.config.ts, outputs:
- env.d.ts — TypeScript declarations
- .env.example — Template with types and defaults

### tokengate status
Shows current configuration, device info, project mappings.

### tokengate workspaces
Lists all workspaces the user belongs to.

### tokengate logout
Clears stored credentials.

---

#sdk
## SDK — @tokengate/env

### createEnv(config) → Promise<env>

Async. Loads from cloud → file → process.env (configurable order).

\`\`\`typescript
import { createEnv } from '@tokengate/env'

const env = await createEnv({
  schema: {
    DATABASE_URL:    { type: 'string', required: true, sensitive: true },
    API_KEY:         { type: 'string', required: true, sensitive: true },
    PORT:            { type: 'port', default: 3000 },
    DEBUG:           { type: 'boolean', default: false },
    ALLOWED_ORIGINS: { type: 'string[]', separator: ',' },
    LOG_LEVEL:       { type: 'enum', values: ['debug','info','warn','error'], default: 'info' },
  }
})

env.DATABASE_URL  // string
env.PORT          // number
env.DEBUG         // boolean
env.LOG_LEVEL     // "debug" | "info" | "warn" | "error"
\`\`\`

### createEnvSync(config) → env

Synchronous. Only loads from file + process.env.

\`\`\`typescript
import { createEnvSync } from '@tokengate/env'

const env = createEnvSync({
  schema: {
    PORT: { type: 'port', default: 3000 },
    NODE_ENV: { type: 'enum', values: ['development','production','test'], default: 'development' },
  }
})
\`\`\`

### defineConfig(config) → config

Creates a config object for tokengate.config.ts:

\`\`\`typescript
import { defineConfig } from '@tokengate/env'

export default defineConfig({
  project: 'web',
  environment: 'production',
  sources: ['cloud', 'file', 'process'],
  cache: true,
  cacheTtl: 300_000,
  onError: 'throw', // 'throw' | 'warn' | 'silent'
  schema: { /* ... */ }
})
\`\`\`

### Schema Types

| Type      | TypeScript | Parses from         |
|-----------|-----------|---------------------|
| string    | string    | Any string          |
| number    | number    | "42" → 42           |
| boolean   | boolean   | "true"/"1"/"yes"    |
| string[]  | string[]  | "a,b,c" (separator) |
| number[]  | number[]  | "1,2,3" (separator) |
| url       | string    | Validated URL       |
| email     | string    | Validated email     |
| port      | number    | 0–65535             |
| enum      | string    | One of values[]     |

### Schema Options

- type: string (required)
- required: boolean (default: true unless default is set)
- default: value (makes field optional)
- sensitive: boolean (masked in logs)
- description: string (for generated docs)
- values: string[] (for enum type)
- separator: string (for array types, default: ",")
- validate: (value) => boolean | string (custom validation)

### validateEnv(raw, schema) → { env, errors }

Low-level validation without loading:

\`\`\`typescript
import { validateEnv } from '@tokengate/env'

const { env, errors } = validateEnv(process.env, schema)
\`\`\`

### maskSensitive(env, schema) → Record<string, string>

Masks sensitive values for safe logging.

---

#nextjs
## Next.js — @tokengate/env-next

### withTokengate(config, nextConfig?) → nextConfig

Wraps next.config to load env vars at build time:

\`\`\`typescript
import { withTokengate } from '@tokengate/env-next'

export default withTokengate({
  schema: {
    DATABASE_URL: { type: 'string', required: true, sensitive: true },
    NEXT_PUBLIC_API_URL: { type: 'url', required: true },
  }
})
\`\`\`

NEXT_PUBLIC_* variables are auto-exposed to client code.

### getEnv(config) → Promise<env>

Server-side helper for API routes / server components:

\`\`\`typescript
import { getEnv } from '@tokengate/env-next'

export async function GET() {
  const env = await getEnv({ schema: { DATABASE_URL: { type: 'string', required: true } } })
}
\`\`\`

### tokengateWebpackPlugin(config)

Webpack plugin for manual integration.

---

#vite
## Vite — @tokengate/env-vite

### tokengate(config, options?) → VitePlugin

\`\`\`typescript
import { defineConfig } from 'vite'
import { tokengate } from '@tokengate/env-vite'

export default defineConfig({
  plugins: [
    tokengate({
      schema: {
        VITE_API_URL: { type: 'url', required: true },
        DATABASE_URL: { type: 'string', required: true, sensitive: true },
      }
    })
  ]
})
\`\`\`

- VITE_* vars → import.meta.env (client)
- All vars → process.env (server/SSR)
- Auto-detects environment from Vite mode

Options:
- clientPrefix: string (default: "VITE_")

---

## Encryption

- Algorithm: AES-256-GCM with random IV per revision
- Key derivation: PBKDF2 with SHA-256, 300,000 iterations, random salt per environment
- Key wrapping: AES-KW wraps per-revision data keys
- Device keys: RSA-OAEP 2048-bit for workspace key distribution
- Zero knowledge: Server stores only ciphertext, never sees plaintext or passwords

---

## Environment Variables

- TOKENGATE_PASSWORD: Environment password for cloud decryption (used by SDK)
- TOKENGATE_APP_URL: Override app URL (default: https://tokengate.dev)
- TOKENGATE_API_URL: Override API URL

---

## npm Packages

- @tokengate/env (v0.1.0): Core SDK
- @tokengate/env-next (v0.1.0): Next.js plugin
- @tokengate/env-vite (v0.1.0): Vite plugin
- @tokengate/cli (v0.2.5): CLI tool
- @tokengate/crypto (v0.2.5): Encryption primitives
- @tokengate/env-format (v0.2.5): .env file parser
`;

  return new Response(content, {
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "cache-control": "public, max-age=3600",
    },
  });
}
