// ---------------------------------------------------------------------------
// @tokengate/env-vite — Vite integration
// ---------------------------------------------------------------------------

import type { EnvSchema, TokengateConfig } from "@tokengate/env";
import { loadEnv, defineConfig } from "@tokengate/env";

interface VitePlugin {
  name: string;
  config: (config: Record<string, unknown>, env: { mode: string; command: string }) => Promise<Record<string, unknown>>;
  configResolved?: (config: Record<string, unknown>) => void;
}

/**
 * Vite plugin that loads Tokengate env vars and injects them
 * via Vite's define/env system.
 *
 * @example
 * ```ts
 * // vite.config.ts
 * import { defineConfig } from 'vite'
 * import { tokengate } from '@tokengate/env-vite'
 *
 * export default defineConfig({
 *   plugins: [
 *     tokengate({
 *       schema: {
 *         VITE_API_URL: { type: 'url', required: true },
 *         VITE_APP_NAME: { type: 'string', default: 'My App' },
 *         DATABASE_URL: { type: 'string', required: true, sensitive: true },
 *       }
 *     })
 *   ]
 * })
 * ```
 *
 * Variables prefixed with `VITE_` are exposed to client code via `import.meta.env`.
 * All others are server-only (available in `process.env` during SSR/build).
 */
export function tokengate<S extends EnvSchema>(
  tokengateConfig: TokengateConfig<S>,
  options?: {
    /** Prefix for client-exposed variables (default: "VITE_") */
    clientPrefix?: string;
  },
): VitePlugin {
  const clientPrefix = options?.clientPrefix ?? "VITE_";
  let loaded = false;
  let envResult: Record<string, unknown> = {};

  return {
    name: "tokengate-env",

    async config(_config, { mode }) {
      if (loaded) return {};

      // Auto-detect environment from Vite mode
      const resolved = defineConfig({
        ...tokengateConfig,
        environment: tokengateConfig.environment ?? mode,
      });

      try {
        const result = await loadEnv(resolved);
        envResult = result.env as Record<string, unknown>;
        loaded = true;

        // Split into define (client) and env (server)
        const define: Record<string, string> = {};
        const envOverrides: Record<string, string> = {};

        for (const [key, value] of Object.entries(envResult)) {
          if (value === undefined || value === null) continue;
          const strVal = JSON.stringify(value);

          // Client-exposed vars go into define
          if (key.startsWith(clientPrefix)) {
            define[`import.meta.env.${key}`] = strVal;
          }

          // All vars go into process.env for server-side
          envOverrides[key] = String(value);
          process.env[key] = String(value);
        }

        console.log(
          `[tokengate] Loaded ${Object.keys(envResult).length} env vars from ${result.source} (${result.loadTime}ms)`,
        );

        return { define };
      } catch (err) {
        console.error("[tokengate] Failed to load env vars:", err);
        return {};
      }
    },
  };
}

/**
 * Re-export core types for convenience.
 */
export { defineConfig } from "@tokengate/env";
export type { EnvSchema, EnvVarSchema, InferEnv, TokengateConfig } from "@tokengate/env";
