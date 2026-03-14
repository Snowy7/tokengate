// llms.txt — AI-friendly documentation index
// See: https://llmstxt.org

export async function GET() {
  const content = `# Tokengate

> End-to-end encrypted environment variable management for teams.

Tokengate provides a CLI, web dashboard, and TypeScript SDK for managing encrypted environment variables. Secrets are encrypted client-side with AES-256-GCM before leaving your machine — zero-knowledge architecture means even Tokengate servers cannot read your secrets.

## Docs

- [Full Documentation](https://tokengate.dev/llms-full.txt): Complete API reference and usage guide in plain text
- [SDK Reference](https://tokengate.dev/llms-full.txt#sdk): @tokengate/env TypeScript SDK
- [CLI Reference](https://tokengate.dev/llms-full.txt#cli): Command-line tool
- [Next.js Integration](https://tokengate.dev/llms-full.txt#nextjs): @tokengate/env-next
- [Vite Integration](https://tokengate.dev/llms-full.txt#vite): @tokengate/env-vite

## Packages

- @tokengate/env: Core SDK — type-safe env vars with schema validation
- @tokengate/env-next: Next.js plugin (withTokengate, getEnv)
- @tokengate/env-vite: Vite plugin
- @tokengate/cli: CLI tool (push, pull, scan, generate-types)
- @tokengate/crypto: E2E encryption primitives (AES-256-GCM, RSA-OAEP, PBKDF2)

## Links

- Website: https://tokengate.dev
- GitHub: https://github.com/Snowy7/tokengate
- npm: https://www.npmjs.com/org/tokengate
`;

  return new Response(content, {
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "cache-control": "public, max-age=3600",
    },
  });
}
