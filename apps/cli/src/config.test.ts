import { afterEach, describe, expect, it } from "bun:test";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { loadConfig, saveConfig } from "./config";

const originalPassphrase = process.env.TOKENGATE_CLI_PASSPHRASE;
const originalConfigPath = process.env.TOKENGATE_CONFIG_PATH;

describe("cli config", () => {
  let configDir: string;

  afterEach(async () => {
    process.env.TOKENGATE_CLI_PASSPHRASE = originalPassphrase;
    process.env.TOKENGATE_CONFIG_PATH = originalConfigPath;
    if (configDir) {
      await rm(configDir, { recursive: true, force: true });
    }
  });

  it("encrypts sensitive local auth state at rest", async () => {
    configDir = await mkdtemp(join(tmpdir(), "tokengate-cli-"));
    process.env.TOKENGATE_CLI_PASSPHRASE = "test-passphrase";
    process.env.TOKENGATE_CONFIG_PATH = join(configDir, "config.json");

    await saveConfig({
      appUrl: "http://localhost:3000",
      apiUrl: "http://localhost:3000",
      convexUrl: "https://example.convex.cloud",
      deviceId: "device_1234",
      deviceLabel: "my-laptop",
      accessToken: "secret-token",
      encryptedWorkspaceKeys: "vault",
      lastWorkspaceId: "workspace_1234",
      privateKey: { kty: "RSA" },
      publicKey: { kty: "RSA" }
    });

    const rawFile = await readFile(join(configDir, "config.json"), "utf8");
    expect(rawFile).not.toContain("secret-token");
    expect(rawFile).not.toContain("device_1234");

    const config = await loadConfig();
    expect(config.accessToken).toBe("secret-token");
    expect(config.deviceId).toBe("device_1234");
    expect(config.deviceLabel).toBe("my-laptop");
  });
});
