import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { homedir } from "node:os";
import type { CliConfig } from "@tokengate/sdk";

const CONFIG_VERSION = 3;
const DEFAULT_APP_URL = "https://tokengate.dev";

interface StoredCliConfig {
  version: number;
  appUrl: string;
  convexUrl?: string;
  deviceId?: string;
  deviceLabel?: string;
  accessToken?: string;
  privateKey?: JsonWebKey;
  publicKey?: JsonWebKey;
  lastWorkspaceId?: string;
  lastProjectId?: string;
  lastEnvironmentId?: string;
  lastSecretSetId?: string;
  encryptedWorkspaceKeys?: string;
}

function getAppUrl() {
  return process.env.TOKENGATE_APP_URL ?? DEFAULT_APP_URL;
}

function getDefaultConfig(): CliConfig {
  const appUrl = getAppUrl();
  return {
    appUrl,
    apiUrl: appUrl,
    encryptedWorkspaceKeys: undefined
  };
}

export async function loadConfig(): Promise<CliConfig> {
  try {
    const value = await readFile(getConfigPath(), "utf8");
    const stored = JSON.parse(value) as StoredCliConfig;
    const appUrl = stored.appUrl || getAppUrl();
    return {
      appUrl,
      apiUrl: appUrl,
      convexUrl: stored.convexUrl,
      deviceId: stored.deviceId,
      deviceLabel: stored.deviceLabel,
      accessToken: stored.accessToken,
      privateKey: stored.privateKey,
      publicKey: stored.publicKey,
      lastWorkspaceId: stored.lastWorkspaceId,
      lastProjectId: stored.lastProjectId,
      lastEnvironmentId: stored.lastEnvironmentId,
      lastSecretSetId: stored.lastSecretSetId,
      encryptedWorkspaceKeys: stored.encryptedWorkspaceKeys
    };
  } catch (error) {
    if (isNodeError(error) && error.code === "ENOENT") {
      return getDefaultConfig();
    }
    throw error;
  }
}

export async function saveConfig(config: CliConfig) {
  const stored: StoredCliConfig = {
    version: CONFIG_VERSION,
    appUrl: config.appUrl,
    convexUrl: config.convexUrl,
    deviceId: config.deviceId,
    deviceLabel: config.deviceLabel,
    accessToken: config.accessToken,
    privateKey: config.privateKey,
    publicKey: config.publicKey,
    lastWorkspaceId: config.lastWorkspaceId,
    lastProjectId: config.lastProjectId,
    lastEnvironmentId: config.lastEnvironmentId,
    lastSecretSetId: config.lastSecretSetId,
    encryptedWorkspaceKeys: config.encryptedWorkspaceKeys
  };

  await mkdir(dirname(getConfigPath()), { recursive: true });
  await writeFile(getConfigPath(), JSON.stringify(stored, null, 2), { mode: 0o600 });
}

export function getConfigPath() {
  return join(homedir(), ".config", "tokengate", "config.json");
}

function isNodeError(error: unknown): error is Error & { code?: string } {
  return error instanceof Error;
}
