# @tokengate/env

Type-safe, encrypted environment variables from [Tokengate](https://tokengate.dev) cloud.

Stop leaking secrets. Stop sharing `.env` files over Slack. Define your schema once, get type-safe access everywhere, encrypted end-to-end.

## Install

```bash
npm install @tokengate/env
# or
bun add @tokengate/env
```

## Quick Start

```ts
import { createEnv } from '@tokengate/env'

const env = await createEnv({
  schema: {
    DATABASE_URL:    { type: 'string', required: true, sensitive: true },
    API_KEY:         { type: 'string', required: true, sensitive: true },
    PORT:            { type: 'port', default: 3000 },
    DEBUG:           { type: 'boolean', default: false },
    ALLOWED_ORIGINS: { type: 'string[]', separator: ',' },
    LOG_LEVEL:       { type: 'enum', values: ['debug', 'info', 'warn', 'error'], default: 'info' },
  }
})

env.DATABASE_URL  // string (guaranteed present)
env.PORT          // number (parsed from string)
env.DEBUG         // boolean (parsed from "true"/"false"/"1"/"0")
env.LOG_LEVEL     // "debug" | "info" | "warn" | "error"
```

## Sync Version

For cases where async isn't available (e.g. config files):

```ts
import { createEnvSync } from '@tokengate/env'

const env = createEnvSync({
  schema: {
    PORT: { type: 'port', default: 3000 },
    NODE_ENV: { type: 'enum', values: ['development', 'production', 'test'], default: 'development' },
  }
})
```

## Schema Types

| Type | Parses to | Example value |
|------|-----------|---------------|
| `string` | `string` | `"hello"` |
| `number` | `number` | `"42"` → `42` |
| `boolean` | `boolean` | `"true"` → `true`, `"1"` → `true` |
| `string[]` | `string[]` | `"a,b,c"` → `["a","b","c"]` |
| `number[]` | `number[]` | `"1,2,3"` → `[1,2,3]` |
| `url` | `string` | Validated URL |
| `email` | `string` | Validated email |
| `port` | `number` | `0–65535` |
| `enum` | `string` | One of `values` |

## Schema Options

```ts
{
  type: 'string',       // Required: the type to parse as
  required: true,       // Default: true (false if default is set)
  default: 'fallback',  // Default value when not present
  sensitive: true,      // Mask in logs/debug output
  description: '...',   // Shown in generated docs
  values: ['a', 'b'],   // For enum type: allowed values
  separator: ',',       // For array types: split character
  validate: (v) => ..., // Custom validation function
}
```

## Config File

Create `tokengate.config.ts` in your project root:

```ts
import { defineConfig } from '@tokengate/env'

export default defineConfig({
  project: 'web',
  environment: 'production',
  sources: ['cloud', 'file', 'process'], // Priority order
  cache: true,                            // Cache decrypted values locally
  cacheTtl: 300_000,                      // 5 minutes
  onError: 'throw',                       // 'throw' | 'warn' | 'silent'
  schema: {
    // ...
  }
})
```

## Sources

Variables are loaded from these sources in priority order:

1. **`cloud`** — Tokengate API (encrypted, decrypted locally with `TOKENGATE_PASSWORD`)
2. **`file`** — Local `.env` file
3. **`process`** — `process.env`

The first source that returns values wins. `process.env` always overlays on top.

## Generate Types

```bash
tokengate generate-types
```

Outputs:
- `env.d.ts` — TypeScript declarations
- `.env.example` — Template with types and defaults

## Scan for Leaks

```bash
tokengate scan
```

Scans your codebase for hardcoded secret values found in your `.env` files.

## Framework Integrations

- [`@tokengate/env-next`](https://www.npmjs.com/package/@tokengate/env-next) — Next.js
- [`@tokengate/env-vite`](https://www.npmjs.com/package/@tokengate/env-vite) — Vite

## License

MIT
