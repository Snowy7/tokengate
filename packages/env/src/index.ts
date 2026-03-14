// ---------------------------------------------------------------------------
// @tokengate/env — Type-safe encrypted environment variables
// ---------------------------------------------------------------------------

export { defineConfig } from "./config";
export type { TokengateConfig, ResolvedConfig } from "./config";

export { validateEnv, parseValue, maskSensitive } from "./schema";
export type { EnvSchema, EnvVarSchema, EnvType, InferEnv, ValidationError } from "./schema";

export { loadEnv, EnvValidationError } from "./loader";
export type { LoadResult } from "./loader";

// ---------------------------------------------------------------------------
// Convenience: createEnv — one-shot define + load
// ---------------------------------------------------------------------------

import type { EnvSchema, InferEnv } from "./schema";
import type { TokengateConfig } from "./config";
import { defineConfig } from "./config";
import { loadEnv } from "./loader";

/**
 * All-in-one: define schema + load + validate in a single call.
 * Returns a typed, readonly env object.
 *
 * @example
 * ```ts
 * const env = await createEnv({
 *   schema: {
 *     DATABASE_URL: { type: 'string', required: true, sensitive: true },
 *     PORT: { type: 'port', default: 3000 },
 *     DEBUG: { type: 'boolean', default: false },
 *   }
 * })
 *
 * env.DATABASE_URL // string
 * env.PORT         // number
 * env.DEBUG        // boolean
 * ```
 */
export async function createEnv<S extends EnvSchema>(
  config: TokengateConfig<S>,
): Promise<Readonly<InferEnv<S>>> {
  const resolved = defineConfig(config);
  const result = await loadEnv(resolved);
  return Object.freeze(result.env);
}

/**
 * Synchronous version — only loads from process.env and .env files.
 * Useful for quick setup without cloud access.
 *
 * @example
 * ```ts
 * const env = createEnvSync({
 *   schema: {
 *     PORT: { type: 'port', default: 3000 },
 *     NODE_ENV: { type: 'enum', values: ['development', 'production', 'test'], default: 'development' },
 *   }
 * })
 * ```
 */
export function createEnvSync<S extends EnvSchema>(
  config: Omit<TokengateConfig<S>, "sources"> & { sources?: Array<"file" | "process"> },
): Readonly<InferEnv<S>> {
  const { existsSync, readFileSync } = require("node:fs");
  const { resolve } = require("node:path");
  const { parseEnvDocument } = require("@tokengate/env-format");
  const { validateEnv } = require("./schema");

  const resolved = {
    file: config.file ?? ".env",
    schema: config.schema,
    onError: config.onError ?? (process.env.NODE_ENV === "production" ? "throw" as const : "warn" as const),
    sources: config.sources ?? ["file" as const, "process" as const],
  };

  let raw: Record<string, string | undefined> = {};

  for (const src of resolved.sources) {
    if (src === "file") {
      const filePath = resolve(process.cwd(), resolved.file);
      if (existsSync(filePath)) {
        const content = readFileSync(filePath, "utf-8");
        const entries = parseEnvDocument(content);
        for (const entry of entries) {
          if (entry.key) raw[entry.key] = entry.value;
        }
      }
    } else if (src === "process") {
      for (const key of Object.keys(resolved.schema)) {
        if (process.env[key] !== undefined) {
          raw[key] = process.env[key];
        }
      }
    }
    if (Object.keys(raw).length > 0) break;
  }

  // process.env always overlays (higher priority)
  for (const key of Object.keys(resolved.schema)) {
    if (process.env[key] !== undefined) {
      raw[key] = process.env[key];
    }
  }

  const { env, errors } = validateEnv(raw, resolved.schema);

  if (errors.length > 0) {
    const message = errors.map((e: { key: string; message: string }) => `  ${e.key}: ${e.message}`).join("\n");
    if (resolved.onError === "throw") {
      throw new Error(`Environment validation failed:\n${message}`);
    } else if (resolved.onError === "warn") {
      console.warn(`[tokengate] Environment validation warnings:\n${message}`);
    }
  }

  return Object.freeze(env);
}
