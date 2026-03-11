#!/usr/bin/env bun

import { randomUUID } from "node:crypto";
import { existsSync, readdirSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { hostname } from "node:os";
import { dirname, resolve } from "node:path";
import * as p from "@clack/prompts";
import pc from "picocolors";
import {
  bootstrapWorkspace,
  decryptRevisionPayload,
  deriveEnvironmentKey,
  encryptRevisionPayload,
  generateDeviceKeyPair,
  generateSalt,
  hashContent,
  wrapWorkspaceKeyForDevice
} from "@tokengate/crypto";
import { normalizeEnvDocument } from "@tokengate/env-format";
import { TokengateConvexClient } from "@tokengate/sdk/convex-client";
import {
  AuthError,
  convexFunctions,
  type CliConfig,
  type CreateRevisionResult,
  type Environment,
  type Project,
  type SecretRevision,
  type SecretSet,
  type Workspace,
  type WorkspaceWithMembership
} from "@tokengate/sdk";
import { getConfigPath, loadConfig, saveConfig } from "./config";

// ---------------------------------------------------------------------------
// Local project file (.tokengate.json)
// ---------------------------------------------------------------------------

const LOCAL_CONFIG_FILE = ".tokengate.json";

interface EnvFileMapping {
  secretSetId: string;
  environmentId: string;
  environmentName: string;
}

interface LocalProjectConfig {
  workspaceId: string;
  workspaceName: string;
  projectId: string;
  projectName: string;
  mappings: Record<string, EnvFileMapping>;
}

function getLocalConfigPath(): string {
  return resolve(process.cwd(), LOCAL_CONFIG_FILE);
}

function loadLocalConfig(): LocalProjectConfig | null {
  try {
    if (!existsSync(getLocalConfigPath())) return null;
    const raw = JSON.parse(require("node:fs").readFileSync(getLocalConfigPath(), "utf8"));
    if (!raw?.projectId || !raw?.mappings) return null;
    return raw as LocalProjectConfig;
  } catch {
    return null;
  }
}

async function saveLocalConfig(config: LocalProjectConfig): Promise<void> {
  await writeFile(getLocalConfigPath(), JSON.stringify(config, null, 2) + "\n");
}

function scanEnvFiles(): string[] {
  try {
    return readdirSync(process.cwd())
      .filter((f) => /^\.env(\..+)?$/.test(f))
      .sort();
  } catch {
    return [];
  }
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

const [command, ...args] = process.argv.slice(2);

try {
  await main(command, args);
} catch (error) {
  if (error instanceof AuthError) {
    p.log.warn("Your session has expired or is invalid.");
    const spinner = p.spinner();
    spinner.start("Clearing stored credentials");
    await clearAuth();
    spinner.stop("Credentials cleared.");
    p.log.info(`Run ${pc.cyan("tokengate login")} to sign in again.`);
    process.exitCode = 1;
  } else if (isCancel(error)) {
    p.cancel("Cancelled.");
    process.exitCode = 130;
  } else {
    p.log.error(error instanceof Error ? error.message : "Unknown error");
    process.exitCode = 1;
  }
}

// ---------------------------------------------------------------------------
// Router
// ---------------------------------------------------------------------------

async function main(cmd: string | undefined, argv: string[]) {
  switch (cmd) {
    case "login":
      return handleLogin(argv);
    case "logout":
      return handleLogout();
    case "init":
    case "setup":
      return handleInitWizard();
    case "status":
      return handleStatus();
    case "workspaces":
      return handleWorkspaces();
    case "push":
      return handlePush();
    case "pull":
      return handlePull();
    case "history":
      return handleHistory();
    case "help":
    case "--help":
    case "-h":
      return printHelp();
    default:
      return handleDefault();
  }
}

// ---------------------------------------------------------------------------
// Smart default (no command)
// ---------------------------------------------------------------------------

async function handleDefault() {
  const config = await loadConfig();
  const local = loadLocalConfig();
  const signedIn = Boolean(config.accessToken && config.convexUrl);

  if (!signedIn || !local) {
    return handleInitWizard();
  }

  p.intro(
    `${pc.bgCyan(pc.black(" tokengate "))} ${pc.dim(local.projectName)}`
  );

  const action = await p.select({
    message: "What do you want to do?",
    options: [
      { value: "push", label: "Push env files to remote" },
      { value: "pull", label: "Pull env files from remote" },
      { value: "history", label: "View revision history" },
      { value: "status", label: "Show status" },
      { value: "init", label: "Re-initialize / change project" }
    ]
  });
  bail(action);

  switch (action) {
    case "push":
      return handlePush();
    case "pull":
      return handlePull();
    case "history":
      return handleHistory();
    case "status":
      return handleStatus();
    case "init":
      return handleInitWizard();
  }
}

// ---------------------------------------------------------------------------
// Commands
// ---------------------------------------------------------------------------

async function handleLogin(argv: string[]) {
  p.intro(`${pc.bgCyan(pc.black(" tokengate "))} ${pc.dim("device login")}`);

  const config = await loadConfig();
  const label = argv[0] ?? `${hostname() || "device"}-${Date.now()}`;
  const deviceKeys = await generateDeviceKeyPair();
  const state = randomUUID();
  const callbackPort = 47233;
  const callbackUrl = `http://127.0.0.1:${callbackPort}/callback`;
  const loginUrl = new URL("/cli/auth", config.appUrl);

  loginUrl.searchParams.set("state", state);
  loginUrl.searchParams.set("callback", callbackUrl);
  loginUrl.searchParams.set("device_name", label);
  loginUrl.searchParams.set("public_key", JSON.stringify(deviceKeys.publicKey));

  let resolveLogin!: () => void;
  let rejectLogin!: (error: Error) => void;
  const loginResult = new Promise<void>((ok, fail) => {
    resolveLogin = ok;
    rejectLogin = fail;
  });

  const server = Bun.serve({
    port: callbackPort,
    fetch: async (request) => {
      const url = new URL(request.url);
      if (url.pathname !== "/callback")
        return new Response("Not found", { status: 404 });
      if (url.searchParams.get("state") !== state)
        return new Response("State mismatch", { status: 400 });

      const token = url.searchParams.get("token");
      const deviceId = url.searchParams.get("device_id");
      const convexUrl = url.searchParams.get("convex_url");
      const error = url.searchParams.get("error");

      if (error) {
        server.stop();
        rejectLogin(new Error(error));
        return new Response("Login failed. Return to your terminal.", {
          status: 400
        });
      }

      if (!token || !deviceId) {
        rejectLogin(new Error("Missing device token or device id."));
        return new Response("Missing credentials.", { status: 400 });
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
      return new Response("Login complete. Return to your terminal.");
    }
  });

  p.log.info(`Device: ${pc.cyan(label)}`);

  const opened = await openInBrowser(loginUrl.toString());
  if (!opened) {
    p.log.warn("Could not open browser automatically.");
    p.note(loginUrl.toString(), "Open this URL manually");
  }

  const spinner = p.spinner();
  spinner.start("Waiting for browser confirmation");
  await loginResult;
  spinner.stop("Authenticated.");

  p.outro(`Signed in as ${pc.green(label)}`);
}

async function handleLogout() {
  p.intro(`${pc.bgCyan(pc.black(" tokengate "))} ${pc.dim("logout")}`);
  await clearAuth();
  p.outro("Signed out. Credentials cleared.");
}

async function handleStatus() {
  p.intro(`${pc.bgCyan(pc.black(" tokengate "))} ${pc.dim("status")}`);

  const config = await loadConfig();
  const local = loadLocalConfig();

  const rows: string[][] = [
    ["Config", getConfigPath()],
    ["App URL", config.appUrl],
    ["Convex URL", config.convexUrl ?? pc.dim("not configured")],
    ["Signed in", config.accessToken ? pc.green("yes") : pc.dim("no")],
    ["Device", config.deviceLabel ?? pc.dim("not registered")],
    ["Device ID", maskValue(config.deviceId)]
  ];

  if (local) {
    rows.push(
      ["", ""],
      ["Local config", pc.green(LOCAL_CONFIG_FILE)],
      [
        "Workspace",
        `${local.workspaceName}  ${pc.dim(local.workspaceId)}`
      ],
      ["Project", `${local.projectName}  ${pc.dim(local.projectId)}`]
    );

    const mappingEntries = Object.entries(local.mappings);
    if (mappingEntries.length > 0) {
      rows.push(["", ""], ["File mappings", ""]);
      for (const [file, mapping] of mappingEntries) {
        rows.push([
          `  ${file}`,
          `→ ${mapping.environmentName}  ${pc.dim(mapping.secretSetId.slice(0, 12) + "…")}`
        ]);
      }
    }
  } else {
    rows.push(
      ["", ""],
      [
        "Local config",
        pc.dim(`not initialized (run ${pc.cyan("tokengate init")})`)
      ]
    );
  }

  const maxLabel = Math.max(...rows.map(([label]) => label.length));
  const formatted = rows
    .map(([label, value]) =>
      label ? `  ${pc.dim(label.padEnd(maxLabel))}  ${value}` : ""
    )
    .join("\n");
  p.note(formatted, "Configuration");

  p.outro("Done");
}

async function handleWorkspaces() {
  p.intro(`${pc.bgCyan(pc.black(" tokengate "))} ${pc.dim("workspaces")}`);

  const config = await requireAuth();
  const client = getClient(config);
  const spinner = p.spinner();
  spinner.start("Fetching workspaces");
  const workspaces = await client.query<WorkspaceWithMembership[]>(
    convexFunctions.listWorkspaces,
    {}
  );
  spinner.stop(
    `Found ${workspaces.length} workspace${workspaces.length === 1 ? "" : "s"}.`
  );

  if (workspaces.length === 0) {
    p.log.info(
      "No workspaces yet. Run " + pc.cyan("tokengate init") + " to create one."
    );
  } else {
    for (const entry of workspaces) {
      const name = entry.workspace?.name ?? "Unknown";
      const id = entry.workspace?.id ?? "";
      p.log.message(
        `  ${pc.bold(name)}  ${pc.dim(id)}  ${pc.cyan(entry.membership.role)}`
      );
    }
  }

  p.outro("Done");
}

// ---------------------------------------------------------------------------
// Push
// ---------------------------------------------------------------------------

async function handlePush() {
  p.intro(`${pc.bgCyan(pc.black(" tokengate "))} ${pc.dim("push")}`);

  const local = loadLocalConfig();
  if (!local) {
    p.log.error(
      `No ${LOCAL_CONFIG_FILE} found. Run ${pc.cyan("tokengate init")} first.`
    );
    process.exitCode = 1;
    return;
  }

  const config = await requireAuth();
  const client = getClient(config);

  // Scan for env files
  const envFiles = scanEnvFiles();
  if (envFiles.length === 0) {
    p.log.warn("No .env files found in the current directory.");
    process.exitCode = 1;
    return;
  }

  // Gather info about each file: mapped or not, local hash vs remote hash
  const spinner = p.spinner();
  spinner.start("Checking file status");

  type FileInfo = {
    file: string;
    mapped: boolean;
    mapping?: EnvFileMapping;
    localHash: string;
    remoteHash?: string;
    remoteRevision?: number;
    status: "changed" | "synced" | "new" | "unmapped";
  };

  const fileInfos: FileInfo[] = [];

  for (const file of envFiles) {
    const content = await readFile(resolve(process.cwd(), file), "utf8");
    const normalized = normalizeEnvDocument(content);
    const localHash = await hashContent(normalized);
    const mapping = local.mappings[file];

    if (!mapping) {
      fileInfos.push({
        file,
        mapped: false,
        localHash,
        status: "unmapped"
      });
      continue;
    }

    // Fetch remote latest revision to compare hashes
    try {
      const latest = await client.query<SecretRevision | null>(
        convexFunctions.getLatestRevision,
        { secretSetId: mapping.secretSetId }
      );

      if (!latest) {
        fileInfos.push({
          file,
          mapped: true,
          mapping,
          localHash,
          status: "new"
        });
      } else if (latest.contentHash === localHash) {
        fileInfos.push({
          file,
          mapped: true,
          mapping,
          localHash,
          remoteHash: latest.contentHash,
          remoteRevision: latest.revision,
          status: "synced"
        });
      } else {
        fileInfos.push({
          file,
          mapped: true,
          mapping,
          localHash,
          remoteHash: latest.contentHash,
          remoteRevision: latest.revision,
          status: "changed"
        });
      }
    } catch {
      fileInfos.push({
        file,
        mapped: true,
        mapping,
        localHash,
        status: "new"
      });
    }
  }

  spinner.stop("Files scanned.");

  // Show file table
  const statusIcon = (s: FileInfo["status"]) => {
    switch (s) {
      case "changed":
        return pc.yellow("~");
      case "synced":
        return pc.green("✓");
      case "new":
        return pc.blue("+");
      case "unmapped":
        return pc.dim("?");
    }
  };

  const statusLabel = (info: FileInfo) => {
    switch (info.status) {
      case "changed":
        return pc.yellow("changed") +
          (info.remoteRevision ? pc.dim(` (remote r${info.remoteRevision})`) : "");
      case "synced":
        return pc.green("synced") +
          (info.remoteRevision ? pc.dim(` (r${info.remoteRevision})`) : "");
      case "new":
        return pc.blue("not pushed yet");
      case "unmapped":
        return pc.dim("not linked to an environment");
    }
  };

  p.log.message("");
  for (const info of fileInfos) {
    const envName = info.mapping
      ? pc.cyan(info.mapping.environmentName)
      : pc.dim("—");
    p.log.message(
      `  ${statusIcon(info.status)} ${pc.bold(info.file)}  → ${envName}  ${statusLabel(info)}`
    );
  }
  p.log.message("");

  // Filter to pushable files (mapped only)
  const pushable = fileInfos.filter((f) => f.mapped);
  const unmapped = fileInfos.filter((f) => !f.mapped);

  if (unmapped.length > 0) {
    const linkThem = await p.confirm({
      message: `${unmapped.length} file${unmapped.length > 1 ? "s" : ""} not linked. Link them now?`,
      initialValue: true
    });
    bail(linkThem);

    if (linkThem) {
      for (const info of unmapped) {
        const linked = await linkFileToEnvironment(
          client,
          local,
          info.file
        );
        if (linked) {
          info.mapped = true;
          info.mapping = linked;
          info.status = "new";
          pushable.push(info);
        }
      }
      // Save updated mappings
      await saveLocalConfig(local);
    }
  }

  if (pushable.length === 0) {
    p.log.warn("No files to push.");
    p.outro("Done");
    return;
  }

  // Multi-select which files to push
  const toSync = pushable.filter((f) => f.status !== "synced");
  let selected: FileInfo[];

  if (toSync.length === 0) {
    p.log.success("All mapped files are in sync.");
    const pushAnyway = await p.confirm({
      message: "Push again anyway?",
      initialValue: false
    });
    bail(pushAnyway);
    if (!pushAnyway) {
      p.outro("Done");
      return;
    }
    selected = pushable;
  } else if (toSync.length === 1) {
    selected = toSync;
    p.log.info(`Pushing ${pc.bold(toSync[0].file)}`);
  } else {
    const choices = await p.multiselect({
      message: "Select files to push",
      options: pushable.map((f) => ({
        value: f,
        label: `${f.file} → ${f.mapping!.environmentName}`,
        hint: f.status === "synced" ? "synced" : f.status === "changed" ? "changed" : "new",
        selected: f.status !== "synced"
      }))
    });
    bail(choices);
    selected = choices as FileInfo[];
  }

  // Group by environment to ask password per environment
  const byEnv = new Map<string, FileInfo[]>();
  for (const f of selected) {
    const envId = f.mapping!.environmentId;
    if (!byEnv.has(envId)) byEnv.set(envId, []);
    byEnv.get(envId)!.push(f);
  }

  // Push each group
  for (const [envId, files] of byEnv) {
    const envName = files[0].mapping!.environmentName;
    const label =
      byEnv.size > 1
        ? `Password for ${pc.cyan(envName)}`
        : "Environment password";

    const password = await p.password({
      message: label,
      validate: requirePassword
    });
    bail(password);

    // Fetch secret set for keySalt
    const secretSetId = files[0].mapping!.secretSetId;
    const spinPush = p.spinner();
    spinPush.start(`Loading ${pc.dim(envName)} environment`);

    const secretSet = await client.query<SecretSet | null>(
      convexFunctions.getSecretSetForEnvironmentById,
      { secretSetId }
    );
    if (!secretSet?.keySalt) {
      spinPush.stop("Error.");
      p.log.error(
        `Secret set for ${envName} not found. Run ${pc.cyan("tokengate init")} to fix.`
      );
      continue;
    }

    const envKey = await deriveEnvironmentKey(
      password as string,
      secretSet.keySalt
    );

    for (const f of files) {
      spinPush.message(`Encrypting ${pc.dim(f.file)}`);
      const content = await readFile(resolve(process.cwd(), f.file), "utf8");
      const normalized = normalizeEnvDocument(content);
      const payload = await encryptRevisionPayload(normalized, envKey);

      spinPush.message(`Pushing ${pc.dim(f.file)}`);
      const latest = await client.query<SecretRevision | null>(
        convexFunctions.getLatestRevision,
        { secretSetId: f.mapping!.secretSetId }
      );
      const result = await client.mutation<CreateRevisionResult>(
        convexFunctions.createRevision,
        {
          secretSetId: f.mapping!.secretSetId,
          baseRevision: latest?.revision,
          ciphertext: payload.ciphertext,
          wrappedDataKey: payload.wrappedDataKey,
          contentHash: payload.contentHash
        }
      );

      if (result.conflict) {
        spinPush.stop(`${pc.yellow("!")} ${f.file}: conflict`);
        p.log.warn(
          `  Remote is at r${result.latestRevision ?? "?"}. Pull first, then retry.`
        );
      } else {
        p.log.success(
          `  ${pc.bold(f.file)} → r${result.acceptedRevision}`
        );
      }
    }
    spinPush.stop(`Pushed to ${pc.cyan(envName)}`);
  }

  p.outro("Done");
}

// ---------------------------------------------------------------------------
// Pull
// ---------------------------------------------------------------------------

async function handlePull() {
  p.intro(`${pc.bgCyan(pc.black(" tokengate "))} ${pc.dim("pull")}`);

  const local = loadLocalConfig();
  if (!local) {
    p.log.error(
      `No ${LOCAL_CONFIG_FILE} found. Run ${pc.cyan("tokengate init")} first.`
    );
    process.exitCode = 1;
    return;
  }

  const mappingEntries = Object.entries(local.mappings);
  if (mappingEntries.length === 0) {
    p.log.warn(
      `No file mappings in ${LOCAL_CONFIG_FILE}. Run ${pc.cyan("tokengate init")} to set up.`
    );
    process.exitCode = 1;
    return;
  }

  const config = await requireAuth();
  const client = getClient(config);

  // Check remote status for each mapped file
  const spinner = p.spinner();
  spinner.start("Checking remote status");

  type PullInfo = {
    file: string;
    mapping: EnvFileMapping;
    localExists: boolean;
    localHash?: string;
    remoteRevision?: SecretRevision;
    status: "changed" | "synced" | "remote-only" | "no-remote";
  };

  const pullInfos: PullInfo[] = [];

  for (const [file, mapping] of mappingEntries) {
    const filePath = resolve(process.cwd(), file);
    const localExists = existsSync(filePath);
    let localHash: string | undefined;

    if (localExists) {
      const content = await readFile(filePath, "utf8");
      localHash = await hashContent(normalizeEnvDocument(content));
    }

    try {
      const latest = await client.query<SecretRevision | null>(
        convexFunctions.getLatestRevision,
        { secretSetId: mapping.secretSetId }
      );

      if (!latest) {
        pullInfos.push({
          file,
          mapping,
          localExists,
          localHash,
          status: "no-remote"
        });
      } else if (!localExists) {
        pullInfos.push({
          file,
          mapping,
          localExists,
          remoteRevision: latest,
          status: "remote-only"
        });
      } else if (latest.contentHash === localHash) {
        pullInfos.push({
          file,
          mapping,
          localExists,
          localHash,
          remoteRevision: latest,
          status: "synced"
        });
      } else {
        pullInfos.push({
          file,
          mapping,
          localExists,
          localHash,
          remoteRevision: latest,
          status: "changed"
        });
      }
    } catch {
      pullInfos.push({
        file,
        mapping,
        localExists,
        localHash,
        status: "no-remote"
      });
    }
  }

  spinner.stop("Remote checked.");

  // Display status
  const statusIcon = (s: PullInfo["status"]) => {
    switch (s) {
      case "changed":
        return pc.yellow("~");
      case "synced":
        return pc.green("✓");
      case "remote-only":
        return pc.blue("+");
      case "no-remote":
        return pc.dim("—");
    }
  };

  const statusLabel = (info: PullInfo) => {
    switch (info.status) {
      case "changed":
        return pc.yellow("remote differs") +
          (info.remoteRevision
            ? pc.dim(` (r${info.remoteRevision.revision})`)
            : "");
      case "synced":
        return pc.green("synced") +
          (info.remoteRevision
            ? pc.dim(` (r${info.remoteRevision.revision})`)
            : "");
      case "remote-only":
        return pc.blue("new file") +
          (info.remoteRevision
            ? pc.dim(` (r${info.remoteRevision.revision})`)
            : "");
      case "no-remote":
        return pc.dim("nothing pushed yet");
    }
  };

  p.log.message("");
  for (const info of pullInfos) {
    p.log.message(
      `  ${statusIcon(info.status)} ${pc.bold(info.file)}  ← ${pc.cyan(info.mapping.environmentName)}  ${statusLabel(info)}`
    );
  }
  p.log.message("");

  // Filter to pullable (has remote data)
  const pullable = pullInfos.filter((f) => f.status !== "no-remote");

  if (pullable.length === 0) {
    p.log.warn("Nothing to pull. No remote revisions found.");
    p.outro("Done");
    return;
  }

  const toSync = pullable.filter((f) => f.status !== "synced");
  let selected: PullInfo[];

  if (toSync.length === 0) {
    p.log.success("All files are in sync.");
    const pullAnyway = await p.confirm({
      message: "Pull again anyway?",
      initialValue: false
    });
    bail(pullAnyway);
    if (!pullAnyway) {
      p.outro("Done");
      return;
    }
    selected = pullable;
  } else if (toSync.length === 1) {
    selected = toSync;
    p.log.info(`Pulling ${pc.bold(toSync[0].file)}`);
  } else {
    const choices = await p.multiselect({
      message: "Select files to pull",
      options: pullable.map((f) => ({
        value: f,
        label: `${f.file} ← ${f.mapping.environmentName}`,
        hint:
          f.status === "synced"
            ? "synced"
            : f.status === "changed"
              ? "remote differs"
              : "new file",
        selected: f.status !== "synced"
      }))
    });
    bail(choices);
    selected = choices as PullInfo[];
  }

  // Group by environment for password prompting
  const byEnv = new Map<string, PullInfo[]>();
  for (const f of selected) {
    const envId = f.mapping.environmentId;
    if (!byEnv.has(envId)) byEnv.set(envId, []);
    byEnv.get(envId)!.push(f);
  }

  for (const [envId, files] of byEnv) {
    const envName = files[0].mapping.environmentName;
    const label =
      byEnv.size > 1
        ? `Password for ${pc.cyan(envName)}`
        : "Environment password";

    const password = await p.password({
      message: label,
      validate: requirePassword
    });
    bail(password);

    const secretSetId = files[0].mapping.secretSetId;
    const spinPull = p.spinner();
    spinPull.start(`Loading ${pc.dim(envName)} environment`);

    const secretSet = await client.query<SecretSet | null>(
      convexFunctions.getSecretSetForEnvironmentById,
      { secretSetId }
    );
    if (!secretSet?.keySalt) {
      spinPull.stop("Error.");
      p.log.error(`Secret set for ${envName} not found.`);
      continue;
    }

    const envKey = await deriveEnvironmentKey(
      password as string,
      secretSet.keySalt
    );

    for (const f of files) {
      if (!f.remoteRevision) continue;

      spinPull.message(`Decrypting ${pc.dim(f.file)}`);
      try {
        const plaintext = await decryptRevisionPayload(
          f.remoteRevision,
          envKey
        );
        const filePath = resolve(process.cwd(), f.file);
        await mkdir(dirname(filePath), { recursive: true });
        await writeFile(filePath, plaintext);
        p.log.success(
          `  ${pc.bold(f.file)} ← r${f.remoteRevision.revision}`
        );
      } catch {
        spinPull.stop("Decryption failed.");
        p.log.error(
          `  ${f.file}: wrong password or corrupted data.`
        );
        process.exitCode = 1;
        return;
      }
    }
    spinPull.stop(`Pulled from ${pc.cyan(envName)}`);
  }

  p.outro("Done");
}

// ---------------------------------------------------------------------------
// History
// ---------------------------------------------------------------------------

async function handleHistory() {
  p.intro(`${pc.bgCyan(pc.black(" tokengate "))} ${pc.dim("history")}`);

  const local = loadLocalConfig();
  if (!local) {
    p.log.error(
      `No ${LOCAL_CONFIG_FILE} found. Run ${pc.cyan("tokengate init")} first.`
    );
    process.exitCode = 1;
    return;
  }

  const config = await requireAuth();
  const client = getClient(config);

  const mappingEntries = Object.entries(local.mappings);
  if (mappingEntries.length === 0) {
    p.log.warn("No file mappings configured.");
    process.exitCode = 1;
    return;
  }

  // If multiple mappings, let user pick which environment
  let mapping: EnvFileMapping;
  let fileName: string;

  if (mappingEntries.length === 1) {
    [fileName, mapping] = mappingEntries[0];
  } else {
    const choice = await p.select({
      message: "Which environment?",
      options: mappingEntries.map(([file, m]) => ({
        value: file,
        label: `${file} → ${m.environmentName}`
      }))
    });
    bail(choice);
    fileName = choice as string;
    mapping = local.mappings[fileName];
  }

  const spinner = p.spinner();
  spinner.start(
    `Fetching history for ${pc.dim(mapping.environmentName)}`
  );
  const history = await client.query<SecretRevision[]>(
    convexFunctions.listRevisionHistory,
    { secretSetId: mapping.secretSetId }
  );
  spinner.stop(
    `${history.length} revision${history.length === 1 ? "" : "s"} found.`
  );

  if (history.length === 0) {
    p.log.info("No revisions yet.");
  } else {
    const sorted = history.slice().sort((a, b) => b.revision - a.revision);
    for (const rev of sorted) {
      const date = new Date(rev.createdAt).toLocaleString();
      const hash = rev.contentHash.slice(0, 12);
      p.log.message(
        `  ${pc.bold("r" + rev.revision)}  ${pc.dim(date)}  ${pc.dim(hash)}  ${pc.dim("by " + maskValue(rev.createdBy))}`
      );
    }
  }

  p.outro("Done");
}

// ---------------------------------------------------------------------------
// Init wizard
// ---------------------------------------------------------------------------

async function handleInitWizard() {
  p.intro(`${pc.bgCyan(pc.black(" tokengate "))} ${pc.dim("setup")}`);

  let config = await loadConfig();
  let needsLogin = !config.accessToken || !config.convexUrl;

  if (!needsLogin) {
    try {
      await verifyToken(config);
    } catch {
      p.log.warn("Session expired or invalid.");
      await clearAuth();
      needsLogin = true;
    }
  }

  if (needsLogin) {
    p.log.info("Signing you in first.");
    await handleLogin([]);
    config = await loadConfig();
    if (!config.accessToken || !config.convexUrl) {
      p.log.error("Login failed. Cannot continue setup.");
      process.exitCode = 1;
      return;
    }
  }

  if (!config.publicKey) {
    p.log.error(
      `Missing device keypair. Run ${pc.cyan("tokengate login")} again.`
    );
    process.exitCode = 1;
    return;
  }

  const client = getClient(config);

  // --- Workspace ---
  const spinner = p.spinner();
  spinner.start("Loading workspaces");
  const workspaces = await client.query<WorkspaceWithMembership[]>(
    convexFunctions.listWorkspaces,
    {}
  );
  spinner.stop(
    `${workspaces.length} workspace${workspaces.length === 1 ? "" : "s"} found.`
  );

  const wsOptions: Array<{
    value: Workspace | "new";
    label: string;
    hint?: string;
  }> = workspaces
    .filter((w) => w.workspace)
    .map((w) => ({
      value: w.workspace!,
      label: w.workspace!.name,
      hint: w.membership.role
    }));
  wsOptions.push({ value: "new", label: "Create new workspace" });

  const wsChoice = await p.select({
    message: "Workspace",
    options: wsOptions
  });
  bail(wsChoice);

  let workspace: Workspace;
  let createdNew = false;

  if (wsChoice === "new") {
    const name = await p.text({
      message: "Workspace name",
      placeholder: "acme",
      validate: requireNonEmpty
    });
    bail(name);

    const wsType = await p.select({
      message: "Type",
      options: [
        { value: "team" as const, label: "Team" },
        { value: "personal" as const, label: "Personal" }
      ]
    });
    bail(wsType);

    const bs = p.spinner();
    bs.start("Creating workspace");
    const bootstrap = await bootstrapWorkspace();
    const wrapped = await wrapWorkspaceKeyForDevice(
      bootstrap.workspaceKey,
      config.publicKey!
    );
    const workspaceId = await client.mutation<string>(
      convexFunctions.createWorkspace,
      {
        name: name as string,
        slug: toSlug(name as string),
        type: wsType,
        ownerWrappedWorkspaceKey: wrapped
      }
    );
    bs.stop("Workspace created.");

    workspace = {
      id: workspaceId,
      name: name as string,
      slug: toSlug(name as string),
      type: wsType as "personal" | "team",
      createdAt: Date.now(),
      createdBy: "me"
    };
    createdNew = true;
  } else {
    workspace = wsChoice as Workspace;
  }

  // --- Project ---
  let projectsList: Project[] = [];
  if (!createdNew) {
    const ps = p.spinner();
    ps.start("Loading projects");
    projectsList = await client.query<Project[]>(
      convexFunctions.listProjects,
      { workspaceId: workspace.id }
    );
    ps.stop(
      `${projectsList.length} project${projectsList.length === 1 ? "" : "s"} found.`
    );
  }

  let project: Project;
  if (createdNew || projectsList.length === 0) {
    if (!createdNew) p.log.info("No projects in this workspace yet.");
    const name = await p.text({
      message: "Project name",
      placeholder: "web",
      validate: requireNonEmpty
    });
    bail(name);
    const ps = p.spinner();
    ps.start("Creating project");
    const projectId = await client.mutation<string>(
      convexFunctions.createProject,
      {
        workspaceId: workspace.id,
        name: name as string,
        slug: toSlug(name as string)
      }
    );
    ps.stop("Project created.");
    project = {
      id: projectId,
      workspaceId: workspace.id,
      name: name as string,
      slug: toSlug(name as string),
      createdAt: Date.now()
    };
  } else {
    const projOptions: Array<{ value: Project | "new"; label: string }> =
      projectsList.map((proj) => ({ value: proj, label: proj.name }));
    projOptions.push({ value: "new", label: "Create new project" });

    const projChoice = await p.select({
      message: "Project",
      options: projOptions
    });
    bail(projChoice);

    if (projChoice === "new") {
      const name = await p.text({
        message: "Project name",
        placeholder: "web",
        validate: requireNonEmpty
      });
      bail(name);
      const ps = p.spinner();
      ps.start("Creating project");
      const projectId = await client.mutation<string>(
        convexFunctions.createProject,
        {
          workspaceId: workspace.id,
          name: name as string,
          slug: toSlug(name as string)
        }
      );
      ps.stop("Project created.");
      project = {
        id: projectId,
        workspaceId: workspace.id,
        name: name as string,
        slug: toSlug(name as string),
        createdAt: Date.now()
      };
    } else {
      project = projChoice as Project;
    }
  }

  // --- Load remote environments ---
  let envsList: Environment[] = [];
  if (!createdNew) {
    const es = p.spinner();
    es.start("Loading environments");
    envsList = await client.query<Environment[]>(
      convexFunctions.listEnvironments,
      { projectId: project.id }
    );
    es.stop(
      `${envsList.length} environment${envsList.length === 1 ? "" : "s"} found.`
    );
  }

  // --- Scan local env files and map them ---
  const envFiles = scanEnvFiles();
  const mappings: Record<string, EnvFileMapping> = {};

  if (envFiles.length > 0) {
    p.log.message("");
    p.log.info(
      `Found ${pc.bold(String(envFiles.length))} env file${envFiles.length > 1 ? "s" : ""}: ${envFiles.map((f) => pc.cyan(f)).join(", ")}`
    );
    p.log.message("");

    for (const file of envFiles) {
      const suggestedName = envFileToEnvName(file);

      // Check if there's an existing environment that matches
      const existingMatch = envsList.find(
        (e) =>
          e.name.toLowerCase() === suggestedName.toLowerCase() ||
          e.slug === toSlug(suggestedName)
      );

      if (existingMatch) {
        // Auto-link to matching environment
        const secretSet = await client.query<SecretSet | null>(
          convexFunctions.getSecretSetForEnvironment,
          { environmentId: existingMatch.id }
        );
        if (secretSet) {
          p.log.success(
            `  ${pc.bold(file)} → ${pc.cyan(existingMatch.name)} (auto-linked)`
          );
          mappings[file] = {
            secretSetId: secretSet.id,
            environmentId: existingMatch.id,
            environmentName: existingMatch.name
          };
          continue;
        }
      }

      // Ask user what to do with this file
      const envOptions: Array<{
        value: Environment | "new" | "skip";
        label: string;
      }> = envsList.map((env) => ({ value: env, label: env.name }));
      envOptions.push({
        value: "new",
        label: `Create "${suggestedName}" environment`
      });
      envOptions.push({ value: "skip", label: "Skip this file" });

      const envChoice = await p.select({
        message: `Link ${pc.bold(file)} to environment`,
        options: envOptions
      });
      bail(envChoice);

      if (envChoice === "skip") continue;

      if (envChoice === "new") {
        const env = await createEnvironmentWithPassword(
          client,
          project.id,
          suggestedName
        );
        const secretSet = await client.query<SecretSet | null>(
          convexFunctions.getSecretSetForEnvironment,
          { environmentId: env.id }
        );
        if (secretSet) {
          mappings[file] = {
            secretSetId: secretSet.id,
            environmentId: env.id,
            environmentName: env.name
          };
          envsList.push(env);
        }
      } else {
        const env = envChoice as Environment;
        const secretSet = await client.query<SecretSet | null>(
          convexFunctions.getSecretSetForEnvironment,
          { environmentId: env.id }
        );
        if (secretSet) {
          mappings[file] = {
            secretSetId: secretSet.id,
            environmentId: env.id,
            environmentName: env.name
          };
        }
      }
    }
  }

  // If no env files found, create at least one environment
  if (envFiles.length === 0 || Object.keys(mappings).length === 0) {
    p.log.info("No .env files found. Let's create an environment anyway.");
    const env = await createEnvironmentWithPassword(client, project.id);
    const secretSet = await client.query<SecretSet | null>(
      convexFunctions.getSecretSetForEnvironment,
      { environmentId: env.id }
    );
    if (secretSet) {
      mappings[".env"] = {
        secretSetId: secretSet.id,
        environmentId: env.id,
        environmentName: env.name
      };
    }
  }

  // Save local config
  const localConfig: LocalProjectConfig = {
    workspaceId: workspace.id,
    workspaceName: workspace.name,
    projectId: project.id,
    projectName: project.name,
    mappings
  };
  await saveLocalConfig(localConfig);

  // Save to global config
  await saveContext(config, {
    workspaceId: workspace.id,
    projectId: project.id
  });

  // Summary
  const lines = [
    `${pc.dim("Workspace")}  ${workspace.name}`,
    `${pc.dim("Project")}    ${project.name}`,
    ""
  ];
  for (const [file, m] of Object.entries(mappings)) {
    lines.push(`  ${pc.bold(file)}  → ${pc.cyan(m.environmentName)}`);
  }
  lines.push("", `Saved to ${pc.cyan(LOCAL_CONFIG_FILE)}`);
  p.note(lines.join("\n"), "Configuration");

  // Next action
  const hasFiles = envFiles.length > 0 && Object.keys(mappings).length > 0;
  const next = await p.select({
    message: "What next?",
    options: [
      { value: "done", label: "Finish setup" },
      ...(hasFiles
        ? [{ value: "push", label: "Push env files now" }]
        : []),
      { value: "pull", label: "Pull from remote" }
    ]
  });
  bail(next);

  if (next === "push") {
    await handlePush();
  } else if (next === "pull") {
    await handlePull();
  } else {
    p.outro(
      "Setup complete. Use " +
        pc.cyan("tokengate push") +
        " / " +
        pc.cyan("tokengate pull") +
        " to sync."
    );
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Link a local file to a remote environment during push. */
async function linkFileToEnvironment(
  client: TokengateConvexClient,
  local: LocalProjectConfig,
  file: string
): Promise<EnvFileMapping | null> {
  const suggestedName = envFileToEnvName(file);

  // Fetch environments for the project
  const environments = await client.query<Environment[]>(
    convexFunctions.listEnvironments,
    { projectId: local.projectId }
  );

  const options: Array<{
    value: Environment | "new" | "skip";
    label: string;
  }> = environments.map((env) => ({ value: env, label: env.name }));
  options.push({
    value: "new",
    label: `Create "${suggestedName}" environment`
  });
  options.push({ value: "skip", label: "Skip this file" });

  const choice = await p.select({
    message: `Link ${pc.bold(file)} to environment`,
    options
  });
  bail(choice);

  if (choice === "skip") return null;

  if (choice === "new") {
    const env = await createEnvironmentWithPassword(
      client,
      local.projectId,
      suggestedName
    );
    const secretSet = await client.query<SecretSet | null>(
      convexFunctions.getSecretSetForEnvironment,
      { environmentId: env.id }
    );
    if (!secretSet) return null;

    const mapping: EnvFileMapping = {
      secretSetId: secretSet.id,
      environmentId: env.id,
      environmentName: env.name
    };
    local.mappings[file] = mapping;
    return mapping;
  }

  const env = choice as Environment;
  const secretSet = await client.query<SecretSet | null>(
    convexFunctions.getSecretSetForEnvironment,
    { environmentId: env.id }
  );
  if (!secretSet) return null;

  const mapping: EnvFileMapping = {
    secretSetId: secretSet.id,
    environmentId: env.id,
    environmentName: env.name
  };
  local.mappings[file] = mapping;
  return mapping;
}

/** Derive a human-readable environment name from a .env filename. */
function envFileToEnvName(file: string): string {
  // .env → development, .env.local → local, .env.production → production
  const match = file.match(/^\.env\.(.+)$/);
  if (match) return match[1];
  return "development";
}

async function createEnvironmentWithPassword(
  client: TokengateConvexClient,
  projectId: string,
  suggestedName?: string
): Promise<Environment> {
  const name = await p.text({
    message: "Environment name",
    placeholder: suggestedName ?? "development",
    defaultValue: suggestedName,
    validate: requireNonEmpty
  });
  bail(name);

  const password = await p.password({
    message: `Set password for ${pc.cyan(name as string)}`,
    validate: requirePassword
  });
  bail(password);

  const confirmPassword = await p.password({
    message: "Confirm password",
    validate: requirePassword
  });
  bail(confirmPassword);

  if (password !== confirmPassword) {
    p.log.error("Passwords do not match.");
    process.exit(1);
  }

  const es = p.spinner();
  es.start("Creating environment");
  const salt = generateSalt();
  const environmentId = await client.mutation<string>(
    convexFunctions.createEnvironment,
    {
      projectId,
      name: name as string,
      slug: toSlug(name as string),
      keySalt: salt
    }
  );
  es.stop("Environment created.");

  return {
    id: environmentId,
    projectId,
    name: name as string,
    slug: toSlug(name as string),
    createdAt: Date.now()
  };
}

async function clearAuth() {
  const config = await loadConfig();
  await saveConfig({
    ...config,
    accessToken: undefined,
    deviceId: undefined,
    privateKey: undefined,
    publicKey: undefined
  });
}

async function requireAuth() {
  const config = await loadConfig();
  if (!config.accessToken) {
    p.log.error(
      `Not signed in. Run ${pc.cyan("tokengate login")} first.`
    );
    process.exit(1);
  }
  if (!config.convexUrl) {
    p.log.error(
      `Missing Convex URL. Set ${pc.cyan("NEXT_PUBLIC_CONVEX_URL")} or re-run login.`
    );
    process.exit(1);
  }
  await verifyToken(config);
  return config;
}

async function verifyToken(config: CliConfig): Promise<void> {
  const client = getClient(config);
  try {
    await client.query<WorkspaceWithMembership[]>(
      convexFunctions.listWorkspaces,
      {}
    );
  } catch (error) {
    if (error instanceof AuthError) throw error;
  }
}

function getClient(config: CliConfig) {
  return new TokengateConvexClient({
    url: config.convexUrl!,
    token: config.accessToken
  });
}

async function saveContext(
  config: CliConfig,
  target: {
    workspaceId?: string;
    projectId?: string;
    environmentId?: string;
    secretSetId?: string;
  }
) {
  await saveConfig({
    ...config,
    lastWorkspaceId: target.workspaceId ?? config.lastWorkspaceId,
    lastProjectId: target.projectId ?? config.lastProjectId,
    lastEnvironmentId: target.environmentId ?? config.lastEnvironmentId,
    lastSecretSetId: target.secretSetId ?? config.lastSecretSetId
  });
}

function maskValue(value: string | undefined | null) {
  if (!value) return pc.dim("not set");
  if (value.length <= 8) return "********";
  return value.slice(0, 4) + pc.dim("...") + value.slice(-4);
}

function toSlug(value: string) {
  return (
    value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "untitled"
  );
}

function requireNonEmpty(value: string | undefined) {
  if (!value?.trim()) return "Cannot be empty.";
}

function requirePassword(value: string | undefined) {
  if (!value || value.length < 1) return "Password is required.";
}

function bail(
  value: unknown
): asserts value is Exclude<typeof value, symbol> {
  if (p.isCancel(value)) throw { __cancel: true };
}

function isCancel(error: unknown): boolean {
  return (
    typeof error === "object" && error !== null && "__cancel" in error
  );
}

async function openInBrowser(url: string) {
  const cmds =
    process.platform === "darwin"
      ? [["open", url]]
      : process.platform === "win32"
        ? [["cmd", "/c", "start", "", url]]
        : [["xdg-open", url]];

  for (const cmd of cmds) {
    const proc = Bun.spawn(cmd, {
      stdin: "ignore",
      stdout: "ignore",
      stderr: "ignore"
    });
    if ((await proc.exited) === 0) return true;
  }
  return false;
}

function printHelp() {
  p.intro(`${pc.bgCyan(pc.black(" tokengate "))} ${pc.dim("CLI")}`);

  console.log(`
  ${pc.bold("Usage")}
    ${pc.dim("$")} tokengate ${pc.cyan("[command]")}

  ${pc.bold("Commands")}
    ${pc.cyan("(none)")}             Smart mode — push/pull if initialized, else setup
    ${pc.cyan("login")}  [label]     Sign in via browser
    ${pc.cyan("logout")}             Clear stored credentials
    ${pc.cyan("init")}               Setup wizard — scans .env files & links to environments
    ${pc.cyan("status")}             Show config & file mappings
    ${pc.cyan("workspaces")}         List workspaces
    ${pc.cyan("push")}               Select & push env files (shows change status)
    ${pc.cyan("pull")}               Select & pull env files (shows remote status)
    ${pc.cyan("history")}            Show revision history

  ${pc.bold("How it works")}
    1. Run ${pc.cyan("tokengate init")} in your project root
    2. It scans for .env files and links each to an environment
    3. Each environment is locked with its own password
    4. ${pc.cyan("tokengate push")} / ${pc.cyan("tokengate pull")} shows all files with sync status
    5. Config is saved to ${pc.cyan(LOCAL_CONFIG_FILE)}

  ${pc.bold("Environment variables")}
    ${pc.dim("TOKENGATE_CLI_PASSPHRASE")}   Encrypt local auth at rest
    ${pc.dim("NEXT_PUBLIC_CONVEX_URL")}     Convex deployment URL
`);

  p.outro(`${pc.dim("Docs:")} https://tokengate.dev/docs`);
}
