import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { homedir } from "node:os";
import type { CliConfig } from "@tokengate/sdk";

const CONFIG_PATH = join(homedir(), ".config", "tokengate", "config.json");

export async function loadConfig(): Promise<CliConfig> {
  try {
    const value = await readFile(CONFIG_PATH, "utf8");
    return JSON.parse(value) as CliConfig;
  } catch {
    return {
      appUrl: process.env.TOKENGATE_APP_URL ?? "http://localhost:3000",
      apiUrl: process.env.TOKENGATE_API_URL ?? process.env.TOKENGATE_APP_URL ?? "http://localhost:3000",
      convexUrl: process.env.NEXT_PUBLIC_CONVEX_URL,
      encryptedWorkspaceKeys: undefined
    };
  }
}

export async function saveConfig(config: CliConfig) {
  await mkdir(dirname(CONFIG_PATH), { recursive: true });
  await writeFile(CONFIG_PATH, JSON.stringify(config, null, 2));
}

export function getConfigPath() {
  return CONFIG_PATH;
}
