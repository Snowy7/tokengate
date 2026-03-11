#!/usr/bin/env bun

import { randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { hostname } from "node:os";
import { dirname, resolve } from "node:path";
import { stdin as input, stdout as output } from "node:process";
import { createInterface } from "node:readline/promises";
import {
  bootstrapWorkspace,
  decryptVaultPayload,
  decryptRevisionPayload,
  encryptVaultPayload,
  encryptRevisionPayload,
  generateDeviceKeyPair,
  wrapWorkspaceKeyForDevice,
  restoreWorkspaceKeyFromRecoveryPhrase
} from "@tokengate/crypto";
import { normalizeEnvDocument } from "@tokengate/env-format";
import { TokengateConvexClient } from "@tokengate/sdk/convex-client";
import {
  convexFunctions,
  type CliConfig,
  type CreateRevisionResult,
  type DeviceLoginSession,
  type Environment,
  type Project,
  type SecretRevision,
  type SecretSet,
  type Workspace,
  type WorkspaceWithMembership
} from "@tokengate/sdk";
import { getConfigPath, getRecoveryDirPath, loadConfig, saveConfig } from "./config";

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
    case "setup":
      return handleInit([]);
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
  if (args.length < 2) {
    return runInitWizard();
  }

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
  await saveWorkspaceContext(config, workspaceKeys, { workspaceId });

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
  console.log(`Last project: ${config.lastProjectId ?? "none"}`);
  console.log(`Last environment: ${config.lastEnvironmentId ?? "none"}`);
  console.log(`Last secret set: ${config.lastSecretSetId ?? "none"}`);
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
  const config = await requireAuthenticatedConfig();
  const workspaceId = args[1] ?? config.lastWorkspaceId;
  const secretSetId = args[2] ?? config.lastSecretSetId;

  if (!workspaceId || !secretSetId) {
    throw new Error("Usage: tokengate push <file> [workspace-id] [secret-set-id]. Run `tokengate init` first.");
  }

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
  const config = await requireAuthenticatedConfig();
  const secretSetId = args[0] ?? config.lastSecretSetId;
  const workspaceId = args[1] ?? config.lastWorkspaceId;
  const outputPath = resolve(args[2] ?? ".env");

  if (!secretSetId || !workspaceId) {
    throw new Error("Usage: tokengate pull [secret-set-id] [workspace-id] [output]. Run `tokengate init` first.");
  }

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
  const config = await requireAuthenticatedConfig();
  const secretSetId = args[0] ?? config.lastSecretSetId;
  if (!secretSetId) {
    throw new Error("Usage: tokengate history [secret-set-id]. Run `tokengate init` first.");
  }

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

async function runInitWizard() {
  const config = await requireAuthenticatedConfig();
  const passphrase = process.env.TOKENGATE_VAULT_PASSPHRASE;
  if (!passphrase) {
    throw new Error("Set TOKENGATE_VAULT_PASSPHRASE before running `tokengate init`.");
  }
  if (!config.publicKey) {
    throw new Error("This device is missing its local keypair. Run `tokengate login` again.");
  }

  const client = getConvexClient(config);
  const prompt = createPrompt();
  const workspaceKeys = await readWorkspaceKeyVault(config, passphrase);

  try {
    printBanner("Tokengate Setup");
    printMuted("This will guide you through selecting or creating a workspace, project, and environment.");

    const workspaces = await client.query<WorkspaceWithMembership[]>(convexFunctions.listWorkspaces, {});
    const workspaceSelection = await chooseWorkspace(prompt, client, config, workspaces, workspaceKeys);

    let selectedWorkspaceId = workspaceSelection.workspace.id;
    let nextWorkspaceKeys = workspaceSelection.workspaceKeys;

    const projects = workspaceSelection.createdNew
      ? []
      : await client.query<Project[]>(convexFunctions.listProjects, {
          workspaceId: selectedWorkspaceId
        });
    const project = await chooseProject(prompt, client, selectedWorkspaceId, projects, workspaceSelection.createdNew);

    const environments = workspaceSelection.createdNew
      ? []
      : await client.query<Environment[]>(convexFunctions.listEnvironments, {
          projectId: project.id
        });
    const environment = await chooseEnvironment(prompt, client, project.id, environments, workspaceSelection.createdNew);

    const secretSet = await client.query<SecretSet | null>(convexFunctions.getSecretSetForEnvironment, {
      environmentId: environment.id
    });

    if (!secretSet) {
      throw new Error("The selected environment does not have a secret set yet.");
    }

    await saveWorkspaceContext(config, nextWorkspaceKeys, {
      workspaceId: selectedWorkspaceId,
      projectId: project.id,
      environmentId: environment.id,
      secretSetId: secretSet.id
    });

    printSuccess("CLI target is ready.");
    console.log(`Workspace: ${workspaceSelection.workspace.name}  ${formatCode(selectedWorkspaceId)}`);
    console.log(`Project:   ${project.name}  ${formatCode(project.id)}`);
    console.log(`Env:       ${environment.name}  ${formatCode(environment.id)}`);
    console.log(`SecretSet: ${formatCode(secretSet.id)}`);

    const nextAction = await prompt.select("What do you want to do next?", [
      "Finish setup",
      "Pull the latest env file",
      "Push a local env file"
    ]);

    if (nextAction === 1) {
      const outputPath = await prompt.input("Output file", ".env");
      await handlePull([secretSet.id, selectedWorkspaceId, outputPath]);
    } else if (nextAction === 2) {
      const inputPath = await prompt.input("Env file to push", ".env");
      await handlePush([inputPath, selectedWorkspaceId, secretSet.id]);
    }
  } finally {
    prompt.close();
  }
}

async function chooseWorkspace(
  prompt: ReturnType<typeof createPrompt>,
  client: TokengateConvexClient,
  config: CliConfig,
  workspaces: WorkspaceWithMembership[],
  workspaceKeys: Record<string, string>
) {
  const options = workspaces.map((entry) => ({
    label: `${entry.workspace?.name ?? "Unknown"} (${entry.membership.role})`,
    value: entry.workspace
  }));
  options.push({ label: "Create new workspace", value: null });

  const choice = await prompt.select("Choose a workspace", options.map((item) => item.label));
  const selected = options[choice]?.value;

  if (!selected) {
    const name = await prompt.input("Workspace name", "Acme");
    const typeIndex = await prompt.select("Workspace type", ["Team", "Personal"]);
    const bootstrap = await bootstrapWorkspace();
    const wrapped = await wrapWorkspaceKeyForDevice(bootstrap.workspaceKey, config.publicKey!);
    const workspaceId = await client.mutation<string>(convexFunctions.createWorkspace, {
      name,
      slug: toSlug(name),
      type: typeIndex === 0 ? "team" : "personal",
      ownerWrappedWorkspaceKey: wrapped
    });

    const nextWorkspaceKeys = { ...workspaceKeys, [workspaceId]: bootstrap.workspaceKey };
    await saveWorkspaceContext(config, nextWorkspaceKeys, { workspaceId });
    printSuccess(`Created workspace ${formatCode(name)}.`);
    const recoveryPath = await saveRecoveryPhrase(workspaceId, name, bootstrap.recoveryPhrase);
    printSuccess(`Recovery phrase saved to ${recoveryPath}`);
    printWarning("Keep that recovery file somewhere safe.");

    return {
      workspace: {
        id: workspaceId,
        name,
        slug: toSlug(name),
        type: typeIndex === 0 ? "team" : "personal",
        createdAt: Date.now(),
        createdBy: "me"
      } satisfies Workspace,
      workspaceKeys: nextWorkspaceKeys,
      createdNew: true
    };
  }

  const nextWorkspaceKeys = { ...workspaceKeys };
  if (!nextWorkspaceKeys[selected.id]) {
    const importKey = await prompt.confirm("This workspace is not linked locally yet. Import its recovery phrase now?", true);
    if (importKey) {
      const recoveryPhrase = await prompt.input("Recovery phrase");
      nextWorkspaceKeys[selected.id] = restoreWorkspaceKeyFromRecoveryPhrase(recoveryPhrase);
      await saveWorkspaceContext(config, nextWorkspaceKeys, { workspaceId: selected.id });
      printSuccess("Workspace linked locally.");
    } else {
      printWarning("Continuing without a local workspace key. Pull/push will fail until you import it.");
    }
  }

  return {
    workspace: selected,
    workspaceKeys: nextWorkspaceKeys,
    createdNew: false
  };
}

async function chooseProject(
  prompt: ReturnType<typeof createPrompt>,
  client: TokengateConvexClient,
  workspaceId: string,
  projects: Project[],
  forceCreate: boolean
) {
  if (forceCreate || projects.length === 0) {
    printMuted("No projects found in this workspace yet.");
  } else {
    const options: Array<{ label: string; value: Project | null }> = projects.map((project) => ({
      label: project.name,
      value: project
    }));
    options.push({ label: "Create new project", value: null });
    const choice = await prompt.select("Choose a project", options.map((item) => item.label));
    const selected = options[choice]?.value;

    if (selected) {
      return selected;
    }
  }

  const name = await prompt.input("Project name", "web");
  const projectId = await client.mutation<string>(convexFunctions.createProject, {
    workspaceId,
    name,
    slug: toSlug(name)
  });
  printSuccess(`Created project ${formatCode(name)}.`);
  return {
    id: projectId,
    workspaceId,
    name,
    slug: toSlug(name),
    createdAt: Date.now()
  };
}

async function chooseEnvironment(
  prompt: ReturnType<typeof createPrompt>,
  client: TokengateConvexClient,
  projectId: string,
  environments: Environment[],
  forceCreate: boolean
) {
  if (forceCreate || environments.length === 0) {
    printMuted("No environments found in this project yet.");
  } else {
    const options: Array<{ label: string; value: Environment | null }> = environments.map((environment) => ({
      label: environment.name,
      value: environment
    }));
    options.push({ label: "Create new environment", value: null });
    const choice = await prompt.select("Choose an environment", options.map((item) => item.label));
    const selected = options[choice]?.value;

    if (selected) {
      return selected;
    }
  }

  const name = await prompt.input("Environment name", "development");
  const environmentId = await client.mutation<string>(convexFunctions.createEnvironment, {
    projectId,
    name,
    slug: toSlug(name)
  });
  printSuccess(`Created environment ${formatCode(name)}.`);
  return {
    id: environmentId,
    projectId,
    name,
    slug: toSlug(name),
    createdAt: Date.now()
  };
}

async function saveWorkspaceContext(
  config: CliConfig,
  workspaceKeys: Record<string, string>,
  target: {
    workspaceId?: string;
    projectId?: string;
    environmentId?: string;
    secretSetId?: string;
  }
) {
  const passphrase = process.env.TOKENGATE_VAULT_PASSPHRASE;
  if (!passphrase) {
    throw new Error("Set TOKENGATE_VAULT_PASSPHRASE before saving workspace keys.");
  }

  await saveConfig({
    ...config,
    encryptedWorkspaceKeys: await encryptVaultPayload(JSON.stringify(workspaceKeys), passphrase),
    lastWorkspaceId: target.workspaceId ?? config.lastWorkspaceId,
    lastProjectId: target.projectId ?? config.lastProjectId,
    lastEnvironmentId: target.environmentId ?? config.lastEnvironmentId,
    lastSecretSetId: target.secretSetId ?? config.lastSecretSetId
  });
}

async function saveRecoveryPhrase(workspaceId: string, workspaceName: string, recoveryPhrase: string) {
  const dirPath = getRecoveryDirPath();
  await mkdir(dirPath, { recursive: true });
  const filename = `${toSlug(workspaceName)}-${workspaceId}.txt`;
  const filePath = resolve(dirPath, filename);
  await writeFile(
    filePath,
    `Tokengate recovery phrase\nworkspace=${workspaceName}\nworkspace_id=${workspaceId}\nrecovery_phrase=${recoveryPhrase}\n`
  );
  return filePath;
}

function printHelp() {
  printBanner("Tokengate CLI");
  console.log(`Commands:
  login [device-label]                 Sign in this machine in the browser
  init                                 Guided setup for workspace, project, and environment
  init <workspace-id> <recovery>       Store a workspace key from the recovery phrase
  setup                                Alias for interactive init
  status                               Show safe local status
  workspaces                           List available workspaces
  push <file> [workspace-id] [set]     Encrypt and push a revision
  pull [set] [workspace-id] [output]   Pull the latest revision and write a .env file
  history [set]                        Show remote revision history`);
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

function toSlug(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "untitled";
}

function createPrompt() {
  const rl = createInterface({ input, output });

  return {
    async input(label: string, defaultValue?: string) {
      const suffix = defaultValue ? ` (${defaultValue})` : "";
      const answer = (await rl.question(`${label}${suffix}: `)).trim();
      return answer || defaultValue || "";
    },
    async confirm(label: string, defaultValue = true) {
      const hint = defaultValue ? "Y/n" : "y/N";
      const answer = (await rl.question(`${label} [${hint}]: `)).trim().toLowerCase();
      if (!answer) {
        return defaultValue;
      }
      return answer === "y" || answer === "yes";
    },
    async select(label: string, options: string[]) {
      if (!process.stdin.isTTY || !process.stdout.isTTY) {
        console.log(label);
        options.forEach((option, index) => {
          console.log(`  ${index + 1}. ${option}`);
        });
        while (true) {
          const raw = (await rl.question("Choose a number: ")).trim();
          const parsed = Number(raw);
          if (Number.isInteger(parsed) && parsed >= 1 && parsed <= options.length) {
            return parsed - 1;
          }
          printWarning("Enter one of the listed numbers.");
        }
      }

      rl.pause();
      return arrowSelect(label, options);
    },
    close() {
      rl.close();
    }
  };
}

async function arrowSelect(label: string, options: string[]) {
  let selected = 0;

  const render = () => {
    output.write("\u001b[2J\u001b[H");
    console.log(bold(label));
    console.log(dim("Use ↑/↓ to move, Enter to confirm.\n"));
    options.forEach((option, index) => {
      const prefix = index === selected ? cyan("›") : " ";
      const line = index === selected ? bold(option) : dim(option);
      console.log(`${prefix} ${line}`);
    });
  };

  render();

  return await new Promise<number>((resolve) => {
    const onData = (buffer: Buffer) => {
      const key = buffer.toString("utf8");

      if (key === "\u0003") {
        cleanup();
        throw new Error("Interrupted");
      }

      if (key === "\r" || key === "\n") {
        const choice = selected;
        cleanup();
        console.log();
        resolve(choice);
        return;
      }

      if (key === "\u001b[A") {
        selected = (selected - 1 + options.length) % options.length;
        render();
        return;
      }

      if (key === "\u001b[B") {
        selected = (selected + 1) % options.length;
        render();
      }
    };

    const cleanup = () => {
      if (input.isTTY) {
        input.setRawMode(false);
      }
      input.off("data", onData);
      input.pause();
    };

    if (input.isTTY) {
      input.setRawMode(true);
    }
    input.resume();
    input.on("data", onData);
  });
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
