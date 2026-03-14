# @tokengate/env-vite

[Tokengate](https://tokengate.dev) environment variable integration for **Vite**.

Encrypted, type-safe env vars injected at dev and build time.

## Install

```bash
npm install @tokengate/env-vite @tokengate/env
```

## Usage

```ts
// vite.config.ts
import { defineConfig } from 'vite'
import { tokengate } from '@tokengate/env-vite'

export default defineConfig({
  plugins: [
    tokengate({
      schema: {
        VITE_API_URL: { type: 'url', required: true },
        VITE_APP_NAME: { type: 'string', default: 'My App' },
        DATABASE_URL: { type: 'string', required: true, sensitive: true },
      }
    })
  ]
})
```

## How it works

- Variables prefixed with `VITE_` are injected into `import.meta.env` (client-safe)
- All variables are injected into `process.env` (server-side / SSR)
- Environment auto-detected from Vite's `mode` (`development`, `production`, etc.)
- Values fetched from Tokengate cloud, decrypted locally, validated against schema
- Falls back to `.env` files and `process.env`

## Options

```ts
tokengate(config, {
  clientPrefix: 'VITE_', // Prefix for client-exposed vars (default: "VITE_")
})
```

## License

MIT
