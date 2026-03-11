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
import { TokengateConvexClient } from "@tokengate/sdk/convex-client";
import { convexFunctions, type CliConfig, type CreateRevisionResult, type DeviceLoginSession, type SecretRevision } from "@tokengate/sdk";
import { getConfigPath, loadConfig, saveConfig } from "./config";

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
    case "workspaces":
      return handleWorkspaces();
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
      const convexUrl = url.searchParams.get("convex_url");
      const error = url.searchParams.get("error");

      if (error) {
        server.stop();
        return new Response(`CLI login failed: ${error}`, { status: 400 });
      }

      if (!token || !deviceId) {
        return new Response("Missing device token or device id", { status: 400 });
      }

      await saveConfig({
        ...config,
        accessToken: token,
        deviceId,
        deviceLabel: label,
        convexUrl: convexUrl || config.convexUrl,
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
  loginUrl.searchParams.set("public_key", JSON.stringify(deviceKeys.publicKey));

  console.log(`Open this URL to authorize the device:\n${loginUrl.toString()}\n`);
  console.log(`Waiting for callback on ${callbackUrl}`);
}

async function handleInit(args: string[]) {
  const config = await loadConfig();
  const workspaceId = args[0];
  const recoveryPhrase = args[1];
  if (!workspaceId || !recoveryPhrase) {
    throw new Error("Usage: tokengate init <workspace-id> <recovery-phrase>");
  }

  const workspaceKey = restoreWorkspaceKeyFromRecoveryPhrase(recoveryPhrase);
  await saveConfig({
    ...config,
    workspaceKeys: {
      ...(config.workspaceKeys ?? {}),
      [workspaceId]: workspaceKey
    },
    lastWorkspaceId: workspaceId,
    privateKey: config.privateKey,
    publicKey: config.publicKey,
    accessToken: config.accessToken,
    appUrl: config.appUrl,
    apiUrl: config.apiUrl,
    deviceId: config.deviceId,
    deviceLabel: config.deviceLabel
  });

  console.log("Recovery phrase accepted.");
  console.log(`Stored workspace key for ${workspaceId}. Fingerprint: ${workspaceKey.slice(0, 12)}...`);
}

async function handleStatus() {
  const config = await loadConfig();
  console.log(JSON.stringify({ configPath: getConfigPath(), config }, null, 2));
}

async function handleWorkspaces() {
  const config = await requireAuthenticatedConfig();
  const client = getConvexClient(config);
  const workspaces = await client.query(convexFunctions.listWorkspaces, {});
  console.log(JSON.stringify(workspaces, null, 2));
}

async function handlePush(args: string[]) {
  const filePath = resolve(args[0] ?? ".env");
  const workspaceId = args[1];
  const secretSetId = args[2];

  if (!workspaceId || !secretSetId) {
    throw new Error("Usage: tokengate push <file> <workspace-id> <secret-set-id>");
  }

  const config = await requireAuthenticatedConfig();
  const workspaceKey = getWorkspaceKey(config, workspaceId);
  const content = await readFile(filePath, "utf8");
  const normalized = normalizeEnvDocument(content);
  const payload = await encryptRevisionPayload(normalized, workspaceKey);
  const client = getConvexClient(config);
  const latest = await client.query<SecretRevision | null>(convexFunctions.getLatestRevision, {
    secretSetId
  });
  const result = await client.mutation<CreateRevisionResult>(convexFunctions.createRevision, {
    secretSetId,
    baseRevision: latest?.revision,
    ciphertext: payload.ciphertext,
    wrappedDataKey: payload.wrappedDataKey,
    contentHash: payload.contentHash
  });

  console.log(JSON.stringify(result, null, 2));
}

async function handlePull(args: string[]) {
  const secretSetId = args[0];
  const workspaceId = args[1];
  const outputPath = resolve(args[2] ?? ".env");

  if (!secretSetId || !workspaceId) {
    throw new Error("Usage: tokengate pull <secret-set-id> <workspace-id> [output]");
  }

  const config = await requireAuthenticatedConfig();
  const workspaceKey = getWorkspaceKey(config, workspaceId);
  const client = getConvexClient(config);
  const payload = await client.query<{
    ciphertext: string;
    wrappedDataKey: string;
    contentHash: string;
  } | null>(convexFunctions.getLatestRevision, { secretSetId });

  if (!payload) {
    throw new Error("No revision found for this secret set");
  }

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

  const config = await requireAuthenticatedConfig();
  const client = getConvexClient(config);
  const history = await client.query(convexFunctions.listRevisionHistory, { secretSetId });
  console.log(JSON.stringify(history, null, 2));
}

async function requireAuthenticatedConfig() {
  const config = await loadConfig();
  if (!config.accessToken) {
    throw new Error("Run `tokengate login` first.");
  }

  if (!config.convexUrl) {
    throw new Error("Missing Convex URL. Set NEXT_PUBLIC_CONVEX_URL or re-run login.");
  }

  return config;
}

function getWorkspaceKey(config: CliConfig, workspaceId: string) {
  const workspaceKey = config.workspaceKeys?.[workspaceId];
  if (!workspaceKey) {
    throw new Error(`Missing workspace key for ${workspaceId}. Run \`tokengate init ${workspaceId} <recovery-phrase>\`.`);
  }
  return workspaceKey;
}

function getConvexClient(config: CliConfig) {
  return new TokengateConvexClient({
    url: config.convexUrl!,
    token: config.accessToken
  });
}

function printHelp() {
  console.log(`
tokengate <command>

Commands:
  login [device-label]                 Start the browser device authorization flow
  init <workspace-id> <recovery>       Store a workspace key derived from the recovery phrase
  status                               Show local CLI config
  workspaces                           List available workspaces
  push <file> <workspace-id> <set>     Encrypt and push a revision
  pull <set> <workspace-id> [output]   Pull the latest revision and write a .env file
  history <set>                        Show remote revision history
`);
}
