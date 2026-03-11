#!/usr/bin/env bun

import { randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { hostname } from "node:os";
import { dirname, resolve } from "node:path";
import {
  decryptVaultPayload,
  decryptRevisionPayload,
  encryptVaultPayload,
  encryptRevisionPayload,
  generateDeviceKeyPair,
  restoreWorkspaceKeyFromRecoveryPhrase
} from "@tokengate/crypto";
import { normalizeEnvDocument } from "@tokengate/env-format";
import { TokengateConvexClient } from "@tokengate/sdk/convex-client";
import {
  convexFunctions,
  type CliConfig,
  type CreateRevisionResult,
  type DeviceLoginSession,
  type SecretRevision,
  type WorkspaceWithMembership
} from "@tokengate/sdk";
import { getConfigPath, loadConfig, saveConfig } from "./config";

const [command, ...args] = process.argv.slice(2);

try {
  await main(command, args);
} catch (error) {
  printError(error);
  process.exitCode = 1;
}

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
  const label = args[0] ?? `${hostname() || "device"}-${Date.now()}`;
  const deviceKeys = await generateDeviceKeyPair();
  const state = randomUUID();
  const callbackPort = 47233;
  const callbackUrl = `http://127.0.0.1:${callbackPort}/callback`;
  const loginUrl = new URL("/cli/auth", config.appUrl);

  loginUrl.searchParams.set("state", state);
  loginUrl.searchParams.set("callback", callbackUrl);
  loginUrl.searchParams.set("device_name", label);
  loginUrl.searchParams.set("public_key", JSON.stringify(deviceKeys.publicKey));

  const session: DeviceLoginSession = {
    state,
    callbackUrl,
    deviceName: label
  };

  let resolveLogin!: () => void;
  let rejectLogin!: (error: Error) => void;
  const loginResult = new Promise<void>((resolve, reject) => {
    resolveLogin = resolve;
    rejectLogin = reject;
  });

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
        rejectLogin(new Error(error));
        return new Response("Tokengate CLI login failed. You can return to the terminal.", { status: 400 });
      }

      if (!token || !deviceId) {
        rejectLogin(new Error("Missing device token or device id"));
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
      resolveLogin();
      return new Response("Tokengate CLI login complete. You can return to the terminal.");
    }
  });

  printBanner("Tokengate CLI");
  printInfo(`Authorizing device ${formatCode(session.deviceName)}`);
  printMuted("Opening your browser for confirmation...");

  const opened = await openInBrowser(loginUrl.toString());
  if (!opened) {
    printWarning("Could not open a browser automatically.");
    printMuted("Open this URL manually:");
    console.log(loginUrl.toString());
  }

  printInfo("Waiting for confirmation...");
  await loginResult;
  printSuccess(`Signed in as ${formatCode(label)}.`);
}

async function handleInit(args: string[]) {
  const config = await loadConfig();
  const workspaceId = args[0];
  const recoveryPhrase = args[1];
  const passphrase = args[2] ?? process.env.TOKENGATE_VAULT_PASSPHRASE;
  if (!workspaceId || !recoveryPhrase || !passphrase) {
    throw new Error("Usage: tokengate init <workspace-id> <recovery-phrase> <vault-passphrase>");
  }

  const workspaceKey = restoreWorkspaceKeyFromRecoveryPhrase(recoveryPhrase);
  const workspaceKeys = await readWorkspaceKeyVault(config, passphrase);
  workspaceKeys[workspaceId] = workspaceKey;
  await saveConfig({
    ...config,
    encryptedWorkspaceKeys: await encryptVaultPayload(JSON.stringify(workspaceKeys), passphrase),
    lastWorkspaceId: workspaceId,
    privateKey: config.privateKey,
    publicKey: config.publicKey,
    accessToken: config.accessToken,
    appUrl: config.appUrl,
    apiUrl: config.apiUrl,
    deviceId: config.deviceId,
    deviceLabel: config.deviceLabel
  });

  printSuccess("Recovery phrase accepted.");
  printInfo(`Stored workspace key for ${formatCode(workspaceId)}.`);
}

async function handleStatus() {
  const config = await loadConfig();
  const hasWorkspaceKeys = Boolean(config.encryptedWorkspaceKeys);
  printBanner("Tokengate CLI Status");
  console.log(`Config: ${getConfigPath()}`);
  console.log(`App URL: ${config.appUrl}`);
  console.log(`Convex URL: ${config.convexUrl ?? "not configured"}`);
  console.log(`Signed in: ${config.accessToken ? "yes" : "no"}`);
  console.log(`Device: ${config.deviceLabel ?? "not registered"}`);
  console.log(`Device ID: ${maskValue(config.deviceId)}`);
  console.log(`Local auth: ${config.accessToken ? "encrypted at rest" : "not stored"}`);
  console.log(`Workspace keys: ${hasWorkspaceKeys ? "present" : "not initialized"}`);
  console.log(`Last workspace: ${config.lastWorkspaceId ?? "none"}`);
}

async function handleWorkspaces() {
  const config = await requireAuthenticatedConfig();
  const client = getConvexClient(config);
  const workspaces = await client.query<WorkspaceWithMembership[]>(convexFunctions.listWorkspaces, {});
  if (workspaces.length === 0) {
    printMuted("No workspaces found.");
    return;
  }

  printBanner("Workspaces");
  for (const entry of workspaces) {
    console.log(`${entry.workspace?.name ?? "Unknown"}  ${formatCode(entry.workspace?.id ?? "")}  role=${entry.membership.role}`);
  }
}

async function handlePush(args: string[]) {
  const filePath = resolve(args[0] ?? ".env");
  const workspaceId = args[1];
  const secretSetId = args[2];

  if (!workspaceId || !secretSetId) {
    throw new Error("Usage: tokengate push <file> <workspace-id> <secret-set-id>");
  }

  const config = await requireAuthenticatedConfig();
  const passphrase = process.env.TOKENGATE_VAULT_PASSPHRASE;
  if (!passphrase) {
    throw new Error("Set TOKENGATE_VAULT_PASSPHRASE before pushing secrets.");
  }
  const workspaceKey = (await readWorkspaceKeyVault(config, passphrase))[workspaceId];
  if (!workspaceKey) {
    throw new Error(`Missing workspace key for ${workspaceId}. Run \`tokengate init ${workspaceId} <recovery> <vault-passphrase>\`.`);
  }
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

  if (result.conflict) {
    printWarning(`Push conflict. Latest remote revision: ${result.latestRevision ?? "unknown"}.`);
    return;
  }

  printSuccess(`Pushed revision ${result.acceptedRevision ?? "unknown"} to ${formatCode(secretSetId)}.`);
}

async function handlePull(args: string[]) {
  const secretSetId = args[0];
  const workspaceId = args[1];
  const outputPath = resolve(args[2] ?? ".env");

  if (!secretSetId || !workspaceId) {
    throw new Error("Usage: tokengate pull <secret-set-id> <workspace-id> [output]");
  }

  const config = await requireAuthenticatedConfig();
  const passphrase = process.env.TOKENGATE_VAULT_PASSPHRASE;
  if (!passphrase) {
    throw new Error("Set TOKENGATE_VAULT_PASSPHRASE before pulling secrets.");
  }
  const workspaceKey = (await readWorkspaceKeyVault(config, passphrase))[workspaceId];
  if (!workspaceKey) {
    throw new Error(`Missing workspace key for ${workspaceId}. Run \`tokengate init ${workspaceId} <recovery> <vault-passphrase>\`.`);
  }
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
  printSuccess(`Wrote ${outputPath}`);
}

async function handleHistory(args: string[]) {
  const secretSetId = args[0];
  if (!secretSetId) {
    throw new Error("Usage: tokengate history <secret-set-id>");
  }

  const config = await requireAuthenticatedConfig();
  const client = getConvexClient(config);
  const history = await client.query<SecretRevision[]>(convexFunctions.listRevisionHistory, { secretSetId });
  if (history.length === 0) {
    printMuted("No revisions found.");
    return;
  }

  printBanner("Revision History");
  for (const revision of history) {
    console.log(
      `r${revision.revision}  ${new Date(revision.createdAt).toISOString()}  by ${maskValue(revision.createdBy)}`
    );
  }
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

function getConvexClient(config: CliConfig) {
  return new TokengateConvexClient({
    url: config.convexUrl!,
    token: config.accessToken
  });
}

async function readWorkspaceKeyVault(config: CliConfig, passphrase: string) {
  if (!config.encryptedWorkspaceKeys) {
    return {} as Record<string, string>;
  }

  const decrypted = await decryptVaultPayload(config.encryptedWorkspaceKeys, passphrase);
  return JSON.parse(decrypted) as Record<string, string>;
}

function printHelp() {
  printBanner("Tokengate CLI");
  console.log(`Commands:
  login [device-label]                 Sign in this machine in the browser
  init <workspace-id> <recovery>       Store a workspace key from the recovery phrase
  status                               Show safe local status
  workspaces                           List available workspaces
  push <file> <workspace-id> <set>     Encrypt and push a revision
  pull <set> <workspace-id> [output]   Pull the latest revision and write a .env file
  history <set>                        Show remote revision history`);
  console.log();
  console.log("Set TOKENGATE_CLI_PASSPHRASE or TOKENGATE_VAULT_PASSPHRASE to protect local auth and workspace keys.");
}

function printBanner(title: string) {
  console.log(`\n${bold(title)}\n`);
}

function printInfo(message: string) {
  console.log(`${cyan("info")} ${message}`);
}

function printSuccess(message: string) {
  console.log(`${green("ok")}   ${message}`);
}

function printWarning(message: string) {
  console.log(`${yellow("warn")} ${message}`);
}

function printMuted(message: string) {
  console.log(`${dim(message)}`);
}

function printError(error: unknown) {
  const message = error instanceof Error ? error.message : "Unknown error";
  console.error(`${red("error")} ${message}`);
}

function maskValue(value: string | undefined | null) {
  if (!value) {
    return "not set";
  }
  if (value.length <= 8) {
    return "********";
  }
  return `${value.slice(0, 4)}...${value.slice(-4)}`;
}

function formatCode(value: string) {
  return `\`${value}\``;
}

async function openInBrowser(url: string) {
  const commands =
    process.platform === "darwin"
      ? [["open", url]]
      : process.platform === "win32"
        ? [["cmd", "/c", "start", "", url]]
        : [["xdg-open", url]];

  for (const command of commands) {
    const proc = Bun.spawn(command, {
      stdin: "ignore",
      stdout: "ignore",
      stderr: "ignore"
    });
    const exitCode = await proc.exited;
    if (exitCode === 0) {
      return true;
    }
  }

  return false;
}

function ansi(code: number, value: string) {
  return process.stdout.isTTY ? `\u001b[${code}m${value}\u001b[0m` : value;
}

function bold(value: string) {
  return ansi(1, value);
}

function dim(value: string) {
  return ansi(2, value);
}

function red(value: string) {
  return ansi(31, value);
}

function green(value: string) {
  return ansi(32, value);
}

function yellow(value: string) {
  return ansi(33, value);
}

function cyan(value: string) {
  return ansi(36, value);
}
