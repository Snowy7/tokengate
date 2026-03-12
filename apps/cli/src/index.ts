#!/usr/bin/env bun

import { randomUUID } from "node:crypto";
import { existsSync, readdirSync, statSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { hostname } from "node:os";
import { dirname, relative, resolve, join } from "node:path";
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
  /** The active environment for this checkout */
  environmentId?: string;
  environmentName?: string;
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

const EXCLUDED_ENV_SUFFIXES = [".example", ".sample", ".template", ".bak", ".backup"];
const EXCLUDED_DIRS = new Set(["node_modules", ".git", ".next", "dist", "build", ".turbo", ".vercel", ".output"]);

/** Recursively scan for .env files, returning paths relative to project root. */
function scanEnvFiles(): string[] {
  const root = process.cwd();
  const results: string[] = [];

  function walk(dir: string) {
    try {
      const entries = readdirSync(dir);
      for (const entry of entries) {
        const fullPath = join(dir, entry);
        try {
          const stat = statSync(fullPath);
          if (stat.isDirectory()) {
            if (!EXCLUDED_DIRS.has(entry) && !entry.startsWith(".")) {
              walk(fullPath);
            }
            continue;
          }
          if (!/^\.env(\..+)?$/.test(entry)) continue;
          const lower = entry.toLowerCase();
          if (EXCLUDED_ENV_SUFFIXES.some((suffix) => lower.endsWith(suffix))) continue;
          results.push(relative(root, fullPath));
        } catch {
          // Skip files we can't stat
        }
      }
    } catch {
      // Skip directories we can't read
    }
  }

  walk(root);
  return results.sort();
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

  const envLabel = local.environmentName ? ` ${pc.dim("/")} ${pc.dim(local.environmentName)}` : "";
  p.intro(
    `${pc.bgCyan(pc.black(" tokengate "))} ${pc.dim(local.projectName)}${envLabel}`
  );

  const action = await p.select({
    message: "What do you want to do?",
    options: [
      { value: "push", label: "Push env files to remote" },
      { value: "pull", label: "Pull env files from remote" },
      { value: "history", label: "View revision history" },
      { value: "status", label: "Show status" },
      { value: "init", label: "Re-initialize / switch environment" }
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
        return htmlResponse("Not Found", "This page doesn't exist.", true, 404);
      if (url.searchParams.get("state") !== state)
        return htmlResponse("State Mismatch", "The login session has expired or is invalid. Run tokengate login again.", true, 400);

      const token = url.searchParams.get("token");
      const deviceId = url.searchParams.get("device_id");
      const convexUrl = url.searchParams.get("convex_url");
      const error = url.searchParams.get("error");

      if (error) {
        server.stop();
        rejectLogin(new Error(error));
        return htmlResponse("Login Failed", error, true, 400);
      }

      if (!token || !deviceId) {
        rejectLogin(new Error("Missing device token or device id."));
        return htmlResponse("Missing Credentials", "The server did not return the required credentials.", true, 400);
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
      return htmlResponse("Authenticated", `Device ${label} has been authorized. You can close this tab.`, false, 200);
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
      ["Project", `${local.projectName}  ${pc.dim(local.projectId)}`],
      ["Environment", local.environmentName ? `${local.environmentName}  ${pc.dim(local.environmentId ?? "")}` : pc.dim("not set")]
    );

    const mappingEntries = Object.entries(local.mappings);
    if (mappingEntries.length > 0) {
      rows.push(["", ""], ["Tracked files", `${mappingEntries.length} file${mappingEntries.length !== 1 ? "s" : ""}`]);
      for (const [file] of mappingEntries) {
        rows.push([`  ${file}`, ""]);
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

  // Scan for env files recursively
  const envFiles = scanEnvFiles();
  if (envFiles.length === 0) {
    p.log.warn("No .env files found in the project tree.");
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

  if (local.environmentName) {
    p.log.info(`Environment: ${pc.cyan(local.environmentName)}`);
  }
  p.log.message("");
  for (const info of fileInfos) {
    p.log.message(
      `  ${statusIcon(info.status)} ${pc.bold(info.file)}  ${statusLabel(info)}`
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
        label: f.file,
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

  if (local.environmentName) {
    p.log.info(`Environment: ${pc.cyan(local.environmentName)}`);
  }
  p.log.message("");
  for (const info of pullInfos) {
    p.log.message(
      `  ${statusIcon(info.status)} ${pc.bold(info.file)}  ${statusLabel(info)}`
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
        label: f.file,
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

  // If multiple mappings, let user pick which file
  let mapping: EnvFileMapping;
  let fileName: string;

  if (mappingEntries.length === 1) {
    [fileName, mapping] = mappingEntries[0];
  } else {
    const choice = await p.select({
      message: "Which file?",
      options: mappingEntries.map(([file, m]) => ({
        value: file,
        label: file,
        hint: m.environmentName
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

  // --- Choose or create ONE environment for this checkout ---
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

  let environment: Environment;

  if (envsList.length === 0) {
    p.log.info("No environments yet. Let's create one.");
    environment = await createEnvironmentWithPassword(client, project.id, "development");
  } else {
    const envOptions: Array<{ value: Environment | "new"; label: string }> =
      envsList.map((env) => ({ value: env, label: env.name }));
    envOptions.push({ value: "new", label: "Create new environment" });

    const envChoice = await p.select({
      message: "Environment for this checkout",
      options: envOptions
    });
    bail(envChoice);

    if (envChoice === "new") {
      environment = await createEnvironmentWithPassword(client, project.id);
    } else {
      environment = envChoice as Environment;
    }
  }

  // --- Scan local env files recursively ---
  const envFiles = scanEnvFiles();
  const mappings: Record<string, EnvFileMapping> = {};

  if (envFiles.length > 0) {
    p.log.message("");
    p.log.info(
      `Found ${pc.bold(String(envFiles.length))} env file${envFiles.length > 1 ? "s" : ""}:`
    );
    for (const f of envFiles) {
      p.log.message(`  ${pc.cyan(f)}`);
    }
    p.log.message("");

    // Load existing secret sets for this environment
    const existingSecretSets = await client.query<SecretSet[]>(
      convexFunctions.listSecretSetsForEnvironment,
      { environmentId: environment.id }
    );

    for (const file of envFiles) {
      // Check if there's already a secret set for this file path
      const existingMatch = existingSecretSets.find(
        (ss) => ss.filePath === file
      );

      if (existingMatch) {
        p.log.success(
          `  ${pc.bold(file)} → ${pc.cyan(environment.name)} (already linked)`
        );
        mappings[file] = {
          secretSetId: existingMatch.id,
          environmentId: environment.id,
          environmentName: environment.name
        };
        continue;
      }

      // Create a new secret set for this file within the environment
      const fs = p.spinner();
      fs.start(`Linking ${pc.dim(file)}`);
      const secretSetId = await client.mutation<string>(
        convexFunctions.addSecretSet,
        {
          environmentId: environment.id,
          filePath: file
        }
      );
      fs.stop(`  ${pc.bold(file)} → ${pc.cyan(environment.name)} (linked)`);

      mappings[file] = {
        secretSetId,
        environmentId: environment.id,
        environmentName: environment.name
      };
    }
  }

  // If no env files found, ensure the environment exists at least
  if (envFiles.length === 0) {
    p.log.info("No .env files found in the project tree.");
  }

  // Save local config
  const localConfig: LocalProjectConfig = {
    workspaceId: workspace.id,
    workspaceName: workspace.name,
    projectId: project.id,
    projectName: project.name,
    environmentId: environment.id,
    environmentName: environment.name,
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
    `${pc.dim("Workspace")}     ${workspace.name}`,
    `${pc.dim("Project")}       ${project.name}`,
    `${pc.dim("Environment")}   ${environment.name}`,
    ""
  ];
  for (const [file] of Object.entries(mappings)) {
    lines.push(`  ${pc.bold(file)}`);
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

/** Add a new file to the current environment during push. */
async function linkFileToEnvironment(
  client: TokengateConvexClient,
  local: LocalProjectConfig,
  file: string
): Promise<EnvFileMapping | null> {
  if (!local.environmentId || !local.environmentName) {
    p.log.error("No environment set. Run tokengate init first.");
    return null;
  }

  const addIt = await p.confirm({
    message: `Add ${pc.bold(file)} to ${pc.cyan(local.environmentName)}?`,
    initialValue: true
  });
  bail(addIt);
  if (!addIt) return null;

  const secretSetId = await client.mutation<string>(
    convexFunctions.addSecretSet,
    {
      environmentId: local.environmentId,
      filePath: file
    }
  );

  const mapping: EnvFileMapping = {
    secretSetId,
    environmentId: local.environmentId,
    environmentName: local.environmentName
  };
  local.mappings[file] = mapping;
  return mapping;
}

/** Derive a human-readable environment name from a .env file path. */
function envFileToEnvName(file: string): string {
  // Extract just the basename: apps/web/.env.production → .env.production
  const basename = file.split("/").pop() ?? file;
  // .env → development, .env.local → local, .env.production → production
  const match = basename.match(/^\.env\.(.+)$/);
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
      `Missing Convex URL. Run ${pc.cyan("tokengate init")} or re-run login.`
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

function htmlResponse(title: string, message: string, isError: boolean, status: number) {
  const accent = isError ? "#e74c3c" : "#00d68f";
  const icon = isError
    ? `<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="${accent}" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>`
    : `<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="${accent}" stroke-width="2"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>`;

  const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${title} — Tokengate</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&family=Work+Sans:wght@400;600;800&display=swap');
  * { margin: 0; padding: 0; box-sizing: border-box; border-radius: 0 !important; }
  body { min-height: 100vh; display: flex; align-items: center; justify-content: center; background: #0a0a0a; color: #e0e0e0; font-family: 'Work Sans', sans-serif; padding: 24px; }
  .card { width: 100%; max-width: 440px; border: 3px solid #333; background: #111; padding: 40px 32px; }
  .badge { font-family: 'Space Mono', monospace; font-size: 11px; text-transform: uppercase; letter-spacing: 0.15em; color: ${accent}; font-weight: 700; margin-bottom: 20px; }
  .icon { margin-bottom: 16px; }
  h1 { font-family: 'Work Sans', sans-serif; font-size: 22px; font-weight: 800; margin-bottom: 12px; color: #fff; }
  .msg { font-size: 14px; line-height: 1.6; color: #888; margin-bottom: 24px; }
  .footer { padding-top: 16px; border-top: 2px solid #222; font-family: 'Space Mono', monospace; font-size: 11px; color: #444; letter-spacing: 0.05em; }
  .hint { font-family: 'Space Mono', monospace; font-size: 12px; color: #555; background: #0d0d0d; border: 2px solid #222; padding: 10px 14px; margin-bottom: 24px; }
  .hint code { color: ${accent}; }
</style></head><body>
<div class="card">
  <div class="badge">tokengate cli</div>
  <div class="icon">${icon}</div>
  <h1>${title}</h1>
  <p class="msg">${message}</p>
  ${isError ? `<div class="hint">Run <code>tokengate login</code> to try again.</div>` : `<div class="hint">You can close this tab and return to your terminal.</div>`}
  <div class="footer">tokengate.dev — end-to-end encrypted env sync</div>
</div>
</body></html>`;

  return new Response(html, {
    status,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

async function openInBrowser(url: string) {
  const cmds =
    process.platform === "darwin"
      ? [["open", url]]
      : process.platform === "win32"
        ? [["rundll32", "url.dll,FileProtocolHandler", url]]
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
    2. Choose an environment (e.g. development, production)
    3. All .env files in the project tree are scanned and linked
    4. One password per environment encrypts all files within it
    5. ${pc.cyan("tokengate push")} / ${pc.cyan("tokengate pull")} syncs files with full paths

  ${pc.bold("File scanning")}
    Recursively finds .env files across the project tree.
    Skips: .env.example, .env.sample, .env.template, .env.bak
    Paths shown relative to project root (e.g. apps/web/.env.local)

  ${pc.bold("Environment variables")}
    ${pc.dim("TOKENGATE_APP_URL")}   Override app URL (default: https://tokengate.dev)
`);

  p.outro(`${pc.dim("Docs:")} https://tokengate.dev/docs`);
}
