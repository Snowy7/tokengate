import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { homedir } from "node:os";
import { decryptVaultPayload, encryptVaultPayload } from "@tokengate/crypto";
import type { CliConfig } from "@tokengate/sdk";
const CONFIG_VERSION = 2;

interface StoredCliConfig {
  version: number;
  appUrl: string;
  apiUrl: string;
  convexUrl?: string;
  deviceLabel?: string;
  lastWorkspaceId?: string;
  lastProjectId?: string;
  lastEnvironmentId?: string;
  lastSecretSetId?: string;
  encryptedWorkspaceKeys?: string;
  encryptedLocalState?: string;
  deviceId?: string;
  accessToken?: string;
  privateKey?: JsonWebKey;
  publicKey?: JsonWebKey;
}

interface SensitiveCliState {
  deviceId?: string;
  accessToken?: string;
  privateKey?: JsonWebKey;
  publicKey?: JsonWebKey;
}

function getLocalPassphrase() {
  return process.env.TOKENGATE_CLI_PASSPHRASE ?? process.env.TOKENGATE_VAULT_PASSPHRASE;
}

function getDefaultConfig(): CliConfig {
  return {
    appUrl: process.env.TOKENGATE_APP_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
    apiUrl:
      process.env.TOKENGATE_API_URL ??
      process.env.TOKENGATE_APP_URL ??
      process.env.NEXT_PUBLIC_APP_URL ??
      "http://localhost:3000",
    convexUrl: process.env.NEXT_PUBLIC_CONVEX_URL,
    encryptedWorkspaceKeys: undefined
  };
}

export async function loadConfig(): Promise<CliConfig> {
  try {
    const value = await readFile(getConfigPath(), "utf8");
    const stored = JSON.parse(value) as StoredCliConfig;
    const base: CliConfig = {
      appUrl: stored.appUrl,
      apiUrl: stored.apiUrl,
      convexUrl: stored.convexUrl ?? process.env.NEXT_PUBLIC_CONVEX_URL,
      deviceLabel: stored.deviceLabel,
      lastWorkspaceId: stored.lastWorkspaceId,
      lastProjectId: stored.lastProjectId,
      lastEnvironmentId: stored.lastEnvironmentId,
      lastSecretSetId: stored.lastSecretSetId,
      encryptedWorkspaceKeys: stored.encryptedWorkspaceKeys
    };

    if (stored.encryptedLocalState) {
      const passphrase = getLocalPassphrase();
      if (!passphrase) {
        throw new Error(
          "Local CLI auth is encrypted. Set TOKENGATE_CLI_PASSPHRASE or TOKENGATE_VAULT_PASSPHRASE before running Tokengate."
        );
      }

      const decrypted = await decryptVaultPayload(stored.encryptedLocalState, passphrase);
      return { ...base, ...(JSON.parse(decrypted) as SensitiveCliState) };
    }

    if (stored.version === CONFIG_VERSION) {
      return base;
    }

    // Legacy plaintext config fallback for migration.
    return {
      ...base,
      deviceId: stored.deviceId,
      accessToken: stored.accessToken,
      privateKey: stored.privateKey,
      publicKey: stored.publicKey
    };
  } catch (error) {
    if (isNodeError(error) && error.code === "ENOENT") {
      return getDefaultConfig();
    }
    throw error;
  }
}

export async function saveConfig(config: CliConfig) {
  const passphrase = getLocalPassphrase();
  const sensitiveState: SensitiveCliState = {
    deviceId: config.deviceId,
    accessToken: config.accessToken,
    privateKey: config.privateKey,
    publicKey: config.publicKey
  };

  let encryptedLocalState: string | undefined;
  if (hasSensitiveState(sensitiveState)) {
    if (!passphrase) {
      throw new Error(
        "Set TOKENGATE_CLI_PASSPHRASE or TOKENGATE_VAULT_PASSPHRASE before storing CLI auth locally."
      );
    }
    encryptedLocalState = await encryptVaultPayload(JSON.stringify(sensitiveState), passphrase);
  }

  const stored: StoredCliConfig = {
    version: CONFIG_VERSION,
    appUrl: config.appUrl,
    apiUrl: config.apiUrl,
    convexUrl: config.convexUrl,
    deviceLabel: config.deviceLabel,
    lastWorkspaceId: config.lastWorkspaceId,
    lastProjectId: config.lastProjectId,
    lastEnvironmentId: config.lastEnvironmentId,
    lastSecretSetId: config.lastSecretSetId,
    encryptedWorkspaceKeys: config.encryptedWorkspaceKeys,
    encryptedLocalState
  };

  await mkdir(dirname(getConfigPath()), { recursive: true });
  await writeFile(getConfigPath(), JSON.stringify(stored, null, 2));
}

export function getConfigPath() {
  return process.env.TOKENGATE_CONFIG_PATH ?? join(homedir(), ".config", "tokengate", "config.json");
}

export function getRecoveryDirPath() {
  return join(dirname(getConfigPath()), "recovery");
}

function hasSensitiveState(value: SensitiveCliState) {
  return Boolean(value.deviceId || value.accessToken || value.privateKey || value.publicKey);
}

function isNodeError(error: unknown): error is Error & { code?: string } {
  return error instanceof Error;
}
