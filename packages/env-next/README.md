# @tokengate/env-next

[Tokengate](https://tokengate.dev) environment variable integration for **Next.js**.

Encrypted, type-safe env vars loaded at build time — no more `.env.local` files committed to git.

## Install

```bash
npm install @tokengate/env-next @tokengate/env
```

## Usage

### Option 1: Wrap your Next config

```ts
// next.config.ts
import { withTokengate } from '@tokengate/env-next'

export default withTokengate({
  schema: {
    DATABASE_URL: { type: 'string', required: true, sensitive: true },
    NEXT_PUBLIC_API_URL: { type: 'url', required: true },
    PORT: { type: 'port', default: 3000 },
  }
})
```

Variables prefixed with `NEXT_PUBLIC_` are automatically exposed to client-side code.

### Option 2: Server-side helper

```ts
// app/api/route.ts
import { getEnv } from '@tokengate/env-next'

const schema = {
  DATABASE_URL: { type: 'string' as const, required: true },
  API_SECRET: { type: 'string' as const, required: true, sensitive: true },
}

export async function GET() {
  const env = await getEnv({ schema })
  // env.DATABASE_URL — fully typed
}
```

### Option 3: Webpack plugin

```ts
// next.config.ts
import { tokengateWebpackPlugin } from '@tokengate/env-next'

export default {
  webpack(config) {
    config.plugins.push(tokengateWebpackPlugin({
      schema: { /* ... */ }
    }))
    return config
  }
}
```

## How it works

1. At build time, `withTokengate` calls `loadEnv()` from `@tokengate/env`
2. Variables are fetched from Tokengate cloud (encrypted) and decrypted locally
3. Falls back to `.env` files and `process.env` if cloud is unavailable
4. All values are validated against your schema
5. Type errors caught at build time, not runtime

## License

MIT
