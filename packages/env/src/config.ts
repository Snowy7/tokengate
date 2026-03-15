// ---------------------------------------------------------------------------
// Configuration — defineConfig for tokengate.config.ts
// ---------------------------------------------------------------------------

import type { EnvSchema, InferEnv } from "./schema.js";

export interface TokengateConfig<S extends EnvSchema = EnvSchema> {
  /** Project slug or ID */
  project?: string;
  /** Environment name — "development", "production", etc. */
  environment?: string;
  /** File path — ".env", ".env.local", etc. (default: ".env") */
  file?: string;
  /**
   * API URL for Tokengate cloud.
   * Default: reads from TOKENGATE_API_URL or "https://tokengate.dev"
   */
  apiUrl?: string;
  /** Schema definition for type-safe env vars */
  schema: S;
  /**
   * Behavior when validation fails:
   * - "throw": throw an error (default in production)
   * - "warn": log warnings, continue with defaults
   * - "silent": ignore errors
   */
  onError?: "throw" | "warn" | "silent";
  /**
   * Where to load env vars from (in order of priority):
   * - "cloud": Tokengate API (encrypted, decrypted locally)
   * - "file": Local .env files
   * - "process": process.env
   * Default: ["cloud", "file", "process"]
   */
  sources?: Array<"cloud" | "file" | "process" | "cache">;
  /**
   * Cache decrypted values locally for faster restarts.
   * Stored encrypted at .tokengate/cache/<env>.enc
   * Default: true
   */
  cache?: boolean;
  /**
   * Cache TTL in milliseconds. After this, re-fetch from cloud.
   * Default: 5 minutes (300_000)
   */
  cacheTtl?: number;
}

/**
 * Define a Tokengate env configuration. Use this in `tokengate.config.ts`.
 *
 * @example
 * ```ts
 * import { defineConfig } from '@tokengate/env'
 *
 * export default defineConfig({
 *   project: 'web',
 *   environment: 'production',
 *   schema: {
 *     DATABASE_URL: { type: 'string', required: true, sensitive: true },
 *     PORT: { type: 'port', default: 3000 },
 *     DEBUG: { type: 'boolean', default: false },
 *   }
 * })
 * ```
 */
export function defineConfig<S extends EnvSchema>(config: TokengateConfig<S>): TokengateConfig<S> {
  return {
    sources: ["cloud", "file", "process"],
    onError: process.env.NODE_ENV === "production" ? "throw" : "warn",
    cache: true,
    cacheTtl: 300_000,
    file: ".env",
    ...config,
  };
}

/** Resolved config with all defaults applied */
export type ResolvedConfig<S extends EnvSchema = EnvSchema> = Required<TokengateConfig<S>>;

export function resolveConfig<S extends EnvSchema>(config: TokengateConfig<S>): ResolvedConfig<S> {
  return {
    project: config.project ?? "",
    environment: process.env.TOKENGATE_ENV ?? config.environment ?? process.env.NODE_ENV ?? "development",
    file: config.file ?? ".env",
    apiUrl: config.apiUrl ?? process.env.TOKENGATE_API_URL ?? "https://tokengate.dev",
    schema: config.schema,
    onError: config.onError ?? (process.env.NODE_ENV === "production" ? "throw" : "warn"),
    sources: config.sources ?? ["cloud", "file", "process"],
    cache: config.cache ?? true,
    cacheTtl: config.cacheTtl ?? 300_000,
  };
}
