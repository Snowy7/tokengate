"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { UserButton } from "@clerk/nextjs";
import {
  deriveEnvironmentKey,
  generateSalt,
  decryptRevisionPayload,
  encryptRevisionPayload,
  generateDeviceKeyPair,
  bootstrapWorkspace,
  wrapWorkspaceKeyForDevice,
} from "@tokengate/crypto";
import {
  normalizeEnvDocument,
  parseEnvDocument,
  stringifyEnvEntries,
} from "@tokengate/env-format";
import type { EnvEntry } from "@tokengate/env-format";
import type {
  Environment,
  Project,
  SecretRevision,
  SecretSet,
  WorkspaceWithMembership,
} from "@tokengate/sdk";

// ---------------------------------------------------------------------------
// Icons
// ---------------------------------------------------------------------------

function IconLock({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0110 0v4" /></svg>
  );
}

function IconUnlock({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 019.9-1" /></svg>
  );
}

function IconPlus({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
  );
}

function IconTrash({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" /><path d="M10 11v6" /><path d="M14 11v6" /><path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2" /></svg>
  );
}

function IconChevron({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6" /></svg>
  );
}

function IconShield({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>
  );
}

function IconClock({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
  );
}

function IconX({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
  );
}

function IconFolder({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z" /></svg>
  );
}

function IconLayers({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2" /><polyline points="2 17 12 22 22 17" /><polyline points="2 12 12 17 22 12" /></svg>
  );
}

function IconBox({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z" /></svg>
  );
}

function IconCopy({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2" /><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" /></svg>
  );
}

function IconEye({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>
  );
}

function IconEyeOff({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24" /><line x1="1" y1="1" x2="23" y2="23" /></svg>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function fetchJson<T>(input: string): Promise<T> {
  const response = await fetch(input, { cache: "no-store" });
  if (!response.ok) throw new Error(await response.text());
  return (await response.json()) as T;
}

async function postJson<T>(input: string, body: unknown): Promise<T> {
  const response = await fetch(input, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!response.ok) throw new Error(await response.text());
  return (await response.json()) as T;
}

function toSlug(value: string) {
  return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

function formatRelativeTime(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(timestamp).toLocaleDateString();
}

interface Toast {
  id: number;
  message: string;
  variant: "info" | "error" | "success";
}

let toastCounter = 0;

type ModalKind = "workspace" | "project" | "environment" | null;

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function DashboardClient() {
  // --- Data ---
  const [workspaces, setWorkspaces] = useState<WorkspaceWithMembership[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [environments, setEnvironments] = useState<Environment[]>([]);
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState("");
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [selectedEnvironmentId, setSelectedEnvironmentId] = useState("");
  const [secretSet, setSecretSet] = useState<SecretSet | null>(null);
  const [latestRevision, setLatestRevision] = useState<SecretRevision | null>(null);
  const [history, setHistory] = useState<SecretRevision[]>([]);

  // --- Loading states ---
  const [loadingWorkspaces, setLoadingWorkspaces] = useState(true);
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [loadingEnvironments, setLoadingEnvironments] = useState(false);
  const [loadingSecrets, setLoadingSecrets] = useState(false);

  // --- Per-environment crypto ---
  const [envPassword, setEnvPassword] = useState("");
  const [derivedKey, setDerivedKey] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  // --- Editor ---
  const [envEntries, setEnvEntries] = useState<EnvEntry[]>([]);
  const [dirtyFlag, setDirtyFlag] = useState(false);

  // --- UI ---
  const [isPending, startTransition] = useTransition();
  const [modal, setModal] = useState<ModalKind>(null);
  const [modalName, setModalName] = useState("");
  const [modalPassword, setModalPassword] = useState("");
  const [toasts, setToasts] = useState<Toast[]>([]);

  // --- Derived ---
  const selectedWorkspace = useMemo(
    () => workspaces.find((w) => w.workspace?.id === selectedWorkspaceId)?.workspace ?? null,
    [selectedWorkspaceId, workspaces],
  );
  const selectedProject = useMemo(
    () => projects.find((p) => p.id === selectedProjectId) ?? null,
    [selectedProjectId, projects],
  );
  const selectedEnvironment = useMemo(
    () => environments.find((e) => e.id === selectedEnvironmentId) ?? null,
    [selectedEnvironmentId, environments],
  );
  const isEnvUnlocked = derivedKey !== null;

  // --- Toast ---
  const pushToast = useCallback((message: string, variant: Toast["variant"] = "info") => {
    const id = ++toastCounter;
    setToasts((prev) => [...prev, { id, message, variant }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4000);
  }, []);

  // --- Data loading ---
  const refreshWorkspaces = useCallback(async () => {
    setLoadingWorkspaces(true);
    try {
      const payload = await fetchJson<{ workspaces: WorkspaceWithMembership[] }>("/api/workspaces");
      setWorkspaces(payload.workspaces);
      setSelectedWorkspaceId((cur) =>
        payload.workspaces.some((w) => w.workspace?.id === cur) ? cur : payload.workspaces[0]?.workspace?.id ?? "",
      );
    } finally {
      setLoadingWorkspaces(false);
    }
  }, []);

  useEffect(() => { void refreshWorkspaces(); }, [refreshWorkspaces]);

  useEffect(() => {
    if (!selectedWorkspaceId) { setProjects([]); setLoadingProjects(false); return; }
    setLoadingProjects(true);
    void fetchJson<{ projects: Project[] }>(`/api/projects?workspaceId=${selectedWorkspaceId}`).then((p) => {
      setProjects(p.projects);
      setSelectedProjectId((cur) => p.projects.some((x) => x.id === cur) ? cur : p.projects[0]?.id ?? "");
    }).finally(() => setLoadingProjects(false));
  }, [selectedWorkspaceId]);

  useEffect(() => {
    if (!selectedProjectId) { setEnvironments([]); setLoadingEnvironments(false); return; }
    setLoadingEnvironments(true);
    void fetchJson<{ environments: Environment[] }>(`/api/environments?projectId=${selectedProjectId}`).then((p) => {
      setEnvironments(p.environments);
      setSelectedEnvironmentId((cur) => p.environments.some((x) => x.id === cur) ? cur : p.environments[0]?.id ?? "");
    }).finally(() => setLoadingEnvironments(false));
  }, [selectedProjectId]);

  // When environment changes, reset crypto state and load metadata
  useEffect(() => {
    setDerivedKey(null);
    setEnvPassword("");
    setEnvEntries([]);
    setDirtyFlag(false);
    setShowPassword(false);

    if (!selectedEnvironmentId) {
      setSecretSet(null);
      setLatestRevision(null);
      setHistory([]);
      return;
    }

    void loadSecretSetMeta(selectedEnvironmentId);
  }, [selectedEnvironmentId]); // eslint-disable-line react-hooks/exhaustive-deps

  async function loadSecretSetMeta(environmentId: string) {
    setLoadingSecrets(true);
    try {
      const sp = await fetchJson<{ secretSet: SecretSet | null }>(`/api/secret-sets?environmentId=${environmentId}`);
      setSecretSet(sp.secretSet);
      if (!sp.secretSet?.id) {
        setLatestRevision(null);
        setHistory([]);
        return;
      }
      // Fetch history and latest revision in parallel
      const [hp, lp] = await Promise.all([
        fetchJson<{ revisions: SecretRevision[] }>(`/api/revisions/history?secretSetId=${sp.secretSet.id}`),
        fetchJson<{ revision: SecretRevision | null }>(`/api/revisions/latest?secretSetId=${sp.secretSet.id}`),
      ]);
      setHistory(hp.revisions.slice().sort((a, b) => b.revision - a.revision));
      setLatestRevision(lp.revision);
    } finally {
      setLoadingSecrets(false);
    }
  }

  // --- Unlock environment with password ---
  function handleUnlockEnv() {
    if (!secretSet?.keySalt || !envPassword) return;
    startTransition(async () => {
      try {
        const key = await deriveEnvironmentKey(envPassword, secretSet.keySalt);

        // If there's a latest revision, try to decrypt it to verify the password
        if (latestRevision) {
          try {
            const plaintext = await decryptRevisionPayload(
              { ciphertext: latestRevision.ciphertext, wrappedDataKey: latestRevision.wrappedDataKey, contentHash: latestRevision.contentHash },
              key,
            );
            setEnvEntries(parseEnvDocument(plaintext));
          } catch {
            pushToast("Wrong password. Could not decrypt secrets.", "error");
            return;
          }
        }

        setDerivedKey(key);
        setDirtyFlag(false);
        pushToast("Environment unlocked.", "success");
      } catch {
        pushToast("Failed to derive key.", "error");
      }
    });
  }

  function handleLockEnv() {
    setDerivedKey(null);
    setEnvPassword("");
    setEnvEntries([]);
    setDirtyFlag(false);
    setShowPassword(false);
    pushToast("Environment locked.", "info");
  }

  // --- Save revision ---
  function handleSaveRevision() {
    if (!secretSet?.id || !derivedKey) return;
    startTransition(async () => {
      try {
        const normalized = normalizeEnvDocument(stringifyEnvEntries(envEntries));
        const encrypted = await encryptRevisionPayload(normalized, derivedKey);
        const result = await postJson<{ conflict: boolean; acceptedRevision?: number; latestRevision?: number }>("/api/revisions", {
          secretSetId: secretSet.id,
          baseRevision: latestRevision?.revision,
          ciphertext: encrypted.ciphertext,
          wrappedDataKey: encrypted.wrappedDataKey,
          contentHash: encrypted.contentHash,
        });
        if (result.conflict) {
          pushToast(`Conflict: remote is at revision ${result.latestRevision}. Reload and retry.`, "error");
          return;
        }
        setDirtyFlag(false);
        pushToast(`Revision ${result.acceptedRevision} saved.`, "success");
        await loadSecretSetMeta(selectedEnvironmentId);
        // Re-decrypt latest
        if (result.acceptedRevision !== undefined) {
          const lp = await fetchJson<{ revision: SecretRevision | null }>(`/api/revisions/latest?secretSetId=${secretSet.id}`);
          setLatestRevision(lp.revision);
        }
      } catch (err) {
        pushToast(err instanceof Error ? err.message : "Save failed.", "error");
      }
    });
  }

  // --- Create workspace (simplified — no recovery phrase needed for env-password model) ---
  function handleCreateWorkspace() {
    if (!modalName.trim()) return;
    startTransition(async () => {
      try {
        const bootstrap = await bootstrapWorkspace();
        const device = await generateDeviceKeyPair();
        const wrapped = await wrapWorkspaceKeyForDevice(bootstrap.workspaceKey, device.publicKey);
        const payload = await postJson<{ workspaceId: string }>("/api/workspaces", {
          name: modalName.trim(),
          slug: toSlug(modalName),
          type: "team",
          ownerWrappedWorkspaceKey: wrapped,
        });
        setModal(null);
        setModalName("");
        await refreshWorkspaces();
        setSelectedWorkspaceId(payload.workspaceId);
        pushToast("Workspace created.", "success");
      } catch (err) {
        pushToast(err instanceof Error ? err.message : "Failed.", "error");
      }
    });
  }

  function handleCreateProject() {
    if (!modalName.trim() || !selectedWorkspaceId) return;
    startTransition(async () => {
      try {
        const payload = await postJson<{ projectId: string }>("/api/projects", {
          workspaceId: selectedWorkspaceId,
          name: modalName.trim(),
          slug: toSlug(modalName),
        });
        setModal(null);
        setModalName("");
        pushToast("Project created.", "success");
        setSelectedProjectId(payload.projectId);
      } catch (err) {
        pushToast(err instanceof Error ? err.message : "Failed.", "error");
      }
    });
  }

  function handleCreateEnvironment() {
    if (!modalName.trim() || !modalPassword.trim() || !selectedProjectId) return;
    startTransition(async () => {
      try {
        const keySalt = generateSalt();
        const payload = await postJson<{ environmentId: string }>("/api/environments", {
          projectId: selectedProjectId,
          name: modalName.trim(),
          slug: toSlug(modalName),
          keySalt,
        });
        setModal(null);
        setModalName("");
        setModalPassword("");
        pushToast("Environment created. Use your password to unlock it.", "success");
        // Reload environments and select the new one
        const ep = await fetchJson<{ environments: Environment[] }>(`/api/environments?projectId=${selectedProjectId}`);
        setEnvironments(ep.environments);
        setSelectedEnvironmentId(payload.environmentId);
      } catch (err) {
        pushToast(err instanceof Error ? err.message : "Failed.", "error");
      }
    });
  }

  function handleModalSubmit() {
    if (modal === "workspace") handleCreateWorkspace();
    else if (modal === "project") handleCreateProject();
    else if (modal === "environment") handleCreateEnvironment();
  }

  // --- Editor helpers ---
  function updateEntry(index: number, field: "key" | "value", val: string) {
    setEnvEntries((prev) => prev.map((e, i) => (i === index ? { ...e, [field]: val } : e)));
    setDirtyFlag(true);
  }

  function removeEntry(index: number) {
    setEnvEntries((prev) => prev.filter((_, i) => i !== index));
    setDirtyFlag(true);
  }

  function addEntry() {
    setEnvEntries((prev) => [...prev, { key: "", value: "" }]);
    setDirtyFlag(true);
  }

  const modalLabels: Record<NonNullable<ModalKind>, { title: string; placeholder: string }> = {
    workspace: { title: "New workspace", placeholder: "Workspace name" },
    project: { title: "New project", placeholder: "Project name" },
    environment: { title: "New environment", placeholder: "Environment name" },
  };

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  return (
    <div className="dashboard">
      {/* SIDEBAR */}
      <aside className="sidebar">
        <div className="sidebar-header">
          <IconShield size={22} />
          <span>Tokengate</span>
        </div>

        {/* Workspaces */}
        <div className="sidebar-section">
          <span className="sidebar-section-label">Workspaces</span>
          {loadingWorkspaces && (
            <>
              <div className="sidebar-skeleton" /><div className="sidebar-skeleton" style={{ width: "60%" }} />
            </>
          )}
          {!loadingWorkspaces && workspaces.length === 0 && <span className="muted" style={{ fontSize: 13, padding: "0 12px" }}>No workspaces yet</span>}
          {workspaces.map((w) => w.workspace ? (
            <button key={w.workspace.id} className={`sidebar-item${w.workspace.id === selectedWorkspaceId ? " active" : ""}`} onClick={() => setSelectedWorkspaceId(w.workspace!.id)}>
              <IconBox size={14} /><span>{w.workspace.name}</span>
              <span className="muted" style={{ fontSize: 11, marginLeft: "auto" }}>{w.membership.role}</span>
            </button>
          ) : null)}
        </div>

        {/* Projects */}
        {selectedWorkspaceId && (
          <div className="sidebar-section">
            <span className="sidebar-section-label">Projects</span>
            {loadingProjects && (
              <>
                <div className="sidebar-skeleton" /><div className="sidebar-skeleton" style={{ width: "55%" }} />
              </>
            )}
            {!loadingProjects && projects.length === 0 && <span className="muted" style={{ fontSize: 13, padding: "0 12px" }}>No projects</span>}
            {projects.map((p) => (
              <button key={p.id} className={`sidebar-item${p.id === selectedProjectId ? " active" : ""}`} onClick={() => setSelectedProjectId(p.id)}>
                <IconFolder size={14} /><span>{p.name}</span>
              </button>
            ))}
          </div>
        )}

        {/* Environments */}
        {selectedProjectId && (
          <div className="sidebar-section">
            <span className="sidebar-section-label">Environments</span>
            {loadingEnvironments && (
              <>
                <div className="sidebar-skeleton" /><div className="sidebar-skeleton" style={{ width: "50%" }} />
              </>
            )}
            {!loadingEnvironments && environments.length === 0 && <span className="muted" style={{ fontSize: 13, padding: "0 12px" }}>No environments</span>}
            {environments.map((e) => (
              <button key={e.id} className={`sidebar-item${e.id === selectedEnvironmentId ? " active" : ""}`} onClick={() => setSelectedEnvironmentId(e.id)}>
                <IconLayers size={14} /><span>{e.name}</span>
                {e.id === selectedEnvironmentId && (
                  <span style={{ marginLeft: "auto" }}>
                    {isEnvUnlocked ? <IconUnlock size={12} /> : <IconLock size={12} />}
                  </span>
                )}
              </button>
            ))}
          </div>
        )}

        <div className="divider" />
        <div className="sidebar-section">
          <button className="sidebar-item" onClick={() => { setModal("workspace"); setModalName(""); }}>
            <IconPlus size={14} /><span>New workspace</span>
          </button>
          <button className="sidebar-item" onClick={() => { setModal("project"); setModalName(""); }} disabled={!selectedWorkspaceId}>
            <IconPlus size={14} /><span>New project</span>
          </button>
          <button className="sidebar-item" onClick={() => { setModal("environment"); setModalName(""); setModalPassword(""); }} disabled={!selectedProjectId}>
            <IconPlus size={14} /><span>New environment</span>
          </button>
        </div>

        <div style={{ marginTop: "auto", padding: "12px 18px", borderTop: "1px solid var(--sidebar-border)", display: "flex", alignItems: "center", gap: 10 }}>
          <UserButton appearance={{ elements: { avatarBox: { width: 28, height: 28 } } }} />
          <span className="muted" style={{ fontSize: 12 }}>Account</span>
        </div>
      </aside>

      {/* MAIN */}
      <main className="main-content">
        {/* Breadcrumb header */}
        <div className="content-header">
          <nav className="breadcrumb">
            {selectedWorkspace && (
              <>
                <span>{selectedWorkspace.name}</span>
                {selectedProject && <><IconChevron size={12} /><span>{selectedProject.name}</span></>}
                {selectedEnvironment && <><IconChevron size={12} /><span>{selectedEnvironment.name}</span></>}
              </>
            )}
            {!selectedWorkspace && !loadingWorkspaces && <span className="muted">Select a workspace to begin</span>}
            {loadingWorkspaces && <span className="muted">Loading...</span>}
          </nav>
          <div className="status-bar">
            {isEnvUnlocked && selectedEnvironment && (
              <>
                <span className="tag encrypted"><IconShield size={12} /> E2E Encrypted</span>
                <span className="tag" style={{ cursor: "pointer" }} onClick={handleLockEnv}><IconUnlock size={12} /> Unlocked</span>
              </>
            )}
            {!isEnvUnlocked && selectedEnvironment && secretSet && (
              <span className="tag locked"><IconLock size={12} /> Locked</span>
            )}
          </div>
        </div>

        {/* Initial loading — workspaces haven't loaded yet */}
        {loadingWorkspaces && (
          <div className="empty-state fade-in">
            <div className="loading-spinner" />
            <p className="muted" style={{ marginTop: 16 }}>Loading your workspaces...</p>
          </div>
        )}

        {/* Loading projects after workspace selected */}
        {!loadingWorkspaces && selectedWorkspaceId && loadingProjects && !selectedProjectId && (
          <div className="empty-state fade-in">
            <div className="loading-spinner" />
            <p className="muted" style={{ marginTop: 16 }}>Loading projects...</p>
          </div>
        )}

        {/* Loading environments after project selected */}
        {!loadingWorkspaces && !loadingProjects && selectedProjectId && loadingEnvironments && !selectedEnvironmentId && (
          <div className="empty-state fade-in">
            <div className="loading-spinner" />
            <p className="muted" style={{ marginTop: 16 }}>Loading environments...</p>
          </div>
        )}

        {/* Loading secret set metadata */}
        {!loadingWorkspaces && selectedEnvironmentId && loadingSecrets && (
          <div className="empty-state fade-in">
            <div className="loading-spinner" />
            <p className="muted" style={{ marginTop: 16 }}>Loading secrets...</p>
          </div>
        )}

        {/* No workspaces — only show after loading completes */}
        {!loadingWorkspaces && workspaces.length === 0 && (
          <div className="empty-state fade-in">
            <div style={{
              width: 72,
              height: 72,
              border: "3px solid var(--border)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 24,
            }}>
              <IconShield size={32} />
            </div>
            <h2 style={{ margin: "0 0 8px", fontSize: 20, fontFamily: "var(--font-heading)", fontWeight: 800 }}>No workspaces yet</h2>
            <p className="muted" style={{ maxWidth: 380, lineHeight: 1.6, margin: "0 auto 28px", fontSize: 14 }}>
              Create a workspace to start syncing encrypted environment variables across your team.
            </p>
            <button
              className="button"
              onClick={() => { setModal("workspace"); setModalName(""); }}
              style={{
                padding: "14px 28px",
                fontSize: 14,
                fontFamily: "var(--font-mono)",
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <IconPlus size={14} /> New workspace
            </button>
          </div>
        )}

        {/* No environment selected */}
        {!loadingWorkspaces && !loadingProjects && !loadingEnvironments && workspaces.length > 0 && !selectedEnvironmentId && (
          <div className="empty-state fade-in">
            <div style={{
              width: 56,
              height: 56,
              border: "3px solid var(--border)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 20,
            }}>
              <IconLayers size={24} />
            </div>
            <h3 style={{ margin: "0 0 6px", fontFamily: "var(--font-heading)", fontWeight: 700, fontSize: 17 }}>No environment selected</h3>
            <p className="muted" style={{ fontSize: 13 }}>Select or create an environment from the sidebar.</p>
          </div>
        )}

        {/* Environment selected but locked */}
        {!loadingSecrets && selectedEnvironmentId && secretSet && !isEnvUnlocked && (
          <div className="lock-screen fade-in">
            <div className="lock-icon"><IconLock size={32} /></div>
            <h2 style={{ marginBottom: 8 }}>Enter environment password</h2>
            <p className="muted" style={{ maxWidth: 380, lineHeight: 1.6, marginBottom: 20 }}>
              This environment's secrets are encrypted. Enter the password to decrypt and view them.
            </p>
            <div style={{ display: "flex", gap: 8, alignItems: "flex-end", maxWidth: 400 }}>
              <div className="field" style={{ flex: 1, position: "relative" }}>
                <input
                  type={showPassword ? "text" : "password"}
                  value={envPassword}
                  onChange={(e) => setEnvPassword(e.target.value)}
                  placeholder="Environment password"
                  onKeyDown={(e) => { if (e.key === "Enter" && envPassword) handleUnlockEnv(); }}
                  autoFocus
                />
                <button
                  className="icon-button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{ position: "absolute", right: 4, top: "50%", transform: "translateY(-50%)" }}
                  type="button"
                >
                  {showPassword ? <IconEyeOff size={14} /> : <IconEye size={14} />}
                </button>
              </div>
              <button className="button" onClick={handleUnlockEnv} disabled={!envPassword || isPending}>
                {isPending ? "Decrypting..." : "Unlock"}
              </button>
            </div>
            {!latestRevision && (
              <p className="muted" style={{ marginTop: 12, fontSize: 12 }}>No secrets pushed yet. Unlock to start adding variables.</p>
            )}
          </div>
        )}

        {/* Environment selected, no secret set (edge case — only after loading) */}
        {!loadingSecrets && selectedEnvironmentId && !secretSet && (
          <div className="empty-state fade-in">
            <IconShield size={40} />
            <h3 style={{ margin: "12px 0 4px" }}>No secret set</h3>
            <p className="muted">This environment is missing its secret store. Try recreating it.</p>
          </div>
        )}

        {/* UNLOCKED — Key-value editor */}
        {!loadingSecrets && selectedEnvironmentId && secretSet && isEnvUnlocked && (
          <div className="fade-in" style={{ padding: 24 }}>
            <div className="env-editor panel">
              <div className="env-editor-header">
                <div>
                  <strong style={{ fontSize: 15 }}>Environment variables</strong>
                  {latestRevision && <span className="muted" style={{ fontSize: 13, marginLeft: 8 }}>r{latestRevision.revision}</span>}
                </div>
                <div className="env-actions">
                  {dirtyFlag && <span className="tag" style={{ fontSize: 12 }}>Unsaved changes</span>}
                  <button className="button" onClick={handleSaveRevision} disabled={isPending || envEntries.length === 0}>
                    {isPending ? "Encrypting..." : "Save encrypted"}
                  </button>
                </div>
              </div>

              {envEntries.length > 0 && (
                <div className="env-row env-row-header">
                  <span className="env-key">KEY</span>
                  <span className="env-value">VALUE</span>
                  <span className="env-remove" />
                </div>
              )}

              {envEntries.map((entry, i) => (
                <div className="env-row" key={i}>
                  <input className="env-key" value={entry.key} onChange={(e) => updateEntry(i, "key", e.target.value)} placeholder="KEY" spellCheck={false} />
                  <input className="env-value" value={entry.value} onChange={(e) => updateEntry(i, "value", e.target.value)} placeholder="value" spellCheck={false} />
                  <button className="env-remove" onClick={() => removeEntry(i)} title="Remove"><IconTrash size={14} /></button>
                </div>
              ))}

              <button className="env-add" onClick={addEntry}><IconPlus size={14} /> Add variable</button>
            </div>

            {/* Revision history */}
            {history.length > 0 && (
              <div style={{ marginTop: 24 }}>
                <strong style={{ fontSize: 15, display: "block", marginBottom: 12 }}>Revision history</strong>
                <div className="revision-list">
                  {history.map((rev) => (
                    <div key={rev.id} className={`revision-item${rev.id === latestRevision?.id ? " current" : ""}`}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <IconClock size={13} />
                        <strong>r{rev.revision}</strong>
                        {rev.id === latestRevision?.id && <span className="tag encrypted" style={{ fontSize: 11 }}>current</span>}
                      </div>
                      <div className="muted" style={{ fontSize: 13 }}>
                        {formatRelativeTime(rev.createdAt)}
                        <span style={{ margin: "0 6px" }}>-</span>
                        <span style={{ fontFamily: "var(--font-mono)", fontSize: 12 }}>{rev.contentHash.slice(0, 16)}...</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* MODAL */}
      {modal && (
        <div className="modal-overlay" onClick={() => setModal(null)}>
          <div className="modal panel" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <strong>{modalLabels[modal].title}</strong>
              <button className="icon-button" onClick={() => setModal(null)}><IconX size={16} /></button>
            </div>
            <div className="modal-body">
              <div className="field">
                <span>Name</span>
                <input
                  value={modalName}
                  onChange={(e) => setModalName(e.target.value)}
                  placeholder={modalLabels[modal].placeholder}
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && modalName.trim() && (modal !== "environment" || modalPassword.trim())) handleModalSubmit();
                  }}
                />
              </div>
              {modalName.trim() && <p className="muted" style={{ fontSize: 13 }}>Slug: <code>{toSlug(modalName)}</code></p>}

              {/* Environment password field */}
              {modal === "environment" && (
                <div className="field">
                  <span>Encryption password</span>
                  <input
                    type="password"
                    value={modalPassword}
                    onChange={(e) => setModalPassword(e.target.value)}
                    placeholder="Password to encrypt this environment"
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && modalName.trim() && modalPassword.trim()) handleModalSubmit();
                    }}
                  />
                  <span className="muted" style={{ fontSize: 12, lineHeight: 1.4 }}>
                    This password encrypts all secrets in this environment. Without it, nobody — including us — can read them.
                  </span>
                </div>
              )}

              <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 8 }}>
                <button className="button secondary" onClick={() => setModal(null)}>Cancel</button>
                <button
                  className="button"
                  onClick={handleModalSubmit}
                  disabled={!modalName.trim() || (modal === "environment" && !modalPassword.trim()) || isPending}
                >
                  {isPending ? "Creating..." : "Create"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TOASTS */}
      {toasts.length > 0 && (
        <div style={{ position: "fixed", bottom: 24, right: 24, display: "flex", flexDirection: "column", gap: 8, zIndex: 1000, pointerEvents: "none" }}>
          {toasts.map((t) => (
            <div key={t.id} className="panel fade-in" style={{
              padding: "12px 16px", borderRadius: 12, fontSize: 14, display: "flex", alignItems: "center", gap: 8,
              pointerEvents: "auto", maxWidth: 380,
              borderLeft: `4px solid ${t.variant === "error" ? "#c0392b" : t.variant === "success" ? "var(--accent)" : "var(--muted)"}`
            }}>
              <span style={{ flex: 1 }}>{t.message}</span>
              <button className="icon-button" onClick={() => setToasts((p) => p.filter((x) => x.id !== t.id))}><IconX size={14} /></button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
