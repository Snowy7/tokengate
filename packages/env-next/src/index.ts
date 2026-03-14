// ---------------------------------------------------------------------------
// @tokengate/env-next — Next.js integration
// ---------------------------------------------------------------------------

import type { EnvSchema, TokengateConfig, InferEnv } from "@tokengate/env";
import { loadEnv, defineConfig } from "@tokengate/env";

/**
 * Wrap your Next.js config with Tokengate to load encrypted env vars at build time.
 *
 * @example
 * ```ts
 * // next.config.ts
 * import { withTokengate } from '@tokengate/env-next'
 *
 * export default withTokengate({
 *   schema: {
 *     DATABASE_URL: { type: 'string', required: true, sensitive: true },
 *     NEXT_PUBLIC_API_URL: { type: 'url', required: true },
 *     PORT: { type: 'port', default: 3000 },
 *   }
 * })
 * ```
 */
export function withTokengate<S extends EnvSchema>(
  tokengateConfig: TokengateConfig<S>,
  nextConfig: Record<string, unknown> = {},
): Record<string, unknown> {
  const resolved = defineConfig(tokengateConfig);

  // Return a function that Next.js will call (supports async config)
  const originalEnv = (nextConfig.env ?? {}) as Record<string, string>;

  return {
    ...nextConfig,
    // Next.js calls this during build
    env: async () => {
      try {
        const result = await loadEnv(resolved);

        // Split into server-only and public (NEXT_PUBLIC_*) vars
        const envVars: Record<string, string> = { ...originalEnv };

        for (const [key, value] of Object.entries(result.env as Record<string, unknown>)) {
          if (value !== undefined && value !== null) {
            envVars[key] = String(value);
          }
        }

        console.log(
          `[tokengate] Loaded ${Object.keys(result.env as object).length} env vars from ${result.source} (${result.loadTime}ms)`,
        );

        return envVars;
      } catch (err) {
        console.error("[tokengate] Failed to load env vars:", err);
        return originalEnv;
      }
    },
  };
}

/**
 * Next.js webpack plugin that injects env vars via DefinePlugin.
 * Use this for more control than withTokengate().
 *
 * @example
 * ```ts
 * // next.config.ts
 * import { tokengateWebpackPlugin } from '@tokengate/env-next'
 *
 * export default {
 *   webpack(config) {
 *     config.plugins.push(tokengateWebpackPlugin({
 *       schema: { ... }
 *     }))
 *     return config
 *   }
 * }
 * ```
 */
export function tokengateWebpackPlugin<S extends EnvSchema>(
  tokengateConfig: TokengateConfig<S>,
) {
  const resolved = defineConfig(tokengateConfig);
  let envLoaded = false;
  let envCache: Record<string, unknown> = {};

  return {
    apply(compiler: { hooks: { beforeCompile: { tapPromise: (name: string, fn: () => Promise<void>) => void } }; options: { plugins: unknown[] } }) {
      compiler.hooks.beforeCompile.tapPromise("TokengateEnvPlugin", async () => {
        if (envLoaded) return;

        try {
          const result = await loadEnv(resolved);
          envCache = result.env as Record<string, unknown>;
          envLoaded = true;

          // Inject into process.env so Next.js picks them up
          for (const [key, value] of Object.entries(envCache)) {
            if (value !== undefined && value !== null) {
              process.env[key] = String(value);
            }
          }

          console.log(
            `[tokengate] Injected ${Object.keys(envCache).length} env vars from ${result.source}`,
          );
        } catch (err) {
          console.error("[tokengate] Plugin error:", err);
        }
      });
    },
  };
}

/**
 * Server-side helper: load env vars in a server component or API route.
 *
 * @example
 * ```ts
 * // app/api/route.ts
 * import { getEnv } from '@tokengate/env-next'
 *
 * const schema = {
 *   DATABASE_URL: { type: 'string' as const, required: true },
 * }
 *
 * export async function GET() {
 *   const env = await getEnv({ schema })
 *   // env.DATABASE_URL is typed
 * }
 * ```
 */
export async function getEnv<S extends EnvSchema>(
  config: TokengateConfig<S>,
): Promise<Readonly<InferEnv<S>>> {
  const resolved = defineConfig(config);
  const result = await loadEnv(resolved);
  return Object.freeze(result.env);
}

/**
 * Re-export core types for convenience.
 */
export { defineConfig } from "@tokengate/env";
export type { EnvSchema, EnvVarSchema, InferEnv, TokengateConfig } from "@tokengate/env";
