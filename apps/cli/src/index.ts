#!/usr/bin/env bun

import { randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import {
  decryptRevisionPayload,
  encryptRevisionPayload,
  generateDeviceKeyPair,
  restoreWorkspaceKeyFromRecoveryPhrase
} from "@tokengate/crypto";
import { normalizeEnvDocument } from "@tokengate/env-format";
import type { CliConfig, CreateRevisionResult, DeviceLoginSession } from "@tokengate/sdk";
import { getConfigPath, loadConfig, saveConfig } from "./config";
import { TokengateHttpClient } from "./http-client";

const [command, ...args] = process.argv.slice(2);

await main(command, args);

async function main(commandName: string | undefined, commandArgs: string[]) {
  switch (commandName) {
    case "login":
      return handleLogin(commandArgs);
    case "init":
      return handleInit(commandArgs);
    case "status":
      return handleStatus();
    case "push":
      return handlePush(commandArgs);
    case "pull":
      return handlePull(commandArgs);
    case "history":
      return handleHistory(commandArgs);
    default:
      return printHelp();
  }
}

async function handleLogin(args: string[]) {
  const config = await loadConfig();
  const label = args[0] ?? `${Bun.env.HOSTNAME ?? "device"}-${Date.now()}`;
  const deviceKeys = await generateDeviceKeyPair();
  const state = randomUUID();
  const callbackPort = 47233;
  const callbackUrl = `http://127.0.0.1:${callbackPort}/callback`;

  const session: DeviceLoginSession = {
    state,
    callbackUrl,
    deviceName: label
  };

  const server = Bun.serve({
    port: callbackPort,
    fetch: async (request) => {
      const url = new URL(request.url);
      if (url.pathname !== "/callback") {
        return new Response("Not found", { status: 404 });
      }

      if (url.searchParams.get("state") !== state) {
        return new Response("State mismatch", { status: 400 });
      }

      const token = url.searchParams.get("token");
      const deviceId = url.searchParams.get("device_id");

      if (!token || !deviceId) {
        return new Response("Missing device token or device id", { status: 400 });
      }

      await saveConfig({
        ...config,
        accessToken: token,
        deviceId,
        deviceLabel: label,
        privateKey: deviceKeys.privateKey,
        publicKey: deviceKeys.publicKey
      });

      server.stop();
      return new Response("Tokengate CLI login complete. You can return to the terminal.");
    }
  });

  const loginUrl = new URL("/cli/auth", config.appUrl);
  loginUrl.searchParams.set("state", session.state);
  loginUrl.searchParams.set("callback", session.callbackUrl);
  loginUrl.searchParams.set("device_name", session.deviceName);
  loginUrl.searchParams.set("public_key", encodeURIComponent(JSON.stringify(deviceKeys.publicKey)));

  console.log(`Open this URL to authorize the device:\n${loginUrl.toString()}\n`);
  console.log(`Waiting for callback on ${callbackUrl}`);
}

async function handleInit(args: string[]) {
  const config = await loadConfig();
  const recoveryPhrase = args[0];
  if (!recoveryPhrase) {
    throw new Error("Usage: tokengate init <recovery-phrase>");
  }

  const workspaceKey = restoreWorkspaceKeyFromRecoveryPhrase(recoveryPhrase);
  await saveConfig({
    ...config,
    lastWorkspaceId: config.lastWorkspaceId,
    privateKey: config.privateKey,
    publicKey: config.publicKey,
    accessToken: config.accessToken,
    appUrl: config.appUrl,
    apiUrl: config.apiUrl,
    deviceId: config.deviceId,
    deviceLabel: config.deviceLabel
  });

  console.log("Recovery phrase accepted.");
  console.log(`Workspace key fingerprint: ${workspaceKey.slice(0, 12)}...`);
}

async function handleStatus() {
  const config = await loadConfig();
  console.log(JSON.stringify({ configPath: getConfigPath(), config }, null, 2));
}

async function handlePush(args: string[]) {
  const filePath = resolve(args[0] ?? ".env");
  const workspaceKey = args[1];
  const secretSetId = args[2];

  if (!workspaceKey || !secretSetId) {
    throw new Error("Usage: tokengate push <file> <workspace-key> <secret-set-id>");
  }

  const content = await readFile(filePath, "utf8");
  const normalized = normalizeEnvDocument(content);
  const payload = await encryptRevisionPayload(normalized, workspaceKey);

  const config = await loadConfig();
  const client = new TokengateHttpClient(config);
  const result = await client.post<CreateRevisionResult>("/api/cli/revisions", {
    secretSetId,
    ciphertext: payload.ciphertext,
    wrappedDataKey: payload.wrappedDataKey,
    contentHash: payload.contentHash
  });

  console.log(JSON.stringify(result, null, 2));
}

async function handlePull(args: string[]) {
  const secretSetId = args[0];
  const workspaceKey = args[1];
  const outputPath = resolve(args[2] ?? ".env");

  if (!secretSetId || !workspaceKey) {
    throw new Error("Usage: tokengate pull <secret-set-id> <workspace-key> [output]");
  }

  const config = await loadConfig();
  const client = new TokengateHttpClient(config);
  const payload = await client.get<{
    ciphertext: string;
    wrappedDataKey: string;
    contentHash: string;
  }>(`/api/cli/revisions/latest?secretSetId=${secretSetId}`);

  const plaintext = await decryptRevisionPayload(payload, workspaceKey);
  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, plaintext);
  console.log(`Wrote ${outputPath}`);
}

async function handleHistory(args: string[]) {
  const secretSetId = args[0];
  if (!secretSetId) {
    throw new Error("Usage: tokengate history <secret-set-id>");
  }

  const config = await loadConfig();
  const client = new TokengateHttpClient(config);
  const history = await client.get(`/api/cli/revisions/history?secretSetId=${secretSetId}`);
  console.log(JSON.stringify(history, null, 2));
}

function printHelp() {
  console.log(`
tokengate <command>

Commands:
  login [device-label]                 Start the browser device authorization flow
  init <recovery-phrase>               Validate and fingerprint a recovery phrase
  status                               Show local CLI config
  push <file> <workspace-key> <set>    Encrypt and push a revision
  pull <set> <workspace-key> [output]  Pull the latest revision and write a .env file
  history <set>                        Show remote revision history
`);
}
