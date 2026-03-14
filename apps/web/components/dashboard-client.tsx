"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
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
  Invite,
  SecretRevision,
  SecretSet,
} from "@tokengate/sdk";
import { useSidebarData } from "./use-sidebar-data";

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

function IconSettings({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06A1.65 1.65 0 0019.32 9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z" /></svg>
  );
}

function IconUsers({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 00-3-3.87" /><path d="M16 3.13a4 4 0 010 7.75" /></svg>
  );
}

function IconChevronDown({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9" /></svg>
  );
}

function IconMail({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><polyline points="22,6 12,13 2,6" /></svg>
  );
}

function IconCopy({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2" /><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" /></svg>
  );
}

function IconRestore({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="1 4 1 10 7 10" /><path d="M3.51 15a9 9 0 102.13-9.36L1 10" /></svg>
  );
}

function IconFile({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><polyline points="14 2 14 8 20 8" /></svg>
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

async function patchJson<T>(input: string, body: unknown): Promise<T> {
  const response = await fetch(input, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!response.ok) throw new Error(await response.text());
  return (await response.json()) as T;
}

async function deleteJson<T>(input: string): Promise<T> {
  const response = await fetch(input, { method: "DELETE" });
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

type DiffLineKind = "added" | "removed" | "changed" | "unchanged";

interface DiffLine {
  kind: DiffLineKind;
  key: string;
  oldValue?: string;
  newValue?: string;
}

function computeEnvDiff(oldEntries: EnvEntry[], newEntries: EnvEntry[]): DiffLine[] {
  const oldMap = new Map(oldEntries.filter((e) => e.key).map((e) => [e.key, e.value]));
  const newMap = new Map(newEntries.filter((e) => e.key).map((e) => [e.key, e.value]));
  const allKeys = new Set([...oldMap.keys(), ...newMap.keys()]);
  const lines: DiffLine[] = [];

  for (const key of allKeys) {
    const inOld = oldMap.has(key);
    const inNew = newMap.has(key);
    if (inOld && inNew) {
      const ov = oldMap.get(key)!;
      const nv = newMap.get(key)!;
      if (ov === nv) {
        lines.push({ kind: "unchanged", key, oldValue: ov, newValue: nv });
      } else {
        lines.push({ kind: "changed", key, oldValue: ov, newValue: nv });
      }
    } else if (inOld) {
      lines.push({ kind: "removed", key, oldValue: oldMap.get(key)! });
    } else {
      lines.push({ kind: "added", key, newValue: newMap.get(key)! });
    }
  }

  // Sort: changed first, then added, then removed, then unchanged
  const order: Record<DiffLineKind, number> = { changed: 0, added: 1, removed: 2, unchanged: 3 };
  lines.sort((a, b) => order[a.kind] - order[b.kind]);
  return lines;
}

function RevisionDiff({ oldEntries, newEntries, oldLabel, newLabel }: {
  oldEntries: EnvEntry[];
  newEntries: EnvEntry[];
  oldLabel: string;
  newLabel: string;
}) {
  const diff = computeEnvDiff(oldEntries, newEntries);
  const changes = diff.filter((d) => d.kind !== "unchanged");
  const unchanged = diff.filter((d) => d.kind === "unchanged");

  if (changes.length === 0) {
    return <p className="muted" style={{ fontSize: 13, padding: "8px 0" }}>No differences.</p>;
  }

  const kindStyle: Record<DiffLineKind, React.CSSProperties> = {
    added: { background: "rgba(39, 174, 96, 0.10)", borderLeft: "3px solid #27ae60" },
    removed: { background: "rgba(192, 57, 43, 0.10)", borderLeft: "3px solid #c0392b" },
    changed: { background: "rgba(241, 196, 15, 0.10)", borderLeft: "3px solid #f1c40f" },
    unchanged: { opacity: 0.5 },
  };

  const kindLabel: Record<DiffLineKind, string> = {
    added: "+",
    removed: "\u2212",
    changed: "~",
    unchanged: " ",
  };

  return (
    <div style={{ fontSize: 13, fontFamily: "var(--font-mono)" }}>
      <div style={{ display: "flex", gap: 16, marginBottom: 8, fontSize: 12 }}>
        <span className="muted">{oldLabel}</span>
        <span className="muted">{"\u2192"}</span>
        <span className="muted">{newLabel}</span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
        {changes.map((line) => (
          <div key={line.key} style={{ padding: "6px 10px", ...kindStyle[line.kind], display: "flex", gap: 8, alignItems: "baseline" }}>
            <span style={{ width: 14, textAlign: "center", flexShrink: 0, fontWeight: 700, fontSize: 14 }}>{kindLabel[line.kind]}</span>
            <span style={{ fontWeight: 600, minWidth: 120 }}>{line.key}</span>
            {line.kind === "changed" && (
              <span style={{ flex: 1, wordBreak: "break-all" }}>
                <span style={{ color: "#c0392b", textDecoration: "line-through" }}>{line.oldValue}</span>
                {" "}
                <span style={{ color: "#27ae60" }}>{line.newValue}</span>
              </span>
            )}
            {line.kind === "removed" && (
              <span style={{ flex: 1, color: "#c0392b", wordBreak: "break-all" }}>{line.oldValue}</span>
            )}
            {line.kind === "added" && (
              <span style={{ flex: 1, color: "#27ae60", wordBreak: "break-all" }}>{line.newValue}</span>
            )}
          </div>
        ))}
      </div>
      {unchanged.length > 0 && (
        <p className="muted" style={{ fontSize: 12, marginTop: 8 }}>{unchanged.length} unchanged variable{unchanged.length !== 1 ? "s" : ""}</p>
      )}
    </div>
  );
}

type ModalKind = "workspace" | "project" | "environment" | "invite" | null;
type ActiveView = "secrets" | "settings";

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function DashboardClient() {
  // --- Sidebar data (workspaces, projects, environments, secret sets, members) ---
  const sidebar = useSidebarData();
  const {
    workspaces, projects, environments, environmentsMeta, secretSets,
    members, pendingInvites,
    selectedWorkspaceId, selectedProjectId, selectedEnvironmentId, selectedSecretSetId,
    selectedWorkspace, selectedProject, selectedEnvironment, selectedSecretSet,
    selectedMembership, isOwner, isAdmin, isOwnerOrAdmin,
    loading,
    selectWorkspace, selectProject, selectEnvironment, selectSecretSet,
    refreshWorkspaces, refreshEnvironments, refreshMembers,
  } = sidebar;

  // Aliases for loading states
  const loadingWorkspaces = loading.workspaces;
  const loadingProjects = loading.projects;
  const loadingEnvironments = loading.environments;
  const loadingSecrets = loading.secretSets;

  // --- Content-area state ---
  const [latestRevision, setLatestRevision] = useState<SecretRevision | null>(null);
  const [history, setHistory] = useState<SecretRevision[]>([]);

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

  // --- Revision viewing ---
  const [viewingRevisionId, setViewingRevisionId] = useState<string | null>(null);
  const [viewingRevisionEntries, setViewingRevisionEntries] = useState<EnvEntry[] | null>(null);
  const [loadingRevision, setLoadingRevision] = useState(false);
  const [revisionViewMode, setRevisionViewMode] = useState<"diff" | "snapshot">("diff");

  // --- Editor UI ---
  const [searchFilter, setSearchFilter] = useState("");
  const [maskedValues, setMaskedValues] = useState(true);

  // --- Sidebar UI ---
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set());
  const [showWorkspaceSwitcher, setShowWorkspaceSwitcher] = useState(false);
  const [activeView, setActiveView] = useState<ActiveView>("secrets");

  // --- Settings UI ---
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"admin" | "member" | "viewer">("member");
  const [lastInviteLink, setLastInviteLink] = useState<string | null>(null);
  const loadingMembers = loading.members;

  // --- Confirmation dialog ---
  const [confirmAction, setConfirmAction] = useState<{
    title: string;
    message: string;
    destructive?: boolean;
    onConfirm: () => void;
  } | null>(null);

  const isEnvUnlocked = derivedKey !== null;

  const filteredEntryIndices = searchFilter
    ? envEntries.reduce<number[]>((acc, e, i) => {
        if (e.key.toLowerCase().includes(searchFilter.toLowerCase()) ||
            e.value.toLowerCase().includes(searchFilter.toLowerCase())) acc.push(i);
        return acc;
      }, [])
    : envEntries.map((_, i) => i);

  const maskVal = (v: string) => maskedValues && v ? "\u2022".repeat(Math.min(v.length, 32)) : v;

  // Is user currently viewing a revision?
  const isViewingRevision = viewingRevisionId !== null && viewingRevisionEntries !== null;
  const viewingRevision = history.find((r) => r.id === viewingRevisionId) ?? null;

  // Build a diff map for inline display: key → { kind, oldValue, newValue }
  const revisionDiffMap = (() => {
    if (!isViewingRevision || !viewingRevisionEntries) return new Map<string, DiffLine>();
    const diff = computeEnvDiff(viewingRevisionEntries, envEntries);
    return new Map(diff.map((d) => [d.key, d]));
  })();

  // Merged entries for diff view: all keys from both sides in order
  const diffViewEntries = (() => {
    if (!isViewingRevision || !viewingRevisionEntries) return [];
    const diff = computeEnvDiff(viewingRevisionEntries, envEntries);
    return diff;
  })();

  const diffStats = (() => {
    if (!diffViewEntries.length) return null;
    const a = diffViewEntries.filter((d) => d.kind === "added").length;
    const r = diffViewEntries.filter((d) => d.kind === "removed").length;
    const c = diffViewEntries.filter((d) => d.kind === "changed").length;
    const u = diffViewEntries.filter((d) => d.kind === "unchanged").length;
    return { added: a, removed: r, changed: c, unchanged: u };
  })();

  // --- Toast ---
  const pushToast = useCallback((message: string, variant: Toast["variant"] = "info") => {
    const id = ++toastCounter;
    setToasts((prev) => [...prev, { id, message, variant }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4000);
  }, []);

  // --- Auto-expand project in sidebar tree ---
  useEffect(() => {
    if (selectedProjectId) {
      setExpandedProjects((prev) => {
        const next = new Set(prev);
        next.add(selectedProjectId);
        return next;
      });
    }
  }, [selectedProjectId]);

  // --- Load members when settings view opens ---
  useEffect(() => {
    if (activeView === "settings" && selectedWorkspaceId) {
      void refreshMembers();
    }
  }, [activeView, selectedWorkspaceId, refreshMembers]);

  // --- Reset crypto when environment changes ---
  useEffect(() => {
    setDerivedKey(null);
    setEnvPassword("");
    setEnvEntries([]);
    setDirtyFlag(false);
    setShowPassword(false);
    setLatestRevision(null);
    setHistory([]);
  }, [selectedEnvironmentId]);

  // --- Load revision history when secret set changes ---
  useEffect(() => {
    setEnvEntries([]);
    setDirtyFlag(false);
    setViewingRevisionId(null);
    setViewingRevisionEntries(null);

    if (!selectedSecretSetId) {
      setLatestRevision(null);
      setHistory([]);
      return;
    }

    void (async () => {
      await loadSecretSetMeta(selectedSecretSetId);
      if (derivedKey) {
        try {
          const lp = await fetchJson<{ revision: SecretRevision | null }>(`/api/revisions/latest?secretSetId=${selectedSecretSetId}`);
          if (lp.revision) {
            const plaintext = await decryptRevisionPayload(
              { ciphertext: lp.revision.ciphertext, wrappedDataKey: lp.revision.wrappedDataKey, contentHash: lp.revision.contentHash },
              derivedKey,
            );
            setEnvEntries(parseEnvDocument(plaintext));
          }
        } catch {
          // Decryption might fail if keySalt differs — ignore
        }
      }
    })();
  }, [selectedSecretSetId]); // eslint-disable-line react-hooks/exhaustive-deps

  async function loadSecretSetMeta(secretSetId: string) {
    const [hp, lp] = await Promise.all([
      fetchJson<{ revisions: SecretRevision[] }>(`/api/revisions/history?secretSetId=${secretSetId}`),
      fetchJson<{ revision: SecretRevision | null }>(`/api/revisions/latest?secretSetId=${secretSetId}`),
    ]);
    setHistory(hp.revisions.slice().sort((a, b) => b.revision - a.revision));
    setLatestRevision(lp.revision);
  }

  // --- Unlock environment with password ---
  function handleUnlockEnv() {
    const keySalt = secretSets[0]?.keySalt;
    if (!keySalt || !envPassword) return;
    startTransition(async () => {
      try {
        const key = await deriveEnvironmentKey(envPassword, keySalt);

        // If there's a latest revision on the selected file, try to decrypt it to verify the password
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

  function handleRestoreRevision(revision: SecretRevision) {
    if (!selectedSecretSet?.id || !derivedKey) return;
    const filePath = selectedSecretSet.filePath || ".env";
    setConfirmAction({
      title: "Restore revision",
      message: `This will restore r${revision.revision} as the current version of ${filePath}. Your current secrets will be replaced with the contents from that revision. A new revision will be created (non-destructive).`,
      destructive: true,
      onConfirm: () => {
        setConfirmAction(null);
        startTransition(async () => {
          try {
            const result = await postJson<{ newRevision: number }>("/api/revisions/restore", {
              secretSetId: selectedSecretSet.id,
              targetRevision: revision.revision
            });
            pushToast(`Restored r${revision.revision} as new r${result.newRevision}.`, "success");
            setViewingRevisionId(null);
            setViewingRevisionEntries(null);
            await loadSecretSetMeta(selectedSecretSetId);
            const lp = await fetchJson<{ revision: SecretRevision | null }>(`/api/revisions/latest?secretSetId=${selectedSecretSet.id}`);
            setLatestRevision(lp.revision);
            if (lp.revision) {
              try {
                const plaintext = await decryptRevisionPayload(
                  { ciphertext: lp.revision.ciphertext, wrappedDataKey: lp.revision.wrappedDataKey, contentHash: lp.revision.contentHash },
                  derivedKey,
                );
                setEnvEntries(parseEnvDocument(plaintext));
                setDirtyFlag(false);
              } catch {
                pushToast("Restored, but could not decrypt. Re-enter password.", "error");
              }
            }
          } catch (err) {
            pushToast(err instanceof Error ? err.message : "Restore failed.", "error");
          }
        });
      }
    });
  }

  function handleViewRevision(rev: SecretRevision, mode: "diff" | "snapshot" = "diff") {
    if (viewingRevisionId === rev.id && revisionViewMode === mode) {
      // Toggle off
      setViewingRevisionId(null);
      setViewingRevisionEntries(null);
      return;
    }
    if (!derivedKey) return;
    setViewingRevisionId(rev.id);
    setViewingRevisionEntries(null);
    setRevisionViewMode(mode);
    setLoadingRevision(true);
    void (async () => {
      try {
        const plaintext = await decryptRevisionPayload(
          { ciphertext: rev.ciphertext, wrappedDataKey: rev.wrappedDataKey, contentHash: rev.contentHash },
          derivedKey,
        );
        setViewingRevisionEntries(parseEnvDocument(plaintext));
      } catch {
        pushToast("Could not decrypt this revision.", "error");
        setViewingRevisionId(null);
      } finally {
        setLoadingRevision(false);
      }
    })();
  }

  function handleCloseRevisionView() {
    setViewingRevisionId(null);
    setViewingRevisionEntries(null);
  }

  // Keep old name for compatibility
  function handleToggleRevisionDiff(rev: SecretRevision) {
    handleViewRevision(rev, "diff");
  }

  function handleLockEnv() {
    setDerivedKey(null);
    setEnvPassword("");
    setEnvEntries([]);
    setDirtyFlag(false);
    setShowPassword(false);
    setViewingRevisionId(null);
    setViewingRevisionEntries(null);
    pushToast("Environment locked.", "info");
  }

  // --- Save revision ---
  function handleSaveRevision() {
    if (!selectedSecretSet?.id || !derivedKey) return;
    const filePath = selectedSecretSet.filePath || ".env";
    const varCount = envEntries.filter((e) => e.key.trim()).length;
    setConfirmAction({
      title: "Save encrypted revision",
      message: `This will encrypt and save ${varCount} variable${varCount !== 1 ? "s" : ""} to ${filePath} as a new revision${latestRevision ? ` (currently at r${latestRevision.revision})` : ""}. This cannot be undone, but previous revisions remain accessible.`,
      onConfirm: () => {
        setConfirmAction(null);
        startTransition(async () => {
          try {
            const normalized = normalizeEnvDocument(stringifyEnvEntries(envEntries));
            const encrypted = await encryptRevisionPayload(normalized, derivedKey);
            const result = await postJson<{ conflict: boolean; acceptedRevision?: number; latestRevision?: number }>("/api/revisions", {
              secretSetId: selectedSecretSet.id,
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
            await loadSecretSetMeta(selectedSecretSetId);
            if (result.acceptedRevision !== undefined) {
              const lp = await fetchJson<{ revision: SecretRevision | null }>(`/api/revisions/latest?secretSetId=${selectedSecretSet.id}`);
              setLatestRevision(lp.revision);
            }
          } catch (err) {
            pushToast(err instanceof Error ? err.message : "Save failed.", "error");
          }
        });
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
        selectWorkspace(payload.workspaceId);
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
        selectProject(payload.projectId);
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
        await refreshEnvironments();
        selectEnvironment(payload.environmentId);
      } catch (err) {
        pushToast(err instanceof Error ? err.message : "Failed.", "error");
      }
    });
  }

  function handleModalSubmit() {
    if (modal === "workspace") handleCreateWorkspace();
    else if (modal === "project") handleCreateProject();
    else if (modal === "environment") handleCreateEnvironment();
    else if (modal === "invite") handleCreateInvite();
  }

  function handleCreateInvite() {
    if (!inviteEmail.trim() || !selectedWorkspaceId) return;
    startTransition(async () => {
      try {
        const result = await postJson<{ inviteId: string; token: string }>("/api/invites", {
          workspaceId: selectedWorkspaceId,
          email: inviteEmail.trim(),
          role: inviteRole,
        });
        const link = `${window.location.origin}/invites/accept?token=${result.token}`;
        setLastInviteLink(link);
        setInviteEmail("");
        pushToast("Invite created.", "success");
        void refreshMembers();
      } catch (err) {
        pushToast(err instanceof Error ? err.message : "Failed.", "error");
      }
    });
  }

  function handleCancelInvite(inviteId: string) {
    setConfirmAction({
      title: "Cancel invite",
      message: "Are you sure you want to cancel this invite?",
      destructive: true,
      onConfirm: () => {
        setConfirmAction(null);
        startTransition(async () => {
          try {
            await deleteJson(`/api/invites/${inviteId}`);
            pushToast("Invite cancelled.", "success");
            void refreshMembers();
          } catch (err) {
            pushToast(err instanceof Error ? err.message : "Failed.", "error");
          }
        });
      },
    });
  }

  function handleUpdateMemberRole(memberId: string, newRole: string) {
    startTransition(async () => {
      try {
        await patchJson(`/api/members/${memberId}`, { newRole });
        pushToast("Role updated.", "success");
        void refreshMembers();
      } catch (err) {
        pushToast(err instanceof Error ? err.message : "Failed.", "error");
      }
    });
  }

  function handleRemoveMember(memberId: string, name: string) {
    setConfirmAction({
      title: "Remove member",
      message: `Are you sure you want to remove ${name} from this workspace? They will lose access to all projects and environments.`,
      destructive: true,
      onConfirm: () => {
        setConfirmAction(null);
        startTransition(async () => {
          try {
            await deleteJson(`/api/members/${memberId}`);
            pushToast("Member removed.", "success");
            void refreshMembers();
          } catch (err) {
            pushToast(err instanceof Error ? err.message : "Failed.", "error");
          }
        });
      },
    });
  }

  function toggleProjectExpanded(projectId: string) {
    setExpandedProjects((prev) => {
      const next = new Set(prev);
      if (next.has(projectId)) next.delete(projectId);
      else next.add(projectId);
      return next;
    });
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
    environment: { title: "New environment", placeholder: "Environment name (e.g. production)" },
    invite: { title: "Invite member", placeholder: "Email address" },
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

        {/* Workspace Switcher */}
        <div className="sidebar-section">
          {loadingWorkspaces && (
            <>
              <div className="sidebar-skeleton" /><div className="sidebar-skeleton" style={{ width: "60%" }} />
            </>
          )}
          {!loadingWorkspaces && (
            <div className="workspace-switcher">
              <button
                className="workspace-switcher-trigger"
                onClick={() => setShowWorkspaceSwitcher(!showWorkspaceSwitcher)}
              >
                <IconBox size={14} />
                <span style={{ flex: 1, textAlign: "left", fontWeight: 600 }}>
                  {selectedWorkspace?.name ?? "Select workspace"}
                </span>
                {selectedMembership && (
                  <span className="role-badge" data-role={selectedMembership.role}>{selectedMembership.role}</span>
                )}
                <IconChevronDown size={12} />
              </button>
              {showWorkspaceSwitcher && (
                <div className="workspace-switcher-dropdown">
                  {workspaces.map((w) => w.workspace ? (
                    <button
                      key={w.workspace.id}
                      className={`sidebar-item${w.workspace.id === selectedWorkspaceId ? " active" : ""}`}
                      onClick={() => { selectWorkspace(w.workspace!.id); setShowWorkspaceSwitcher(false); setActiveView("secrets"); }}
                    >
                      <IconBox size={14} />
                      <span style={{ flex: 1, textAlign: "left" }}>{w.workspace.name}</span>
                      <span className="role-badge" data-role={w.membership.role}>{w.membership.role}</span>
                    </button>
                  ) : null)}
                  <div className="divider" style={{ margin: "4px 0" }} />
                  <button className="sidebar-item" onClick={() => { setModal("workspace"); setModalName(""); setShowWorkspaceSwitcher(false); }}>
                    <IconPlus size={14} /><span>New workspace</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Project tree */}
        {selectedWorkspaceId && (
          <div className="sidebar-section">
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 8px 8px" }}>
              <span className="sidebar-section-label" style={{ padding: 0 }}>Projects</span>
              <button
                className="icon-button"
                style={{ width: 22, height: 22 }}
                onClick={() => { setModal("project"); setModalName(""); }}
                title="New project"
              >
                <IconPlus size={12} />
              </button>
            </div>
            {loadingProjects && (
              <>
                <div className="sidebar-skeleton" /><div className="sidebar-skeleton" style={{ width: "55%" }} />
              </>
            )}
            {!loadingProjects && projects.length === 0 && <span className="muted" style={{ fontSize: 13, padding: "0 12px" }}>No projects</span>}
            {projects.map((proj) => {
              const isExpanded = expandedProjects.has(proj.id);
              const projectEnvs = environments.filter(() => selectedProjectId === proj.id);
              return (
                <div key={proj.id}>
                  <button
                    className={`sidebar-item${proj.id === selectedProjectId ? " active" : ""}`}
                    onClick={() => {
                      selectProject(proj.id);
                      toggleProjectExpanded(proj.id);
                      setActiveView("secrets");
                    }}
                  >
                    <span style={{ transform: isExpanded ? "rotate(90deg)" : "none", transition: "transform 120ms ease", display: "inline-flex" }}>
                      <IconChevron size={12} />
                    </span>
                    <IconFolder size={14} />
                    <span style={{ flex: 1, textAlign: "left" }}>{proj.name}</span>
                  </button>
                  {/* Environments under project */}
                  {isExpanded && proj.id === selectedProjectId && (
                    <div className="sidebar-tree-children">
                      {loadingEnvironments && <div className="sidebar-skeleton" style={{ width: "70%" }} />}
                      {!loadingEnvironments && projectEnvs.length === 0 && (
                        <span className="muted" style={{ fontSize: 12, padding: "4px 12px 4px 8px", display: "block" }}>No environments</span>
                      )}
                      {!loadingEnvironments && environments.map((env) => {
                        const meta = environmentsMeta.find((m) => m.environment.id === env.id);
                        const isSelected = env.id === selectedEnvironmentId;
                        return (
                          <div key={env.id}>
                            <button
                              className={`sidebar-item${isSelected ? " active" : ""}`}
                              style={{ paddingLeft: 8 }}
                              onClick={() => { selectEnvironment(env.id); setActiveView("secrets"); }}
                            >
                              <IconLayers size={13} />
                              <span style={{ flex: 1, textAlign: "left" }}>{env.name}</span>
                              <span style={{ display: "flex", alignItems: "center", gap: 6, marginLeft: "auto" }}>
                                {meta?.latestRevisionTimestamp && (
                                  <span className="muted" style={{ fontSize: 10 }}>{formatRelativeTime(meta.latestRevisionTimestamp)}</span>
                                )}
                                {isSelected && (isEnvUnlocked ? <IconUnlock size={11} /> : <IconLock size={11} />)}
                              </span>
                            </button>
                            {/* File list under selected environment */}
                            {isSelected && secretSets.length > 0 && (
                              <div className="sidebar-tree-children">
                                {secretSets.map((ss) => (
                                  <button
                                    key={ss.id}
                                    className={`sidebar-item${ss.id === selectedSecretSetId ? " active" : ""}`}
                                    style={{ fontSize: 12, padding: "3px 8px" }}
                                    onClick={() => selectSecretSet(ss.id)}
                                  >
                                    <IconFile size={11} />
                                    <span style={{ fontFamily: "var(--font-mono)", fontSize: 11 }}>{ss.filePath || ".env"}</span>
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                      <button
                        className="sidebar-item"
                        style={{ paddingLeft: 8, fontSize: 12, opacity: 0.7 }}
                        onClick={() => { setModal("environment"); setModalName(""); setModalPassword(""); }}
                      >
                        <IconPlus size={11} /><span>New environment</span>
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Bottom section */}
        <div style={{ marginTop: "auto" }}>
          <div className="divider" />
          {selectedWorkspaceId && (
            <button
              className={`sidebar-item${activeView === "settings" ? " active" : ""}`}
              style={{ margin: "4px 10px", width: "calc(100% - 20px)" }}
              onClick={() => setActiveView(activeView === "settings" ? "secrets" : "settings")}
            >
              <IconSettings size={14} />
              <span>Workspace settings</span>
            </button>
          )}
          <div style={{ padding: "8px 18px 12px", borderTop: "1px solid var(--sidebar-border)", display: "flex", alignItems: "center", gap: 10 }}>
            <UserButton appearance={{ elements: { avatarBox: { width: 28, height: 28 } } }} />
            <span className="muted" style={{ fontSize: 12 }}>Account</span>
          </div>
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
                {activeView === "settings" && <><IconChevron size={12} /><span>Settings</span></>}
                {activeView === "secrets" && selectedProject && <><IconChevron size={12} /><span>{selectedProject.name}</span></>}
                {activeView === "secrets" && selectedEnvironment && <><IconChevron size={12} /><span>{selectedEnvironment.name}</span></>}
                {activeView === "secrets" && selectedSecretSet && <><IconChevron size={12} /><span style={{ fontFamily: "var(--font-mono)", fontSize: 13 }}>{selectedSecretSet.filePath || ".env"}</span></>}
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
            {!isEnvUnlocked && selectedEnvironment && secretSets.length > 0 && (
              <span className="tag locked"><IconLock size={12} /> Locked</span>
            )}
          </div>
        </div>

        {/* SETTINGS VIEW */}
        {activeView === "settings" && selectedWorkspace && (
          <div className="fade-in" style={{ padding: 24, display: "flex", flexDirection: "column", gap: 24 }}>
            {/* General */}
            <div className="panel" style={{ padding: 20 }}>
              <h3 style={{ marginBottom: 16 }}>General</h3>
              <div style={{ display: "grid", gap: 12, fontSize: 14 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <span className="muted" style={{ width: 80 }}>Name</span>
                  <span style={{ fontWeight: 600 }}>{selectedWorkspace.name}</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <span className="muted" style={{ width: 80 }}>Slug</span>
                  <code style={{ fontFamily: "var(--font-mono)", fontSize: 13 }}>{selectedWorkspace.slug}</code>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <span className="muted" style={{ width: 80 }}>Type</span>
                  <span className="tag">{selectedWorkspace.type}</span>
                </div>
              </div>
            </div>

            {/* Members */}
            <div className="panel" style={{ padding: 20 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                <h3 style={{ display: "flex", alignItems: "center", gap: 8 }}><IconUsers size={16} /> Members</h3>
                {isOwnerOrAdmin && (
                  <button className="button sm" onClick={() => { setModal("invite"); setInviteEmail(""); setInviteRole("member"); setLastInviteLink(null); }}>
                    <IconPlus size={12} /> Invite
                  </button>
                )}
              </div>
              {loadingMembers && (
                <div style={{ display: "flex", alignItems: "center", gap: 8, padding: 12 }}>
                  <div className="spinner" /> <span className="muted">Loading members...</span>
                </div>
              )}
              {!loadingMembers && (
                <div className="members-list">
                  {members.map((m) => (
                    <div key={m.id} className="member-row">
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 600, fontSize: 14 }}>{m.fullName || "Unknown"}</div>
                        <div className="muted" style={{ fontSize: 12, fontFamily: "var(--font-mono)" }}>{m.email || m.userId}</div>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        {m.role === "owner" ? (
                          <span className="role-badge" data-role="owner">owner</span>
                        ) : isOwner ? (
                          <select
                            className="select"
                            style={{ width: "auto", fontSize: 12, padding: "4px 28px 4px 8px", border: "2px solid var(--border-light)" }}
                            value={m.role}
                            onChange={(e) => handleUpdateMemberRole(m.id, e.target.value)}
                          >
                            <option value="admin">admin</option>
                            <option value="member">member</option>
                            <option value="viewer">viewer</option>
                          </select>
                        ) : (
                          <span className="role-badge" data-role={m.role}>{m.role}</span>
                        )}
                        {isOwnerOrAdmin && m.role !== "owner" && (
                          <button
                            className="icon-button"
                            style={{ color: "var(--error)" }}
                            onClick={() => handleRemoveMember(m.id, m.fullName || m.email || "this member")}
                            title="Remove member"
                          >
                            <IconTrash size={14} />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Pending Invites */}
            {isOwnerOrAdmin && pendingInvites.length > 0 && (
              <div className="panel" style={{ padding: 20 }}>
                <h3 style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}><IconMail size={16} /> Pending invites</h3>
                <div className="members-list">
                  {pendingInvites.map((inv) => (
                    <div key={inv.id} className="member-row">
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 600, fontSize: 14, fontFamily: "var(--font-mono)" }}>{inv.email}</div>
                        <div className="muted" style={{ fontSize: 12 }}>
                          Invited {formatRelativeTime(inv.createdAt)} &middot; Expires {new Date(inv.expiresAt).toLocaleDateString()}
                        </div>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span className="role-badge" data-role={inv.role}>{inv.role}</span>
                        <button
                          className="icon-button"
                          style={{ color: "var(--error)" }}
                          onClick={() => handleCancelInvite(inv.id)}
                          title="Cancel invite"
                        >
                          <IconX size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Initial loading — workspaces haven't loaded yet */}
        {activeView === "secrets" && loadingWorkspaces && (
          <div className="empty-state fade-in">
            <div className="loading-spinner" />
            <p className="muted" style={{ marginTop: 16 }}>Loading your workspaces...</p>
          </div>
        )}

        {/* Loading projects after workspace selected */}
        {activeView === "secrets" && !loadingWorkspaces && selectedWorkspaceId && loadingProjects && !selectedProjectId && (
          <div className="empty-state fade-in">
            <div className="loading-spinner" />
            <p className="muted" style={{ marginTop: 16 }}>Loading projects...</p>
          </div>
        )}

        {/* Loading environments after project selected */}
        {activeView === "secrets" && !loadingWorkspaces && !loadingProjects && selectedProjectId && loadingEnvironments && !selectedEnvironmentId && (
          <div className="empty-state fade-in">
            <div className="loading-spinner" />
            <p className="muted" style={{ marginTop: 16 }}>Loading environments...</p>
          </div>
        )}

        {/* Loading secret set metadata */}
        {activeView === "secrets" && !loadingWorkspaces && selectedEnvironmentId && loadingSecrets && (
          <div className="empty-state fade-in">
            <div className="loading-spinner" />
            <p className="muted" style={{ marginTop: 16 }}>Loading secrets...</p>
          </div>
        )}

        {/* No workspaces — only show after loading completes */}
        {activeView === "secrets" && !loadingWorkspaces && workspaces.length === 0 && (
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
        {activeView === "secrets" && !loadingWorkspaces && !loadingProjects && !loadingEnvironments && workspaces.length > 0 && !selectedEnvironmentId && (
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
        {activeView === "secrets" && !loadingSecrets && selectedEnvironmentId && secretSets.length > 0 && !isEnvUnlocked && (
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

        {/* Environment selected, no secret sets (edge case — only after loading) */}
        {activeView === "secrets" && !loadingSecrets && selectedEnvironmentId && secretSets.length === 0 && (
          <div className="empty-state fade-in">
            <IconShield size={40} />
            <h3 style={{ margin: "12px 0 4px" }}>No secret set</h3>
            <p className="muted">This environment is missing its secret store. Try recreating it.</p>
          </div>
        )}

        {/* UNLOCKED — Key-value editor */}
        {activeView === "secrets" && !loadingSecrets && selectedEnvironmentId && selectedSecretSet && isEnvUnlocked && (
              <div className="ed1-wrap fade-in">
                {/* Toolbar */}
                <div className="ed1-toolbar">
                  <div className="ed1-tabs">
                    {secretSets.map((ss) => (
                      <button key={ss.id} className={`ed1-tab${ss.id === selectedSecretSetId ? " active" : ""}`} onClick={() => selectSecretSet(ss.id)}>
                        <IconFile size={12} />{ss.filePath || ".env"}
                      </button>
                    ))}
                  </div>
                  <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                    <input className="ed1-search" value={searchFilter} onChange={(e) => setSearchFilter(e.target.value)} placeholder="Filter..." spellCheck={false} />
                    <button className="icon-button" onClick={() => setMaskedValues(!maskedValues)} title={maskedValues ? "Reveal values" : "Mask values"}>
                      {maskedValues ? <IconEye size={14} /> : <IconEyeOff size={14} />}
                    </button>
                    {dirtyFlag && <span className="tag" style={{ fontSize: 10 }}>unsaved</span>}
                    <button className="button sm" onClick={handleSaveRevision} disabled={isPending || envEntries.length === 0}>
                      {isPending ? "Saving..." : "Save"}
                    </button>
                  </div>
                </div>

                {/* Revision viewing banner */}
                {isViewingRevision && viewingRevision && (
                  <div className="ed-rev-banner">
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <IconClock size={14} />
                      <strong>Viewing r{viewingRevision.revision}</strong>
                      <span className="muted">({formatRelativeTime(viewingRevision.createdAt)})</span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <button className={`ed-rev-mode-btn${revisionViewMode === "diff" ? " active" : ""}`} onClick={() => setRevisionViewMode("diff")}>Diff</button>
                      <button className={`ed-rev-mode-btn${revisionViewMode === "snapshot" ? " active" : ""}`} onClick={() => setRevisionViewMode("snapshot")}>Snapshot</button>
                      {diffStats && revisionViewMode === "diff" && (
                        <span className="ed-diff-stats">
                          {diffStats.added > 0 && <span className="ed-stat-added">+{diffStats.added}</span>}
                          {diffStats.changed > 0 && <span className="ed-stat-changed">~{diffStats.changed}</span>}
                          {diffStats.removed > 0 && <span className="ed-stat-removed">-{diffStats.removed}</span>}
                          {diffStats.unchanged > 0 && <span className="ed-stat-unchanged">{diffStats.unchanged} same</span>}
                        </span>
                      )}
                      <button className="button sm secondary" onClick={() => handleRestoreRevision(viewingRevision)} disabled={isPending}><IconRestore size={10} /> Restore</button>
                      <button className="icon-button" onClick={handleCloseRevisionView}><IconX size={14} /></button>
                    </div>
                  </div>
                )}

                {/* Editor body — normal mode */}
                {!isViewingRevision && (
                  <div className="ed1-body">
                    {filteredEntryIndices.map((i) => {
                      const entry = envEntries[i];
                      return (
                        <div className="ed1-line" key={i}>
                          <span className="ed1-linenum">{i + 1}</span>
                          <input className="ed1-key" value={entry.key} onChange={(e) => updateEntry(i, "key", e.target.value)} placeholder="KEY" spellCheck={false} />
                          <span className="ed1-eq">=</span>
                          <input className="ed1-val" value={maskedValues ? maskVal(entry.value) : entry.value} onChange={(e) => { if (!maskedValues) updateEntry(i, "value", e.target.value); }} onFocus={() => { if (maskedValues) setMaskedValues(false); }} placeholder="value" spellCheck={false} />
                          <button className="ed1-del" onClick={() => removeEntry(i)}><IconTrash size={12} /></button>
                        </div>
                      );
                    })}
                    <button className="ed1-add" onClick={addEntry}><IconPlus size={12} /> new variable</button>
                  </div>
                )}

                {/* Editor body — diff mode: shows current vs revision inline */}
                {isViewingRevision && revisionViewMode === "diff" && (
                  <div className="ed1-body">
                    <div className="ed-diff-header-row">
                      <span className="ed1-linenum" />
                      <span style={{ flex: 1, fontWeight: 700 }}>Key</span>
                      <span style={{ flex: 1 }}>r{viewingRevision?.revision} (old)</span>
                      <span className="ed-diff-arrow" />
                      <span style={{ flex: 1 }}>Current</span>
                    </div>
                    {diffViewEntries.map((d, i) => (
                      <div className={`ed1-line ed-diff-line ed-diff-${d.kind}`} key={d.key + i}>
                        <span className="ed1-linenum">
                          <span className="ed-diff-badge">{d.kind === "added" ? "+" : d.kind === "removed" ? "-" : d.kind === "changed" ? "~" : " "}</span>
                        </span>
                        <span className="ed-diff-key">{d.key}</span>
                        <span className="ed-diff-old">{d.kind === "added" ? "" : d.oldValue}</span>
                        <span className="ed-diff-arrow">{d.kind !== "unchanged" ? "\u2192" : ""}</span>
                        <span className="ed-diff-new">{d.kind === "removed" ? "" : d.newValue}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Editor body — snapshot mode: shows that revision's variables read-only */}
                {isViewingRevision && revisionViewMode === "snapshot" && viewingRevisionEntries && (
                  <div className="ed1-body">
                    {viewingRevisionEntries.map((entry, i) => (
                      <div className="ed1-line ed-snapshot-line" key={i}>
                        <span className="ed1-linenum">{i + 1}</span>
                        <span className="ed1-key" style={{ flex: 1, padding: "6px 8px" }}>{entry.key}</span>
                        <span className="ed1-eq">=</span>
                        <span className="ed1-val" style={{ flex: 2, padding: "6px 8px" }}>{maskedValues ? maskVal(entry.value) : entry.value}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Loading revision */}
                {loadingRevision && (
                  <div className="ed1-body" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <div className="spinner" />
                    <span className="muted" style={{ marginLeft: 8 }}>Decrypting revision...</span>
                  </div>
                )}

                {/* Status bar */}
                <div className="ed1-status">
                  <span>{selectedSecretSet.filePath || ".env"}</span>
                  <span>{envEntries.length} variable{envEntries.length !== 1 ? "s" : ""}</span>
                  {latestRevision && <span>r{latestRevision.revision}</span>}
                  <span className="tag encrypted" style={{ fontSize: 9, padding: "1px 5px" }}>E2E</span>
                </div>

                {/* History rail */}
                {history.length > 0 && (
                  <div className="ed1-history">
                    <span className="ed1-history-label">History</span>
                    <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                      {history.map((rev) => {
                        const isCurrent = rev.id === latestRevision?.id;
                        const isViewing = viewingRevisionId === rev.id;
                        return (
                          <button key={rev.id} className={`ed1-rev${isCurrent ? " current" : ""}${isViewing ? " expanded" : ""}`} onClick={() => { if (!isCurrent) handleViewRevision(rev, "diff"); }}>
                            <strong>r{rev.revision}</strong>
                            <span className="muted">{formatRelativeTime(rev.createdAt)}</span>
                            {isCurrent && <span className="tag encrypted" style={{ fontSize: 9 }}>live</span>}
                          </button>
                        );
                      })}
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
              {modal !== "invite" && (
                <>
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
                </>
              )}

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

              {/* Invite fields */}
              {modal === "invite" && (
                <>
                  <div className="field">
                    <span>Email</span>
                    <input
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      placeholder="team@example.com"
                      type="email"
                      autoFocus
                      onKeyDown={(e) => { if (e.key === "Enter" && inviteEmail.trim()) handleModalSubmit(); }}
                    />
                  </div>
                  <div className="field">
                    <span>Role</span>
                    <select className="select" value={inviteRole} onChange={(e) => setInviteRole(e.target.value as "admin" | "member" | "viewer")}>
                      <option value="admin">Admin</option>
                      <option value="member">Member</option>
                      <option value="viewer">Viewer</option>
                    </select>
                  </div>
                  {lastInviteLink && (
                    <div style={{ padding: 12, background: "var(--surface-hover)", border: "2px solid var(--border-light)" }}>
                      <span className="muted" style={{ fontSize: 12, display: "block", marginBottom: 6 }}>Invite link (share with the user):</span>
                      <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                        <code style={{ fontFamily: "var(--font-mono)", fontSize: 11, flex: 1, wordBreak: "break-all" }}>{lastInviteLink}</code>
                        <button
                          className="icon-button"
                          onClick={() => { void navigator.clipboard.writeText(lastInviteLink); pushToast("Copied to clipboard.", "success"); }}
                          title="Copy link"
                        >
                          <IconCopy size={14} />
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}

              <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 8 }}>
                <button className="button secondary" onClick={() => setModal(null)}>Cancel</button>
                {modal !== "invite" ? (
                  <button
                    className="button"
                    onClick={handleModalSubmit}
                    disabled={!modalName.trim() || (modal === "environment" && !modalPassword.trim()) || isPending}
                  >
                    {isPending ? "Creating..." : "Create"}
                  </button>
                ) : (
                  <button
                    className="button"
                    onClick={handleModalSubmit}
                    disabled={!inviteEmail.trim() || isPending}
                  >
                    {isPending ? "Sending..." : "Send invite"}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRM DIALOG */}
      {confirmAction && (
        <div className="modal-overlay" onClick={() => setConfirmAction(null)}>
          <div className="modal panel" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 440 }}>
            <div className="modal-header">
              <strong>{confirmAction.title}</strong>
              <button className="icon-button" onClick={() => setConfirmAction(null)}><IconX size={16} /></button>
            </div>
            <div className="modal-body">
              <p style={{ fontSize: 14, lineHeight: 1.6, margin: "0 0 20px", color: "var(--fg)" }}>
                {confirmAction.message}
              </p>
              <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                <button className="button secondary" onClick={() => setConfirmAction(null)}>Cancel</button>
                <button
                  className="button"
                  onClick={confirmAction.onConfirm}
                  style={confirmAction.destructive ? { background: "#c0392b", borderColor: "#c0392b" } : undefined}
                >
                  {confirmAction.destructive ? "Restore" : "Save"}
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
