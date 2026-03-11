"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import {
  bootstrapWorkspace,
  decryptVaultPayload,
  decryptRevisionPayload,
  encryptVaultPayload,
  encryptRevisionPayload,
  generateDeviceKeyPair,
  wrapWorkspaceKeyForDevice
} from "@tokengate/crypto";
import { normalizeEnvDocument } from "@tokengate/env-format";
import type {
  Environment,
  Project,
  SecretRevision,
  SecretSet,
  WorkspaceWithMembership
} from "@tokengate/sdk";

const STORAGE_KEY = "tokengate.workspaceKeys";

interface WorkspaceKeyMap {
  [workspaceId: string]: string;
}

export function DashboardClient() {
  const [workspaces, setWorkspaces] = useState<WorkspaceWithMembership[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [environments, setEnvironments] = useState<Environment[]>([]);
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<string>("");
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [selectedEnvironmentId, setSelectedEnvironmentId] = useState<string>("");
  const [secretSet, setSecretSet] = useState<SecretSet | null>(null);
  const [latestRevision, setLatestRevision] = useState<SecretRevision | null>(null);
  const [history, setHistory] = useState<SecretRevision[]>([]);
  const [workspaceKeys, setWorkspaceKeys] = useState<WorkspaceKeyMap>({});
  const [workspaceName, setWorkspaceName] = useState("Acme");
  const [projectName, setProjectName] = useState("web");
  const [environmentName, setEnvironmentName] = useState("production");
  const [envContent, setEnvContent] = useState("API_URL=https://api.tokengate.dev\nTOKEN=replace-me\n");
  const [recoveryPhrase, setRecoveryPhrase] = useState("");
  const [status, setStatus] = useState("Create your first workspace to start syncing revisions.");
  const [vaultPassphrase, setVaultPassphrase] = useState("");
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    void refreshWorkspaces();
  }, []);

  useEffect(() => {
    if (!selectedWorkspaceId) {
      setProjects([]);
      return;
    }

    void fetchJson<{ projects: Project[] }>(`/api/projects?workspaceId=${selectedWorkspaceId}`).then((payload) => {
      setProjects(payload.projects);
      setSelectedProjectId((current) =>
        payload.projects.some((project) => project.id === current) ? current : payload.projects[0]?.id ?? ""
      );
    });
  }, [selectedWorkspaceId]);

  useEffect(() => {
    if (!selectedProjectId) {
      setEnvironments([]);
      return;
    }

    void fetchJson<{ environments: Environment[] }>(`/api/environments?projectId=${selectedProjectId}`).then((payload) => {
      setEnvironments(payload.environments);
      setSelectedEnvironmentId((current) =>
        payload.environments.some((environment) => environment.id === current) ? current : payload.environments[0]?.id ?? ""
      );
    });
  }, [selectedProjectId]);

  useEffect(() => {
    if (!selectedEnvironmentId) {
      setSecretSet(null);
      setLatestRevision(null);
      setHistory([]);
      return;
    }

    void loadEnvironment(selectedEnvironmentId);
  }, [selectedEnvironmentId]);

  const selectedWorkspaceKey = selectedWorkspaceId ? workspaceKeys[selectedWorkspaceId] : undefined;
  const selectedWorkspace = useMemo(
    () => workspaces.find((item) => item.workspace?.id === selectedWorkspaceId)?.workspace ?? null,
    [selectedWorkspaceId, workspaces]
  );

  async function refreshWorkspaces() {
    const payload = await fetchJson<{ workspaces: WorkspaceWithMembership[] }>("/api/workspaces");
    setWorkspaces(payload.workspaces);
    setSelectedWorkspaceId((current) =>
      payload.workspaces.some((item) => item.workspace?.id === current)
        ? current
        : payload.workspaces[0]?.workspace?.id ?? ""
    );
  }

  async function loadEnvironment(environmentId: string) {
    const secretPayload = await fetchJson<{ secretSet: SecretSet | null }>(`/api/secret-sets?environmentId=${environmentId}`);
    setSecretSet(secretPayload.secretSet);

    if (!secretPayload.secretSet?.id) {
      setLatestRevision(null);
      setHistory([]);
      return;
    }

    const [latestPayload, historyPayload] = await Promise.all([
      fetchJson<{ revision: SecretRevision | null }>(`/api/revisions/latest?secretSetId=${secretPayload.secretSet.id}`),
      fetchJson<{ revisions: SecretRevision[] }>(`/api/revisions/history?secretSetId=${secretPayload.secretSet.id}`)
    ]);

    setLatestRevision(latestPayload.revision);
    setHistory(historyPayload.revisions.slice().sort((left, right) => right.revision - left.revision));

    if (latestPayload.revision && selectedWorkspaceId && workspaceKeys[selectedWorkspaceId]) {
      const plaintext = await decryptRevisionPayload(
        {
          ciphertext: latestPayload.revision.ciphertext,
          wrappedDataKey: latestPayload.revision.wrappedDataKey,
          contentHash: latestPayload.revision.contentHash
        },
        workspaceKeys[selectedWorkspaceId]
      );
      setEnvContent(plaintext);
    }
  }

  async function persistWorkspaceKey(workspaceId: string, workspaceKey: string) {
    if (!vaultPassphrase) {
      throw new Error("Set a local vault passphrase before saving workspace keys.");
    }

    const next = {
      ...(await readWorkspaceKeys(vaultPassphrase)),
      [workspaceId]: workspaceKey
    };
    localStorage.setItem(STORAGE_KEY, await encryptVaultPayload(JSON.stringify(next), vaultPassphrase));
    setWorkspaceKeys(next);
  }

  function handleCreateWorkspace() {
    startTransition(async () => {
      const bootstrap = await bootstrapWorkspace();
      const device = await generateDeviceKeyPair();
      const wrapped = await wrapWorkspaceKeyForDevice(bootstrap.workspaceKey, device.publicKey);
      const payload = await postJson<{ workspaceId: string }>("/api/workspaces", {
        name: workspaceName,
        slug: toSlug(workspaceName),
        type: "team",
        ownerWrappedWorkspaceKey: wrapped
      });

      await persistWorkspaceKey(payload.workspaceId, bootstrap.workspaceKey);
      setRecoveryPhrase(bootstrap.recoveryPhrase);
      setStatus("Workspace created. Recovery phrase generated locally and the key was saved in this browser.");
      await refreshWorkspaces();
      setSelectedWorkspaceId(payload.workspaceId);
    });
  }

  function handleUnlockVault() {
    startTransition(async () => {
      const keys = await readWorkspaceKeys(vaultPassphrase);
      setWorkspaceKeys(keys);
      setStatus(`Unlocked ${Object.keys(keys).length} locally stored workspace key${Object.keys(keys).length === 1 ? "" : "s"}.`);
    });
  }

  function handleCreateProject() {
    if (!selectedWorkspaceId) {
      setStatus("Select a workspace first.");
      return;
    }

    startTransition(async () => {
      const payload = await postJson<{ projectId: string }>("/api/projects", {
        workspaceId: selectedWorkspaceId,
        name: projectName,
        slug: toSlug(projectName)
      });

      setStatus("Project created.");
      await refreshWorkspaces();
      setSelectedProjectId(payload.projectId);
    });
  }

  function handleCreateEnvironment() {
    if (!selectedProjectId) {
      setStatus("Select a project first.");
      return;
    }

    startTransition(async () => {
      const payload = await postJson<{ environmentId: string }>("/api/environments", {
        projectId: selectedProjectId,
        name: environmentName,
        slug: toSlug(environmentName)
      });

      setStatus("Environment created.");
      await loadProjectEnvironments(selectedProjectId, payload.environmentId);
    });
  }

  function handleSaveRevision() {
    if (!secretSet?.id || !selectedWorkspaceId || !selectedWorkspaceKey) {
      setStatus("A workspace key and environment are required before you can save a revision.");
      return;
    }

    startTransition(async () => {
      const normalized = normalizeEnvDocument(envContent);
      const encrypted = await encryptRevisionPayload(normalized, selectedWorkspaceKey);
      const result = await postJson<{ conflict: boolean; acceptedRevision?: number; latestRevision?: number }>("/api/revisions", {
        secretSetId: secretSet.id,
        baseRevision: latestRevision?.revision,
        ciphertext: encrypted.ciphertext,
        wrappedDataKey: encrypted.wrappedDataKey,
        contentHash: encrypted.contentHash
      });

      if (result.conflict) {
        setStatus(`Conflict detected. Remote latest revision is ${result.latestRevision}. Reload before saving again.`);
        return;
      }

      setStatus(`Revision ${result.acceptedRevision} saved.`);
      await loadEnvironment(selectedEnvironmentId);
    });
  }

  async function loadProjectEnvironments(projectId: string, nextEnvironmentId?: string) {
    const payload = await fetchJson<{ environments: Environment[] }>(`/api/environments?projectId=${projectId}`);
    setEnvironments(payload.environments);
    setSelectedEnvironmentId(nextEnvironmentId ?? payload.environments[0]?.id ?? "");
  }

  return (
    <div className="grid" style={{ gridTemplateColumns: "0.95fr 1.05fr" }}>
      <section className="panel" style={{ padding: 24, display: "grid", gap: 18 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 28 }}>Workspace bootstrap</h2>
          <p className="muted" style={{ lineHeight: 1.6 }}>
            Create a workspace, keep the recovery phrase offline, and store the workspace key in this browser for local
            decryption.
          </p>
        </div>

        <label className="field">
          <span>Workspace name</span>
          <input value={workspaceName} onChange={(event) => setWorkspaceName(event.target.value)} />
        </label>

        <button
          className="button"
          onClick={handleCreateWorkspace}
          disabled={isPending || !workspaceName.trim() || !vaultPassphrase}
        >
          {isPending ? "Working..." : "Create workspace"}
        </button>

        <div className="grid" style={{ gridTemplateColumns: "1fr auto", alignItems: "end" }}>
          <label className="field">
            <span>Local vault passphrase</span>
            <input
              type="password"
              value={vaultPassphrase}
              onChange={(event) => setVaultPassphrase(event.target.value)}
              placeholder="Used to encrypt workspace keys in this browser"
            />
          </label>
          <button className="button secondary" onClick={handleUnlockVault} disabled={!vaultPassphrase || isPending}>
            Unlock vault
          </button>
        </div>

        {recoveryPhrase ? (
          <div>
            <p style={{ marginBottom: 8, fontWeight: 700 }}>Recovery phrase</p>
            <div className="code-block">{recoveryPhrase}</div>
          </div>
        ) : null}

        <label className="field">
          <span>Workspace</span>
          <select value={selectedWorkspaceId} onChange={(event) => setSelectedWorkspaceId(event.target.value)}>
            <option value="">Select a workspace</option>
            {workspaces.map((item) =>
              item.workspace ? (
                <option key={item.workspace.id} value={item.workspace.id}>
                  {item.workspace.name} ({item.membership.role})
                </option>
              ) : null
            )}
          </select>
        </label>

        {selectedWorkspace && !selectedWorkspaceKey ? (
          <div className="panel" style={{ padding: 16, borderRadius: 18 }}>
            <p style={{ margin: 0, fontWeight: 700 }}>Workspace key missing on this browser</p>
            <p className="muted" style={{ marginBottom: 12 }}>
              Unlock the local vault with its passphrase or import the workspace again from a recovery phrase on a
              trusted machine.
            </p>
          </div>
        ) : null}

        <div className="grid" style={{ gridTemplateColumns: "1fr auto", alignItems: "end" }}>
          <label className="field">
            <span>Project name</span>
            <input value={projectName} onChange={(event) => setProjectName(event.target.value)} />
          </label>
          <button className="button secondary" onClick={handleCreateProject} disabled={isPending || !selectedWorkspaceId}>
            Add project
          </button>
        </div>

        <label className="field">
          <span>Project</span>
          <select value={selectedProjectId} onChange={(event) => setSelectedProjectId(event.target.value)}>
            <option value="">Select a project</option>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </select>
        </label>

        <div className="grid" style={{ gridTemplateColumns: "1fr auto", alignItems: "end" }}>
          <label className="field">
            <span>Environment name</span>
            <input value={environmentName} onChange={(event) => setEnvironmentName(event.target.value)} />
          </label>
          <button className="button secondary" onClick={handleCreateEnvironment} disabled={isPending || !selectedProjectId}>
            Add environment
          </button>
        </div>

        <label className="field">
          <span>Environment</span>
          <select value={selectedEnvironmentId} onChange={(event) => setSelectedEnvironmentId(event.target.value)}>
            <option value="">Select an environment</option>
            {environments.map((environment) => (
              <option key={environment.id} value={environment.id}>
                {environment.name}
              </option>
            ))}
          </select>
        </label>

        <div className="muted">{status}</div>
      </section>

      <section className="panel" style={{ padding: 24, display: "grid", gap: 16 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 28 }}>Environment revision</h2>
          <p className="muted" style={{ lineHeight: 1.6 }}>
            The browser encrypts the normalized `.env` payload locally, sends only ciphertext to Convex, and decrypts
            the latest revision with the workspace key stored on this browser.
          </p>
        </div>

        <label className="field">
          <span>Current env payload</span>
          <textarea rows={16} value={envContent} onChange={(event) => setEnvContent(event.target.value)} spellCheck={false} />
        </label>

        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <button className="button" onClick={handleSaveRevision} disabled={isPending || !secretSet?.id || !selectedWorkspaceKey}>
            Save encrypted revision
          </button>
          <span className="muted">
            {latestRevision ? `Latest revision: ${latestRevision.revision}` : "No revisions saved yet"}
          </span>
        </div>

        <div>
          <p style={{ marginBottom: 8, fontWeight: 700 }}>Revision history</p>
          <div className="grid">
            {history.length > 0 ? (
              history.map((revision) => (
                <div key={revision.id} className="panel" style={{ padding: 16, borderRadius: 18 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                    <strong>Revision {revision.revision}</strong>
                    <span className="muted">{new Date(revision.createdAt).toLocaleString()}</span>
                  </div>
                  <div className="muted" style={{ marginTop: 8, fontFamily: "monospace" }}>
                    hash: {revision.contentHash.slice(0, 20)}...
                  </div>
                </div>
              ))
            ) : (
              <div className="muted">No revisions for this environment yet.</div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

async function readWorkspaceKeys(passphrase: string): Promise<WorkspaceKeyMap> {
  if (typeof window === "undefined") {
    return {};
  }

  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return {};
  }

  try {
    const decrypted = await decryptVaultPayload(raw, passphrase);
    return JSON.parse(decrypted) as WorkspaceKeyMap;
  } catch {
    return {};
  }
}

async function fetchJson<T>(input: string): Promise<T> {
  const response = await fetch(input, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(await response.text());
  }
  return (await response.json()) as T;
}

async function postJson<T>(input: string, body: unknown): Promise<T> {
  const response = await fetch(input, {
    method: "POST",
    headers: {
      "content-type": "application/json"
    },
    body: JSON.stringify(body)
  });
  if (!response.ok) {
    throw new Error(await response.text());
  }
  return (await response.json()) as T;
}

function toSlug(value: string) {
  return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}
