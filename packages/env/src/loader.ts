// ---------------------------------------------------------------------------
// Loader — fetch from cloud, file, or process.env, decrypt, validate
// ---------------------------------------------------------------------------

import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { resolve, dirname, join } from "node:path";
import { parseEnvDocument } from "@tokengate/env-format";
import { decryptRevisionPayload, deriveEnvironmentKey, encryptVaultPayload, decryptVaultPayload } from "@tokengate/crypto";
import type { EnvSchema, InferEnv, ValidationError } from "./schema";
import { validateEnv, maskSensitive } from "./schema";
import type { ResolvedConfig } from "./config";
import { resolveConfig, type TokengateConfig } from "./config";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface LoadResult<S extends EnvSchema> {
  /** Parsed and validated env object */
  env: InferEnv<S>;
  /** Validation errors (empty if all good) */
  errors: ValidationError[];
  /** Which source the values came from */
  source: "cloud" | "file" | "process" | "cache";
  /** Time taken to load in ms */
  loadTime: number;
}

interface CloudPayload {
  ciphertext: string;
  wrappedDataKey: string;
  contentHash: string;
  keySalt: string;
}

interface EnvFileMapping {
  secretSetId: string;
  environmentId: string;
  environmentName: string;
}

interface LocalProjectConfig {
  workspaceId: string;
  projectId: string;
  environmentId?: string;
  environmentName?: string;
  mappings: Record<string, EnvFileMapping>;
  /** Multi-environment mappings: envName → { filePath → mapping } */
  environments?: Record<string, Record<string, EnvFileMapping>>;
}

interface CliConfig {
  appUrl?: string;
  apiUrl?: string;
  convexUrl?: string;
  accessToken?: string;
  privateKey?: JsonWebKey;
  publicKey?: JsonWebKey;
}

// ---------------------------------------------------------------------------
// In-memory cache — avoids hitting Convex on every request
// ---------------------------------------------------------------------------

interface MemCacheEntry {
  raw: Record<string, string>;
  source: string;
  expiresAt: number;
}

const memCache = new Map<string, MemCacheEntry>();

function getMemCacheKey<S extends EnvSchema>(config: ResolvedConfig<S>): string {
  return `${config.environment}:${config.file}`;
}

// ---------------------------------------------------------------------------
// Main loader
// ---------------------------------------------------------------------------

/**
 * Load environment variables from configured sources.
 * Tries each source in order until one succeeds.
 * Results are cached in-memory for `cacheTtl` ms (default 5 min).
 */
export async function loadEnv<S extends EnvSchema>(config: TokengateConfig<S>): Promise<LoadResult<S>> {
  const resolved = resolveConfig(config);
  const start = Date.now();

  // Check in-memory cache first
  if (resolved.cache) {
    const cacheKey = getMemCacheKey(resolved);
    const cached = memCache.get(cacheKey);
    if (cached && Date.now() < cached.expiresAt) {
      const { env, errors } = validateEnv(cached.raw, resolved.schema);
      return { env, errors, source: cached.source as LoadResult<S>["source"], loadTime: Date.now() - start };
    }
  }

  let raw: Record<string, string | undefined> = {};
  let source: LoadResult<S>["source"] = "process";

  for (const src of resolved.sources) {
    try {
      switch (src) {
        case "cache": {
          const cached = loadFromCache(resolved);
          if (cached) {
            raw = cached;
            source = "cache";
          }
          break;
        }
        case "cloud": {
          const cloud = await loadFromCloud(resolved);
          if (cloud) {
            raw = cloud;
            source = "cloud";
            // Save to file cache for cold starts
            if (resolved.cache) {
              saveToCache(resolved, cloud);
            }
          }
          break;
        }
        case "file": {
          const file = loadFromFile(resolved);
          if (file) {
            raw = file;
            source = "file";
          }
          break;
        }
        case "process": {
          raw = loadFromProcess(resolved);
          source = "process";
          break;
        }
      }
      // If we got values, stop trying other sources
      if (Object.keys(raw).length > 0) break;
    } catch (err) {
      // Continue to next source
      if (resolved.onError === "warn") {
        console.warn(`[tokengate] Failed to load from ${src}:`, err instanceof Error ? err.message : err);
      }
    }
  }

  // Validate against schema
  const { env, errors } = validateEnv(raw, resolved.schema);
  const loadTime = Date.now() - start;

  // Handle errors based on config
  if (errors.length > 0) {
    const message = errors.map((e) => `  ${e.key}: ${e.message}`).join("\n");
    switch (resolved.onError) {
      case "throw":
        throw new EnvValidationError(errors, `Environment validation failed:\n${message}`);
      case "warn":
        console.warn(`[tokengate] Environment validation warnings:\n${message}`);
        break;
      case "silent":
        break;
    }
  }

  // Store in memory cache
  if (resolved.cache && Object.keys(raw).length > 0) {
    const cacheKey = getMemCacheKey(resolved);
    const cleanRaw: Record<string, string> = {};
    for (const [k, v] of Object.entries(raw)) {
      if (v !== undefined) cleanRaw[k] = v;
    }
    memCache.set(cacheKey, {
      raw: cleanRaw,
      source,
      expiresAt: Date.now() + resolved.cacheTtl,
    });
  }

  return { env, errors, source, loadTime };
}

/**
 * Clear the in-memory cache. Useful for testing or forcing a refresh.
 */
export function clearCache() {
  memCache.clear();
}

// ---------------------------------------------------------------------------
// Source: Local .env file
// ---------------------------------------------------------------------------

function loadFromFile<S extends EnvSchema>(config: ResolvedConfig<S>): Record<string, string> | null {
  const filePath = resolve(process.cwd(), config.file);
  if (!existsSync(filePath)) return null;

  const content = readFileSync(filePath, "utf-8");
  const entries = parseEnvDocument(content);
  const env: Record<string, string> = {};

  for (const entry of entries) {
    if (entry.key) {
      env[entry.key] = entry.value;
    }
  }

  return Object.keys(env).length > 0 ? env : null;
}

// ---------------------------------------------------------------------------
// Source: process.env
// ---------------------------------------------------------------------------

function loadFromProcess<S extends EnvSchema>(config: ResolvedConfig<S>): Record<string, string | undefined> {
  const env: Record<string, string | undefined> = {};
  for (const key of Object.keys(config.schema)) {
    env[key] = process.env[key];
  }
  return env;
}

// ---------------------------------------------------------------------------
// Source: Tokengate cloud
// ---------------------------------------------------------------------------

async function loadFromCloud<S extends EnvSchema>(config: ResolvedConfig<S>): Promise<Record<string, string> | null> {
  // Read local tokengate config to get IDs + credentials
  const localConfig = readLocalConfig();
  if (!localConfig) return null;

  const cliConfig = readCliConfig();
  if (!cliConfig?.accessToken || !cliConfig?.convexUrl) return null;

  // Resolve environment: TOKENGATE_ENV > config.environment > .tokengate.json > NODE_ENV > "development"
  const targetEnv = process.env.TOKENGATE_ENV
    ?? config.environment
    ?? localConfig.environmentName
    ?? process.env.NODE_ENV
    ?? "development";

  // Find the mapping for the requested file + environment
  // 1. Try multi-env mappings first (environments.production[".env"])
  // 2. Fall back to flat mappings if env name matches or no multi-env
  let mapping: EnvFileMapping | undefined;

  if (localConfig.environments?.[targetEnv]) {
    mapping = localConfig.environments[targetEnv][config.file];
  }

  if (!mapping) {
    // Fall back to flat mappings if the target env matches the stored env
    const flatMapping = localConfig.mappings[config.file];
    if (flatMapping && (!targetEnv || flatMapping.environmentName === targetEnv || targetEnv === localConfig.environmentName)) {
      mapping = flatMapping;
    } else if (flatMapping) {
      // Env mismatch — flat mappings are for a different env
      // Still use them as last resort (backward compat)
      mapping = flatMapping;
    }
  }

  if (!mapping) return null;

  // Fetch the latest revision from Convex
  const payload = await fetchLatestRevision(
    cliConfig.convexUrl,
    cliConfig.accessToken,
    mapping.secretSetId,
  );
  if (!payload) return null;

  // We need the environment password to decrypt
  // Check for TOKENGATE_PASSWORD in process.env or prompt
  const password = process.env.TOKENGATE_PASSWORD ?? process.env.TOKENGATE_VAULT_PASSPHRASE;
  if (!password) {
    throw new Error(
      "TOKENGATE_PASSWORD environment variable is required to decrypt secrets from cloud. " +
      "Set it in your shell or CI/CD pipeline."
    );
  }

  // Derive the env key and decrypt
  const envKey = await deriveEnvironmentKey(password, payload.keySalt);
  const plaintext = await decryptRevisionPayload(
    {
      ciphertext: payload.ciphertext,
      wrappedDataKey: payload.wrappedDataKey,
      contentHash: payload.contentHash,
    },
    envKey,
  );

  // Parse the decrypted .env content
  const entries = parseEnvDocument(plaintext);
  const env: Record<string, string> = {};
  for (const entry of entries) {
    if (entry.key) {
      env[entry.key] = entry.value;
    }
  }

  return Object.keys(env).length > 0 ? env : null;
}

async function fetchLatestRevision(
  convexUrl: string,
  token: string,
  secretSetId: string,
): Promise<CloudPayload | null> {
  // First get the secret set to get keySalt
  const ssResponse = await fetch(`${convexUrl}/api/query`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      path: "workspaces:getSecretSetById",
      format: "convex_encoded_json",
      args: [{ secretSetId }],
    }),
  });

  if (!ssResponse.ok) return null;
  const ssPayload = await ssResponse.json() as { status: string; value: { keySalt: string } | null };
  if (ssPayload.status !== "success" || !ssPayload.value) return null;
  const keySalt = ssPayload.value.keySalt;

  // Then get the latest revision
  const revResponse = await fetch(`${convexUrl}/api/query`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      path: "revisions:getLatestRevision",
      format: "convex_encoded_json",
      args: [{ secretSetId }],
    }),
  });

  if (!revResponse.ok) return null;
  const revPayload = await revResponse.json() as {
    status: string;
    value: { ciphertext: string; wrappedDataKey: string; contentHash: string } | null;
  };
  if (revPayload.status !== "success" || !revPayload.value) return null;

  return {
    ciphertext: revPayload.value.ciphertext,
    wrappedDataKey: revPayload.value.wrappedDataKey,
    contentHash: revPayload.value.contentHash,
    keySalt,
  };
}

// ---------------------------------------------------------------------------
// Source: Local cache
// ---------------------------------------------------------------------------

const CACHE_DIR = ".tokengate/cache";

function getCachePath<S extends EnvSchema>(config: ResolvedConfig<S>): string {
  return join(process.cwd(), CACHE_DIR, `${config.environment}-${config.file.replace(/\//g, "_")}.json`);
}

function loadFromCache<S extends EnvSchema>(config: ResolvedConfig<S>): Record<string, string> | null {
  if (!config.cache) return null;

  const cachePath = getCachePath(config);
  if (!existsSync(cachePath)) return null;

  try {
    const raw = JSON.parse(readFileSync(cachePath, "utf-8"));
    if (raw.expiresAt && Date.now() > raw.expiresAt) {
      return null; // Cache expired
    }
    return raw.env ?? null;
  } catch {
    return null;
  }
}

function saveToCache<S extends EnvSchema>(config: ResolvedConfig<S>, env: Record<string, string>): void {
  const cachePath = getCachePath(config);
  try {
    mkdirSync(dirname(cachePath), { recursive: true });
    writeFileSync(cachePath, JSON.stringify({
      env,
      createdAt: Date.now(),
      expiresAt: Date.now() + config.cacheTtl,
      environment: config.environment,
      file: config.file,
    }, null, 2));
  } catch {
    // Cache write failure is non-fatal
  }
}

// ---------------------------------------------------------------------------
// Config file readers
// ---------------------------------------------------------------------------

function readLocalConfig(): LocalProjectConfig | null {
  const configPath = resolve(process.cwd(), ".tokengate.json");
  if (!existsSync(configPath)) return null;
  try {
    return JSON.parse(readFileSync(configPath, "utf-8"));
  } catch {
    return null;
  }
}

function readCliConfig(): CliConfig | null {
  const home = process.env.HOME ?? process.env.USERPROFILE ?? "";
  const configPath = join(home, ".config", "tokengate", "config.json");
  if (!existsSync(configPath)) return null;
  try {
    return JSON.parse(readFileSync(configPath, "utf-8"));
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Error class
// ---------------------------------------------------------------------------

export class EnvValidationError extends Error {
  errors: ValidationError[];

  constructor(errors: ValidationError[], message: string) {
    super(message);
    this.name = "EnvValidationError";
    this.errors = errors;
  }
}
