"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { UserButton } from "@clerk/nextjs";
import {
  deriveEnvironmentKey,
  generateSalt,
  hashContent,
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
  FileSchema,
  Integration,
  Invite,
  SchemaField,
  SecretRevision,
  SecretSet,
} from "@tokengate/sdk";
import { useSidebarData } from "./use-sidebar-data";
import { pickPreferredSecretSet, resolveEnvironmentSecretSets } from "@/lib/environment-access";

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

function IconMenu({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="18" x2="21" y2="18" /></svg>
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

function IconCloud({ size = 12 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 10h-1.26A8 8 0 109 20h9a5 5 0 000-10z" /></svg>
  );
}

function IconConvex({ size = 12 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="var(--sidebar-accent)" strokeWidth="2"><path d="M12 2L2 7v10l10 5 10-5V7L12 2z" /><path d="M12 22V12" /><path d="M2 7l10 5 10-5" /></svg>
  );
}

function IconVercel({ size = 12 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor"><path d="M12 2L2 22h20L12 2z" /></svg>
  );
}

function FileSourceIcon({ source, size = 10 }: { source?: string; size?: number }) {
  switch (source) {
    case "convex": return <IconConvex size={size} />;
    case "vercel": return <IconVercel size={size} />;
    default: return <IconCloud size={size} />;
  }
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
    return <p className="muted text-[13px] py-2">No differences.</p>;
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
    <div className="text-[13px]" style={{ fontFamily: "var(--font-mono)" }}>
      <div className="flex gap-4 mb-2 text-xs">
        <span className="muted">{oldLabel}</span>
        <span className="muted">{"\u2192"}</span>
        <span className="muted">{newLabel}</span>
      </div>
      <div className="flex flex-col gap-px">
        {changes.map((line) => (
          <div key={line.key} className="px-[10px] py-[6px] flex gap-2 items-baseline" style={kindStyle[line.kind]}>
            <span className="w-[14px] text-center shrink-0 font-bold text-sm">{kindLabel[line.kind]}</span>
            <span className="font-semibold min-w-[120px]">{line.key}</span>
            {line.kind === "changed" && (
              <span className="flex-1 break-all">
                <span className="text-[#c0392b] line-through">{line.oldValue}</span>
                {" "}
                <span className="text-[#27ae60]">{line.newValue}</span>
              </span>
            )}
            {line.kind === "removed" && (
              <span className="flex-1 text-[#c0392b] break-all">{line.oldValue}</span>
            )}
            {line.kind === "added" && (
              <span className="flex-1 text-[#27ae60] break-all">{line.newValue}</span>
            )}
          </div>
        ))}
      </div>
      {unchanged.length > 0 && (
        <p className="muted text-xs mt-2">{unchanged.length} unchanged variable{unchanged.length !== 1 ? "s" : ""}</p>
      )}
    </div>
  );
}

type ModalKind = "workspace" | "project" | "environment" | "invite" | null;
type ActiveView = "project" | "environment" | "secrets" | "settings" | "schemas" | "integrations";

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
    refreshWorkspaces, refreshEnvironments, refreshSecretSets, refreshMembers,
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
  const [unlockError, setUnlockError] = useState<string | null>(null);

  // --- Editor ---
  const [envEntries, setEnvEntries] = useState<EnvEntry[]>([]);
  const [dirtyFlag, setDirtyFlag] = useState(false);

  // --- UI ---
  const [isPending, startTransition] = useTransition();
  const [modal, setModal] = useState<ModalKind>(null);
  const [modalName, setModalName] = useState("");
  const [modalPassword, setModalPassword] = useState("");
  const [toasts, setToasts] = useState<Toast[]>([]);

  // --- Input modal (replaces browser prompt/confirm) ---
  const [inputModal, setInputModal] = useState<{
    title: string;
    fields: Array<{ key: string; label: string; placeholder?: string; type?: string }>;
    onSubmit: (values: Record<string, string>) => void;
  } | null>(null);
  const [inputModalValues, setInputModalValues] = useState<Record<string, string>>({});
  const [integrationMappingModal, setIntegrationMappingModal] = useState<{
    integration: Integration;
    mode: "attach" | "add";
  } | null>(null);
  const [integrationMappingValues, setIntegrationMappingValues] = useState<{
    environmentId: string;
    filePath: string;
    providerTarget: string;
  }>({ environmentId: "", filePath: ".env", providerTarget: "*" });
  const [syncPasswordPrompt, setSyncPasswordPrompt] = useState<{
    integration: Integration;
    mappingIndex: number;
    environmentId: string;
  } | null>(null);
  const [syncPasswordValue, setSyncPasswordValue] = useState("");
  const [pendingEnvironmentOpen, setPendingEnvironmentOpen] = useState<{
    environmentId: string;
    secretSetId: string;
    key: string;
    password?: string;
    entries: EnvEntry[];
    latestRevision: SecretRevision | null;
  } | null>(null);

  function showInputModal(
    title: string,
    fields: Array<{ key: string; label: string; placeholder?: string; type?: string }>,
    onSubmit: (values: Record<string, string>) => void,
  ) {
    setInputModalValues(Object.fromEntries(fields.map((f) => [f.key, ""])));
    setInputModal({ title, fields, onSubmit });
  }

  function openIntegrationMappingModal(integration: Integration, mode: "attach" | "add" = "add") {
    setIntegrationMappingValues({
      environmentId: selectedEnvironmentId || environments[0]?.id || "",
      filePath: ".env",
      providerTarget: integration.provider === "vercel" ? "production" : "*",
    });
    setIntegrationMappingModal({ integration, mode });
  }

  // --- Revision viewing ---
  const [viewingRevisionId, setViewingRevisionId] = useState<string | null>(null);
  const [viewingRevisionEntries, setViewingRevisionEntries] = useState<EnvEntry[] | null>(null);
  const [loadingRevision, setLoadingRevision] = useState(false);
  const [revisionViewMode, setRevisionViewMode] = useState<"diff" | "snapshot">("diff");

  // --- Editor UI ---
  const [searchFilter, setSearchFilter] = useState("");
  const [maskedValues, setMaskedValues] = useState(true);

  // --- Context menu ---
  const [ctxMenu, setCtxMenu] = useState<{
    x: number; y: number;
    items: Array<{ label: string; destructive?: boolean; onClick: () => void }>;
  } | null>(null);

  function showContextMenu(e: React.MouseEvent, items: Array<{ label: string; destructive?: boolean; onClick: () => void }>) {
    e.preventDefault();
    e.stopPropagation();
    setCtxMenu({ x: e.clientX, y: e.clientY, items });
  }

  // Close context menu on any click
  useEffect(() => {
    if (!ctxMenu) return;
    const close = () => setCtxMenu(null);
    window.addEventListener("click", close);
    return () => window.removeEventListener("click", close);
  }, [ctxMenu]);

  // --- Sidebar UI ---
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set());
  const [showWorkspaceSwitcher, setShowWorkspaceSwitcher] = useState(false);
  const [activeView, setActiveView] = useState<ActiveView>("project");

  // --- Schemas & Integrations ---
  const [fileSchemas, setFileSchemas] = useState<FileSchema[]>([]);
  const [projectIntegrations, setProjectIntegrations] = useState<Integration[]>([]);
  const [loadingSchemas, setLoadingSchemas] = useState(false);
  const [schemaEditing, setSchemaEditing] = useState<{ filePath: string; fields: SchemaField[] } | null>(null);
  const [newFieldName, setNewFieldName] = useState("");
  const [newFieldType, setNewFieldType] = useState("string");

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

  // --- Load schemas + integrations when those views open ---
  const refreshSchemas = useCallback(async () => {
    if (!selectedProjectId) return;
    setLoadingSchemas(true);
    try {
      const res = await fetchJson<{ schemas: FileSchema[] }>(`/api/schemas?projectId=${selectedProjectId}`);
      setFileSchemas(res.schemas);
    } catch { /* ignore */ } finally { setLoadingSchemas(false); }
  }, [selectedProjectId]);

  const refreshIntegrations = useCallback(async () => {
    if (!selectedProjectId) return;
    try {
      const res = await fetchJson<{ integrations: Integration[] }>(`/api/integrations?projectId=${selectedProjectId}`);
      setProjectIntegrations(res.integrations);
    } catch { /* ignore */ }
  }, [selectedProjectId]);

  useEffect(() => {
    if ((activeView === "schemas" || activeView === "secrets") && selectedProjectId) {
      void refreshSchemas();
    }
    if ((activeView === "integrations" || activeView === "secrets") && selectedProjectId) {
      void refreshIntegrations();
    }
  }, [activeView, selectedProjectId, refreshSchemas, refreshIntegrations]);

  // Get schema for currently selected file
  const currentFileSchema = selectedSecretSet
    ? fileSchemas.find((s) => s.filePath === (selectedSecretSet.filePath || ".env")) ?? null
    : null;
  const currentFileMeta = selectedSecretSet
    ? environmentsMeta
      .find((meta) => meta.environment.id === selectedEnvironmentId)
      ?.files.find((file) => file.secretSetId === selectedSecretSet.id) ?? null
    : null;
  const currentIntegration = selectedSecretSet
    ? projectIntegrations.find((integration) =>
      integration.environmentMappings.some((mapping) =>
        mapping.environmentId === selectedEnvironmentId &&
        mapping.filePath === (selectedSecretSet.filePath || ".env")
      )
    ) ?? null
    : null;
  const currentIntegrationMapping = currentIntegration?.environmentMappings.find((mapping) =>
    mapping.environmentId === selectedEnvironmentId &&
    mapping.filePath === (selectedSecretSet?.filePath || ".env")
  ) ?? null;

  // --- Reset crypto when environment changes ---
  useEffect(() => {
    setDerivedKey(null);
    setEnvPassword("");
    setUnlockError(null);
    setEnvEntries([]);
    setDirtyFlag(false);
    setShowPassword(false);
    setLatestRevision(null);
    setHistory([]);
  }, [selectedEnvironmentId]);

  useEffect(() => {
    if (!pendingEnvironmentOpen || selectedEnvironmentId !== pendingEnvironmentOpen.environmentId) {
      return;
    }

    setDerivedKey(pendingEnvironmentOpen.key);
    if (pendingEnvironmentOpen.password) {
      setEnvPassword(pendingEnvironmentOpen.password);
    }
    setLatestRevision(pendingEnvironmentOpen.latestRevision);
    setEnvEntries(pendingEnvironmentOpen.entries);
    setDirtyFlag(false);
    selectSecretSet(pendingEnvironmentOpen.secretSetId);
    setActiveView("secrets");
    setPendingEnvironmentOpen(null);
  }, [pendingEnvironmentOpen, selectedEnvironmentId, selectSecretSet]);

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

  async function fetchEnvironmentSecretSets(environmentId: string) {
    const response = await fetchJson<{ secretSets: SecretSet[] }>(`/api/secret-sets/list?environmentId=${environmentId}`);
    return response.secretSets;
  }

  async function verifyEnvironmentKey(environmentId: string, key: string) {
    const environment = environments.find((item) => item.id === environmentId);
    if (!environment) {
      throw new Error("Environment not found.");
    }

    if (environment.passwordVerifier) {
      const verifier = await hashContent(`tokengate-env-verifier:${key}`);
      if (verifier !== environment.passwordVerifier) {
        throw new Error("Wrong password.");
      }
      return;
    }

    const environmentMeta = environmentsMeta.find((meta) => meta.environment.id === environmentId) ?? null;
    const environmentSecretSets = await resolveEnvironmentSecretSets({
      environmentId,
      selectedEnvironmentId,
      selectedSecretSets: environmentId === selectedEnvironmentId ? secretSets : [],
      environmentMeta,
      fetchSecretSets: fetchEnvironmentSecretSets,
    });
    if (environmentSecretSets.length === 0) return;

    let hasProtectedRevision = false;
    for (const secretSet of environmentSecretSets) {
      const latest = await fetchJson<{ revision: SecretRevision | null }>(`/api/revisions/latest?secretSetId=${secretSet.id}`);
      if (!latest.revision) {
        continue;
      }

      hasProtectedRevision = true;
      try {
        await decryptRevisionPayload(
          {
            ciphertext: latest.revision.ciphertext,
            wrappedDataKey: latest.revision.wrappedDataKey,
            contentHash: latest.revision.contentHash,
          },
          key,
        );
        return;
      } catch {
        continue;
      }
    }

    if (hasProtectedRevision) {
      throw new Error("Wrong password. None of this environment's files could be decrypted.");
    }
  }

  async function resolveEnvironmentKey(environmentId: string, password?: string, filePath?: string) {
    if (selectedEnvironmentId === environmentId && derivedKey) {
      return derivedKey;
    }

    const environment = environments.find((env) => env.id === environmentId);
    if (!environment) {
      throw new Error("Mapped environment not found.");
    }

    const candidatePassword =
      password ??
      (selectedEnvironmentId === environmentId ? envPassword : "");

    if (!candidatePassword) {
      return null;
    }

    const environmentMeta = environmentsMeta.find((meta) => meta.environment.id === environmentId) ?? null;
    const environmentSecretSets = await resolveEnvironmentSecretSets({
      environmentId,
      selectedEnvironmentId,
      selectedSecretSets: environmentId === selectedEnvironmentId ? secretSets : [],
      environmentMeta,
      fetchSecretSets: fetchEnvironmentSecretSets,
    });
    const preferredSecretSet = pickPreferredSecretSet(environmentSecretSets, filePath);
    const keySalt = preferredSecretSet?.keySalt || environment.keySalt;
    if (!keySalt) {
      throw new Error("This environment is missing its encryption salt.");
    }

    const key = await deriveEnvironmentKey(candidatePassword, keySalt);
    await verifyEnvironmentKey(environmentId, key);
    return key;
  }

  async function storeIntegrationPull(result: {
    count: number;
    schemaCreated?: boolean;
    schemaFields?: number;
    newFields?: number;
    filePath: string;
    environmentId: string | null;
    vars: Array<{ key: string; value: string; sensitive?: boolean }>;
  }, targetKey: string, passwordUsed?: string) {
    if (!result.environmentId) {
      throw new Error("Integration is missing an environment mapping.");
    }

    let targetSecretSetId =
      (result.environmentId === selectedEnvironmentId
        ? secretSets.find((ss) => (ss.filePath || ".env") === result.filePath)?.id ?? null
        : null);

    if (!targetSecretSetId) {
      const environmentMeta = environmentsMeta.find((meta) => meta.environment.id === result.environmentId) ?? null;
      const existingSecretSets = await resolveEnvironmentSecretSets({
        environmentId: result.environmentId,
        selectedEnvironmentId,
        selectedSecretSets: result.environmentId === selectedEnvironmentId ? secretSets : [],
        environmentMeta,
        fetchSecretSets: fetchEnvironmentSecretSets,
      });
      targetSecretSetId = pickPreferredSecretSet(existingSecretSets, result.filePath)?.id ?? null;
    }

    if (!targetSecretSetId) {
      const created = await postJson<{ secretSetId: string }>("/api/secret-sets/add", {
        environmentId: result.environmentId,
        filePath: result.filePath,
      });
      targetSecretSetId = created.secretSetId;
    }

    const latestForTarget = await fetchJson<{ revision: SecretRevision | null }>(
      `/api/revisions/latest?secretSetId=${targetSecretSetId}`
    );
    const normalized = normalizeEnvDocument(
      stringifyEnvEntries(result.vars.map((v) => ({ key: v.key, value: v.value })))
    );
    const encrypted = await encryptRevisionPayload(normalized, targetKey);
    const revisionResult = await postJson<{
      conflict: boolean;
      acceptedRevision?: number;
      latestRevision?: number;
    }>("/api/revisions", {
      secretSetId: targetSecretSetId,
      baseRevision: latestForTarget.revision?.revision,
      ciphertext: encrypted.ciphertext,
      wrappedDataKey: encrypted.wrappedDataKey,
      contentHash: encrypted.contentHash,
    });

    if (revisionResult.conflict) {
      throw new Error(`Conflict: remote is at revision ${revisionResult.latestRevision}. Reload and retry.`);
    }

    const latestStored = await fetchJson<{ revision: SecretRevision | null }>(
      `/api/revisions/latest?secretSetId=${targetSecretSetId}`
    );
    const parsedEntries = parseEnvDocument(normalized);

    await refreshEnvironments();
    if (result.environmentId === selectedEnvironmentId) {
      await refreshSecretSets();
      setDerivedKey(targetKey);
      if (passwordUsed) {
        setEnvPassword(passwordUsed);
      }
      setLatestRevision(latestStored.revision);
      setEnvEntries(parsedEntries);
      setDirtyFlag(false);
    } else {
      setPendingEnvironmentOpen({
        environmentId: result.environmentId,
        secretSetId: targetSecretSetId,
        key: targetKey,
        password: passwordUsed,
        entries: parsedEntries,
        latestRevision: latestStored.revision,
      });
      selectEnvironment(result.environmentId);
    }
    selectSecretSet(targetSecretSetId);
    setActiveView("secrets");
  }

  async function pullIntegrationToFile(integration: Integration, mappingIndex = 0, password?: string) {
    const mapping = integration.environmentMappings[mappingIndex];
    if (!mapping) {
      throw new Error("Integration has no environment mapping.");
    }

    let targetKey: string;
    const resolved = await resolveEnvironmentKey(mapping.environmentId, password, mapping.filePath);
    if (!resolved) {
      setSyncPasswordValue("");
      setSyncPasswordPrompt({
        integration,
        mappingIndex,
        environmentId: mapping.environmentId,
      });
      return;
    }
    targetKey = resolved;

    const result = await postJson<{
      count: number;
      schemaCreated?: boolean;
      schemaFields?: number;
      newFields?: number;
      filePath: string;
      environmentId: string | null;
      vars: Array<{ key: string; value: string; sensitive?: boolean }>;
    }>(`/api/integrations/${integration.id}/sync`, { direction: "pull", mappingIndex });

    await storeIntegrationPull(result, targetKey, password);
    await refreshIntegrations();
    await refreshSchemas();

    const parts = [`Pulled ${result.count} vars into ${result.filePath}`];
    if (result.schemaCreated) {
      parts.push(`schema: ${result.schemaFields} fields (${result.newFields} new)`);
    }
    pushToast(parts.join(" — "), "success");
  }

  async function pushCurrentFileToIntegration() {
    if (!currentIntegration || !currentIntegrationMapping) {
      throw new Error("This file is not backed by an integration.");
    }

    const mappingIndex = currentIntegration.environmentMappings.findIndex((mapping) =>
      mapping.environmentId === currentIntegrationMapping.environmentId &&
      mapping.filePath === currentIntegrationMapping.filePath
    );

    await postJson<{ count: number }>(`/api/integrations/${currentIntegration.id}/sync`, {
      direction: "push",
      mappingIndex,
      vars: envEntries.filter((entry) => entry.key.trim()).map((entry) => ({
        key: entry.key,
        value: entry.value,
      })),
    });
    await refreshIntegrations();
    pushToast(`Pushed ${envEntries.filter((entry) => entry.key.trim()).length} vars to ${currentIntegration.provider}.`, "success");
  }

  // --- Unlock environment with password ---
  function handleUnlockEnv() {
    const keySalt = selectedSecretSet?.keySalt || secretSets[0]?.keySalt || selectedEnvironment?.keySalt;
    if (!keySalt || !envPassword) {
      setUnlockError("This environment is missing its encryption salt.");
      return;
    }
    startTransition(async () => {
      try {
        setUnlockError(null);
        const key = await deriveEnvironmentKey(envPassword, keySalt);
        await verifyEnvironmentKey(selectedEnvironmentId, key);

        setDerivedKey(key);
        setDirtyFlag(false);
        if (latestRevision) {
          try {
            const plaintext = await decryptRevisionPayload(
              { ciphertext: latestRevision.ciphertext, wrappedDataKey: latestRevision.wrappedDataKey, contentHash: latestRevision.contentHash },
              key,
            );
            setEnvEntries(parseEnvDocument(plaintext));
          } catch {
            pushToast("Environment unlocked, but the selected file could not be decrypted. Try another file or check its latest revision.", "error");
          }
        }
        pushToast("Environment unlocked.", "success");
      } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to derive key.";
        setUnlockError(message);
        pushToast(message, "error");
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
        await refreshWorkspaces();
        pushToast("Project created.", "success");
        selectProject(payload.projectId);
        setActiveView("project");
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
        const environmentKey = await deriveEnvironmentKey(modalPassword, keySalt);
        const passwordVerifier = await hashContent(`tokengate-env-verifier:${environmentKey}`);
        const payload = await postJson<{ environmentId: string }>("/api/environments", {
          projectId: selectedProjectId,
          name: modalName.trim(),
          slug: toSlug(modalName),
          keySalt,
          passwordVerifier,
        });
        setModal(null);
        setModalName("");
        setModalPassword("");
        pushToast("Environment created. Use your password to unlock it.", "success");
        await refreshEnvironments();
        selectEnvironment(payload.environmentId);
        setActiveView("environment");
      } catch (err) {
        pushToast(err instanceof Error ? err.message : "Failed.", "error");
      }
    });
  }

  function handleSaveIntegrationMapping() {
    if (!integrationMappingModal || !integrationMappingValues.environmentId || !integrationMappingValues.filePath.trim()) return;

    startTransition(async () => {
      try {
        const nextMappings = [
          ...integrationMappingModal.integration.environmentMappings.filter((mapping) =>
            !(mapping.environmentId === integrationMappingValues.environmentId && mapping.filePath === integrationMappingValues.filePath.trim())
          ),
          {
            environmentId: integrationMappingValues.environmentId,
            filePath: integrationMappingValues.filePath.trim(),
            providerTarget: integrationMappingValues.providerTarget.trim() || (integrationMappingModal.integration.provider === "vercel" ? "production" : "*"),
          },
        ];

        await patchJson(`/api/integrations/${integrationMappingModal.integration.id}`, {
          environmentMappings: nextMappings,
        });
        setIntegrationMappingModal(null);
        pushToast("Integration mapping saved.", "success");
        await refreshIntegrations();
        await refreshEnvironments();
      } catch (err) {
        pushToast(err instanceof Error ? err.message : "Failed.", "error");
      }
    });
  }

  const selectedProjectEnvironmentMeta = environmentsMeta.filter((meta) => meta.environment.projectId === selectedProjectId);
  const selectedProjectFileCount = selectedProjectEnvironmentMeta.reduce((sum, meta) => sum + meta.fileCount, 0);
  const selectedProjectLatestTimestamp = selectedProjectEnvironmentMeta.reduce<number | null>((latest, meta) => {
    if (!meta.latestRevisionTimestamp) return latest;
    return latest === null || meta.latestRevisionTimestamp > latest ? meta.latestRevisionTimestamp : latest;
  }, null);
  const selectedEnvironmentMeta = environmentsMeta.find((meta) => meta.environment.id === selectedEnvironmentId) ?? null;

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

  // --- Delete handlers ---
  function handleDeleteProject(projectId: string, projectName: string) {
    setConfirmAction({
      title: "Delete project",
      message: `Permanently delete "${projectName}" and all its environments, files, and revisions? This cannot be undone.`,
      destructive: true,
      onConfirm: () => {
        setConfirmAction(null);
        startTransition(async () => {
          try {
            await deleteJson(`/api/projects/${projectId}`);
            pushToast(`Project "${projectName}" deleted.`, "success");
            void refreshWorkspaces();
          } catch (err) { pushToast(err instanceof Error ? err.message : "Failed.", "error"); }
        });
      },
    });
  }

  function handleDeleteEnvironment(envId: string, envName: string) {
    setConfirmAction({
      title: "Delete environment",
      message: `Permanently delete "${envName}" and all its files and revisions? This cannot be undone.`,
      destructive: true,
      onConfirm: () => {
        setConfirmAction(null);
        startTransition(async () => {
          try {
            await deleteJson(`/api/environments/${envId}`);
            pushToast(`Environment "${envName}" deleted.`, "success");
            void refreshEnvironments();
          } catch (err) { pushToast(err instanceof Error ? err.message : "Failed.", "error"); }
        });
      },
    });
  }

  function handleDeleteFile(ssId: string, filePath: string) {
    setConfirmAction({
      title: "Delete file",
      message: `Permanently delete "${filePath}" and all its revision history? This cannot be undone.`,
      destructive: true,
      onConfirm: () => {
        setConfirmAction(null);
        startTransition(async () => {
          try {
            await deleteJson(`/api/secret-sets/${ssId}`);
            pushToast(`File "${filePath}" deleted.`, "success");
            void refreshEnvironments();
          } catch (err) { pushToast(err instanceof Error ? err.message : "Failed.", "error"); }
        });
      },
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
      {/* Mobile sidebar overlay */}
      {mobileSidebarOpen && <div className="sidebar-overlay" onClick={() => setMobileSidebarOpen(false)} />}

      {/* SIDEBAR */}
      <aside className={`sidebar${mobileSidebarOpen ? " open" : ""}`}>
        <div className="sidebar-header">
          <IconShield size={22} />
          <span>Tokengate</span>
          <button className="sidebar-close-btn" onClick={() => setMobileSidebarOpen(false)}><IconX size={18} /></button>
        </div>

        {/* Workspace Switcher */}
        <div className="sidebar-section">
          {loadingWorkspaces && (
            <>
              <div className="sidebar-skeleton" /><div className="sidebar-skeleton w-[60%]" />
            </>
          )}
          {!loadingWorkspaces && (
            <div className="workspace-switcher">
              <button
                className="workspace-switcher-trigger"
                onClick={() => setShowWorkspaceSwitcher(!showWorkspaceSwitcher)}
              >
                <IconBox size={14} />
                <span className="flex-1 text-left font-semibold">
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
                      onClick={() => { selectWorkspace(w.workspace!.id); setShowWorkspaceSwitcher(false); setActiveView("project"); setMobileSidebarOpen(false); }}
                    >
                      <IconBox size={14} />
                      <span className="flex-1 text-left">{w.workspace.name}</span>
                      <span className="role-badge" data-role={w.membership.role}>{w.membership.role}</span>
                    </button>
                  ) : null)}
                  <div className="divider my-1" />
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
            <div className="flex items-center justify-between px-2 pb-2">
              <span className="sidebar-section-label p-0">Projects</span>
              <button
                className="icon-button w-[22px] h-[22px]"
                onClick={() => { setModal("project"); setModalName(""); }}
                title="New project"
              >
                <IconPlus size={12} />
              </button>
            </div>
            {loadingProjects && (
              <>
                <div className="sidebar-skeleton" /><div className="sidebar-skeleton w-[55%]" />
              </>
            )}
            {!loadingProjects && projects.length === 0 && <span className="muted text-[13px] px-3">No projects</span>}
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
                      setActiveView("project");
                    }}
                    onContextMenu={(e) => showContextMenu(e, [
                      { label: "Delete project", destructive: true, onClick: () => handleDeleteProject(proj.id, proj.name) },
                    ])}
                  >
                    <span className="inline-flex transition-transform duration-[120ms] ease-in-out" style={{ transform: isExpanded ? "rotate(90deg)" : "none" }}>
                      <IconChevron size={12} />
                    </span>
                    <IconFolder size={14} />
                    <span className="flex-1 text-left">{proj.name}</span>
                  </button>
                  {/* Environments under project */}
                  {isExpanded && proj.id === selectedProjectId && (
                    <div className="sidebar-tree-children">
                      {loadingEnvironments && <div className="sidebar-skeleton w-[70%]" />}
                      {!loadingEnvironments && projectEnvs.length === 0 && (
                        <span className="muted text-xs block py-1 pl-2 pr-3">No environments</span>
                      )}
                      {!loadingEnvironments && environments.map((env) => {
                        const meta = environmentsMeta.find((m) => m.environment.id === env.id);
                        const isSelected = env.id === selectedEnvironmentId;
                        return (
                          <div key={env.id}>
                            <button
                              className={`sidebar-item${isSelected ? " active" : ""} pl-2`}
                              onClick={() => { selectEnvironment(env.id); setActiveView("environment"); setMobileSidebarOpen(false); }}
                              onContextMenu={(e) => showContextMenu(e, [
                                { label: "Delete environment", destructive: true, onClick: () => handleDeleteEnvironment(env.id, env.name) },
                              ])}
                            >
                              <IconLayers size={13} />
                              <span className="flex-1 text-left">{env.name}</span>
                              <span className="flex items-center gap-[6px] ml-auto">
                                {meta?.latestRevisionTimestamp && (
                                  <span className="muted text-[10px]">{formatRelativeTime(meta.latestRevisionTimestamp)}</span>
                                )}
                                {isSelected && (isEnvUnlocked ? <IconUnlock size={11} /> : <IconLock size={11} />)}
                              </span>
                            </button>
                            {/* File list under selected environment */}
                            {isSelected && secretSets.length > 0 && (
                              <div className="sidebar-tree-children">
                                {secretSets.map((ss) => {
                                  const fileMeta = meta?.files.find((f: { secretSetId: string }) => f.secretSetId === ss.id);
                                  return (
                                    <button
                                      key={ss.id}
                                      className={`sidebar-item${ss.id === selectedSecretSetId ? " active" : ""} text-xs py-[3px] px-2`}
                                      onClick={() => { selectSecretSet(ss.id); setActiveView("secrets"); }}
                                      onContextMenu={(e) => showContextMenu(e, [
                                        { label: "Delete file", destructive: true, onClick: () => handleDeleteFile(ss.id, ss.filePath || ".env") },
                                      ])}
                                    >
                                      <FileSourceIcon source={(fileMeta as { source?: string } | undefined)?.source} size={10} />
                                      <span className="text-[11px]" style={{ fontFamily: "var(--font-mono)" }}>{ss.filePath || ".env"}</span>
                                      {(fileMeta as { hasSchema?: boolean } | undefined)?.hasSchema && <span className="ml-auto text-[8px] opacity-60 uppercase tracking-wider" style={{ fontFamily: "var(--font-mono)" }}>S</span>}
                                    </button>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        );
                      })}
                      <button
                        className="sidebar-item pl-2 text-xs opacity-70"
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
        <div className="mt-auto">
          <div className="divider" />
          {selectedWorkspaceId && (
            <>
              <button
                className={`sidebar-item${activeView === "schemas" ? " active" : ""} m-[4px_10px] w-[calc(100%-20px)]`}
                onClick={() => setActiveView(activeView === "schemas" ? "secrets" : "schemas")}
              >
                <IconFile size={14} />
                <span>File schemas</span>
              </button>
              <button
                className={`sidebar-item${activeView === "integrations" ? " active" : ""} m-[4px_10px] w-[calc(100%-20px)]`}
                onClick={() => setActiveView(activeView === "integrations" ? "secrets" : "integrations")}
              >
                <IconLayers size={14} />
                <span>Integrations</span>
              </button>
              <button
                className={`sidebar-item${activeView === "settings" ? " active" : ""} m-[4px_10px] w-[calc(100%-20px)]`}
                onClick={() => setActiveView(activeView === "settings" ? "secrets" : "settings")}
              >
                <IconSettings size={14} />
                <span>Settings</span>
              </button>
            </>
          )}
          <div className="pt-2 px-[18px] pb-3 border-t border-[var(--sidebar-border)] flex items-center gap-[10px]">
            <UserButton appearance={{ elements: { avatarBox: { width: 28, height: 28 } } }} />
            <span className="muted text-xs">Account</span>
          </div>
        </div>
      </aside>

      {/* MAIN */}
      <main className="main-content">
        {/* Breadcrumb header */}
        <div className="content-header">
          <button className="mobile-menu-btn" onClick={() => setMobileSidebarOpen(true)}><IconMenu size={18} /></button>
          <nav className="breadcrumb">
            {selectedWorkspace && (
              <>
                <span>{selectedWorkspace.name}</span>
                {activeView === "settings" && <><IconChevron size={12} /><span>Settings</span></>}
                {activeView === "schemas" && <><IconChevron size={12} /><span>File Schemas</span></>}
                {activeView === "integrations" && <><IconChevron size={12} /><span>Integrations</span></>}
                {activeView === "project" && selectedProject && <><IconChevron size={12} /><span>{selectedProject.name}</span></>}
                {activeView === "environment" && selectedProject && <><IconChevron size={12} /><span>{selectedProject.name}</span></>}
                {activeView === "environment" && selectedEnvironment && <><IconChevron size={12} /><span>{selectedEnvironment.name}</span></>}
                {activeView === "secrets" && selectedProject && <><IconChevron size={12} /><span>{selectedProject.name}</span></>}
                {activeView === "secrets" && selectedEnvironment && <><IconChevron size={12} /><span>{selectedEnvironment.name}</span></>}
                {activeView === "secrets" && selectedSecretSet && <><IconChevron size={12} /><FileSourceIcon source={currentFileMeta?.source} size={12} /><span className="text-[13px]" style={{ fontFamily: "var(--font-mono)" }}>{selectedSecretSet.filePath || ".env"}</span></>}
              </>
            )}
            {!selectedWorkspace && !loadingWorkspaces && <span className="muted">Select a workspace to begin</span>}
            {loadingWorkspaces && <span className="muted">Loading...</span>}
          </nav>
          <div className="status-bar">
            {isEnvUnlocked && selectedEnvironment && (
              <>
                <span className="tag encrypted"><IconShield size={12} /> E2E Encrypted</span>
                <span className="tag cursor-pointer" onClick={handleLockEnv}><IconUnlock size={12} /> Unlocked</span>
              </>
            )}
            {!isEnvUnlocked && selectedEnvironment && (
              <span className="tag locked"><IconLock size={12} /> Locked</span>
            )}
          </div>
        </div>

        {/* SETTINGS VIEW */}
        {activeView === "settings" && selectedWorkspace && (
          <div className="fade-in p-6 flex flex-col gap-6">
            {/* General */}
            <div className="panel p-5">
              <h3 className="mb-4">General</h3>
              <div className="grid gap-3 text-sm">
                <div className="flex items-center gap-3">
                  <span className="muted w-[80px]">Name</span>
                  <span className="font-semibold">{selectedWorkspace.name}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="muted w-[80px]">Slug</span>
                  <code className="text-[13px]" style={{ fontFamily: "var(--font-mono)" }}>{selectedWorkspace.slug}</code>
                </div>
                <div className="flex items-center gap-3">
                  <span className="muted w-[80px]">Type</span>
                  <span className="tag">{selectedWorkspace.type}</span>
                </div>
              </div>
            </div>

            {/* Members */}
            <div className="panel p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="flex items-center gap-2"><IconUsers size={16} /> Members</h3>
                {isOwnerOrAdmin && (
                  <button className="button sm" onClick={() => { setModal("invite"); setInviteEmail(""); setInviteRole("member"); setLastInviteLink(null); }}>
                    <IconPlus size={12} /> Invite
                  </button>
                )}
              </div>
              {loadingMembers && (
                <div className="flex items-center gap-2 p-3">
                  <div className="spinner" /> <span className="muted">Loading members...</span>
                </div>
              )}
              {!loadingMembers && (
                <div className="members-list">
                  {members.map((m) => (
                    <div key={m.id} className="member-row">
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-sm">{m.fullName || "Unknown"}</div>
                        <div className="muted text-xs" style={{ fontFamily: "var(--font-mono)" }}>{m.email || m.userId}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        {m.role === "owner" ? (
                          <span className="role-badge" data-role="owner">owner</span>
                        ) : isOwner ? (
                          <select
                            className="select w-auto text-xs py-1 pr-7 pl-2 border-2 border-[var(--border-light)]"
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
                            className="icon-button text-[var(--error)]"
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
              <div className="panel p-5">
                <h3 className="flex items-center gap-2 mb-4"><IconMail size={16} /> Pending invites</h3>
                <div className="members-list">
                  {pendingInvites.map((inv) => (
                    <div key={inv.id} className="member-row">
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-sm" style={{ fontFamily: "var(--font-mono)" }}>{inv.email}</div>
                        <div className="muted text-xs">
                          Invited {formatRelativeTime(inv.createdAt)} &middot; Expires {new Date(inv.expiresAt).toLocaleDateString()}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="role-badge" data-role={inv.role}>{inv.role}</span>
                        <button
                          className="icon-button text-[var(--error)]"
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

        {/* SCHEMAS VIEW */}
        {activeView === "schemas" && selectedWorkspace && selectedProject && (
          <div className="fade-in p-6 flex flex-col gap-6">
            <div className="panel p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="flex items-center gap-2"><IconFile size={16} /> File Schemas</h3>
                <button className="button sm" onClick={() => {
                  showInputModal("New File Schema", [{ key: "filePath", label: "File path", placeholder: ".env, .env.local, etc." }], (vals) => {
                    if (vals.filePath?.trim()) setSchemaEditing({ filePath: vals.filePath.trim(), fields: [] });
                  });
                }}>
                  <IconPlus size={12} /> New schema
                </button>
              </div>
              <p className="muted text-sm mb-4">
                Define the variables each file should contain. Schemas are shared across all environments.
              </p>

              {loadingSchemas && <div className="flex items-center gap-2 p-3"><div className="spinner" /><span className="muted text-xs">Loading...</span></div>}

              {!loadingSchemas && fileSchemas.length === 0 && !schemaEditing && (
                <p className="muted text-sm">No schemas defined yet. Create one to enforce variable structure across environments.</p>
              )}

              {/* Existing schemas */}
              {fileSchemas.map((schema) => (
                <div key={schema.id} className="panel p-4 mb-3">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <span className="font-bold text-sm" style={{ fontFamily: "var(--font-mono)" }}>{schema.filePath}</span>
                      <span className="muted text-xs ml-2">v{schema.version} &middot; {schema.fields.length} field{schema.fields.length !== 1 ? "s" : ""}</span>
                    </div>
                    <div className="flex gap-2">
                      <button className="button sm secondary" onClick={() => setSchemaEditing({ filePath: schema.filePath, fields: [...schema.fields] })}>Edit</button>
                      <button className="button sm destructive" onClick={() => {
                        setConfirmAction({
                          title: "Delete schema",
                          message: `Delete the schema for "${schema.filePath}"? This won't delete any environment values, but schema validation will be removed.`,
                          destructive: true,
                          onConfirm: () => { setConfirmAction(null); void deleteJson(`/api/schemas/${schema.id}`).then(() => refreshSchemas()); },
                        });
                      }}>Delete</button>
                    </div>
                  </div>
                  <div className="env-editor">
                    <div className="ed1-line font-bold text-[10px] uppercase tracking-wider" style={{ fontFamily: "var(--font-mono)", background: "var(--surface-hover)", color: "var(--muted)" }}>
                      <span className="flex-1 px-2 py-1">Name</span>
                      <span className="w-20 px-2 py-1">Type</span>
                      <span className="w-12 px-2 py-1 text-center">Req</span>
                      <span className="w-12 px-2 py-1 text-center">Sens</span>
                      <span className="flex-1 px-2 py-1">Default</span>
                    </div>
                    {schema.fields.map((f, i) => (
                      <div key={i} className="ed1-line text-xs">
                        <span className="flex-1 px-2 py-1 font-bold" style={{ fontFamily: "var(--font-mono)", color: "var(--accent-strong)" }}>{f.name}</span>
                        <span className="w-20 px-2 py-1 muted">{f.type}</span>
                        <span className="w-12 px-2 py-1 text-center">{f.required ? "yes" : ""}</span>
                        <span className="w-12 px-2 py-1 text-center">{f.sensitive ? "yes" : ""}</span>
                        <span className="flex-1 px-2 py-1 muted">{f.defaultValue || ""}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}

              {/* Schema editor */}
              {schemaEditing && (
                <div className="panel p-4 mt-3" style={{ border: "3px solid var(--accent)" }}>
                  <div className="flex items-center justify-between mb-3">
                    <span className="font-bold text-sm" style={{ fontFamily: "var(--font-mono)" }}>
                      {schemaEditing.filePath}
                    </span>
                    <div className="flex gap-2">
                      <button className="button sm" disabled={isPending} onClick={() => {
                        startTransition(async () => {
                          try {
                            await postJson("/api/schemas", {
                              projectId: selectedProjectId,
                              filePath: schemaEditing.filePath,
                              fields: schemaEditing.fields,
                            });
                            pushToast("Schema saved.", "success");
                            setSchemaEditing(null);
                            await Promise.all([refreshSchemas(), refreshEnvironments()]);
                            await refreshSecretSets();
                          } catch (err) {
                            pushToast(err instanceof Error ? err.message : "Failed.", "error");
                          }
                        });
                      }}>
                        {isPending ? "Saving..." : "Save"}
                      </button>
                      <button className="button sm secondary" onClick={() => setSchemaEditing(null)}>Cancel</button>
                    </div>
                  </div>

                  {schemaEditing.fields.map((f, i) => (
                    <div key={i} className="ed1-line text-xs flex items-center">
                      <input className="ed1-key flex-1" value={f.name} onChange={(e) => {
                        const updated = [...schemaEditing.fields];
                        updated[i] = { ...f, name: e.target.value };
                        setSchemaEditing({ ...schemaEditing, fields: updated });
                      }} placeholder="VARIABLE_NAME" spellCheck={false} />
                      <select className="select w-24 text-xs py-1 px-2 border-0" value={f.type} onChange={(e) => {
                        const updated = [...schemaEditing.fields];
                        updated[i] = { ...f, type: e.target.value };
                        setSchemaEditing({ ...schemaEditing, fields: updated });
                      }}>
                        <option value="string">string</option>
                        <option value="number">number</option>
                        <option value="boolean">boolean</option>
                        <option value="url">url</option>
                        <option value="enum">enum</option>
                      </select>
                      <label className="flex items-center gap-1 px-2 text-[10px] muted cursor-pointer">
                        <input type="checkbox" checked={f.required} onChange={(e) => {
                          const updated = [...schemaEditing.fields];
                          updated[i] = { ...f, required: e.target.checked };
                          setSchemaEditing({ ...schemaEditing, fields: updated });
                        }} /> req
                      </label>
                      <label className="flex items-center gap-1 px-2 text-[10px] muted cursor-pointer">
                        <input type="checkbox" checked={f.sensitive} onChange={(e) => {
                          const updated = [...schemaEditing.fields];
                          updated[i] = { ...f, sensitive: e.target.checked };
                          setSchemaEditing({ ...schemaEditing, fields: updated });
                        }} /> sens
                      </label>
                      <input className="ed1-val w-28" value={f.defaultValue || ""} onChange={(e) => {
                        const updated = [...schemaEditing.fields];
                        updated[i] = { ...f, defaultValue: e.target.value || undefined };
                        setSchemaEditing({ ...schemaEditing, fields: updated });
                      }} placeholder="default" spellCheck={false} />
                      <button className="ed1-del opacity-100" onClick={() => {
                        const updated = schemaEditing.fields.filter((_, j) => j !== i);
                        setSchemaEditing({ ...schemaEditing, fields: updated });
                      }}><IconTrash size={12} /></button>
                    </div>
                  ))}

                  <div className="flex items-center gap-2 mt-2">
                    <input className="ed1-search flex-1" value={newFieldName} onChange={(e) => setNewFieldName(e.target.value.toUpperCase())} placeholder="NEW_VARIABLE" spellCheck={false}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && newFieldName.trim()) {
                          setSchemaEditing({
                            ...schemaEditing,
                            fields: [...schemaEditing.fields, { name: newFieldName.trim(), type: newFieldType, required: true, sensitive: false }],
                          });
                          setNewFieldName("");
                        }
                      }}
                    />
                    <select className="select w-24 text-xs py-1 px-2" value={newFieldType} onChange={(e) => setNewFieldType(e.target.value)}>
                      <option value="string">string</option>
                      <option value="number">number</option>
                      <option value="boolean">boolean</option>
                      <option value="url">url</option>
                      <option value="enum">enum</option>
                    </select>
                    <button className="button sm" onClick={() => {
                      if (!newFieldName.trim()) return;
                      setSchemaEditing({
                        ...schemaEditing,
                        fields: [...schemaEditing.fields, { name: newFieldName.trim(), type: newFieldType, required: true, sensitive: false }],
                      });
                      setNewFieldName("");
                    }}><IconPlus size={12} /> Add</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* INTEGRATIONS VIEW */}
        {activeView === "integrations" && selectedWorkspace && selectedProject && (
          <div className="fade-in p-6 flex flex-col gap-6">
            <div className="panel p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="flex items-center gap-2"><IconLayers size={16} /> Integrations</h3>
              </div>
              <p className="muted text-sm mb-4">
                Connect external services to sync environment variables.
              </p>

              {/* Connected integrations */}
              {projectIntegrations.length > 0 && (
                <div className="flex flex-col gap-3 mb-4">
                  {projectIntegrations.map((integ) => (
                    <div key={integ.id} className="panel p-4 flex items-start gap-4">
                      <div className="w-10 h-10 flex items-center justify-center border-3 border-[var(--border)] bg-[var(--surface-hover)]">
                        {integ.provider === "convex" ? <IconConvex size={20} /> : <IconVercel size={16} />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm">{integ.label || integ.provider}</span>
                          <span className="tag text-[9px]">{integ.provider}</span>
                          {integ.environmentMappings.length === 0 && (
                            <span className="tag text-[9px] bg-[var(--warning)] text-black">unmapped</span>
                          )}
                          {integ.lastSyncStatus && (
                            <span className={`tag text-[9px] ${integ.lastSyncStatus === "success" ? "encrypted" : "error"}`}>
                              {integ.lastSyncStatus}
                            </span>
                          )}
                        </div>
                        {integ.lastSyncAt && <span className="muted text-[10px]">Last synced: {new Date(integ.lastSyncAt).toLocaleString()}</span>}
                        <div className="flex flex-col gap-2 mt-3">
                          {integ.environmentMappings.length === 0 ? (
                            <div className="border-2 border-dashed border-[var(--border-light)] p-3 text-xs">
                              <div className="font-bold uppercase tracking-wider mb-1" style={{ fontFamily: "var(--font-mono)" }}>Project-level integration</div>
                              <div className="muted">This integration is not attached to any environment yet. Attach it to an environment and file to make it appear in the project tree.</div>
                            </div>
                          ) : (
                            integ.environmentMappings.map((mapping, mappingIndex) => {
                              const mappedEnvironment = environments.find((env) => env.id === mapping.environmentId);
                              return (
                                <div key={`${mapping.environmentId}:${mapping.filePath}`} className="flex items-center gap-2 text-xs border-2 border-[var(--border-light)] px-3 py-2">
                                  <IconLayers size={12} />
                                  <span className="font-bold">{mappedEnvironment?.name || "Unknown environment"}</span>
                                  <span className="muted">→</span>
                                  <span style={{ fontFamily: "var(--font-mono)" }}>{mapping.filePath}</span>
                                  <span className="tag text-[8px] ml-auto">{mapping.providerTarget}</span>
                                  <button className="button sm secondary" disabled={isPending} onClick={() => {
                                    startTransition(async () => {
                                      try {
                                        await pullIntegrationToFile(integ, mappingIndex);
                                      } catch (err) { pushToast(err instanceof Error ? err.message : "Sync failed.", "error"); }
                                    });
                                  }}>
                                    Pull
                                  </button>
                                </div>
                              );
                            })
                          )}
                        </div>
                        <div className="flex gap-2 mt-2">
                          <button className="button sm" onClick={() => openIntegrationMappingModal(integ, integ.environmentMappings.length === 0 ? "attach" : "add")}>
                            {integ.environmentMappings.length === 0 ? "Attach" : "Add mapping"}
                          </button>
                          <button className="button sm secondary" disabled={isPending} onClick={() => {
                            startTransition(async () => {
                              try {
                                await postJson(`/api/integrations/${integ.id}/test`, {});
                                pushToast("Connection OK.", "success");
                              } catch (err) { pushToast(err instanceof Error ? err.message : "Test failed.", "error"); }
                            });
                          }}>Test</button>
                          <button className="button sm destructive" onClick={() => {
                            setConfirmAction({
                              title: "Remove integration",
                              message: `Remove the ${integ.provider} integration "${integ.label || integ.provider}"? This won't delete any synced data.`,
                              destructive: true,
                              onConfirm: () => { setConfirmAction(null); void deleteJson(`/api/integrations/${integ.id}`).then(() => { refreshIntegrations(); pushToast("Removed.", "success"); }); },
                            });
                          }}>Remove</button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Add integration cards */}
              <div className="flex flex-col gap-3">
                {(["convex", "vercel"] as const).map((provider) => (
                  <div key={provider} className="panel p-4 flex items-start gap-4">
                    <div className="w-10 h-10 flex items-center justify-center border-3 border-[var(--border)] bg-[var(--surface-hover)]">
                      {provider === "convex" ? <IconConvex size={20} /> : <IconVercel size={16} />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-sm capitalize">{provider}</div>
                      <p className="muted text-xs mt-1">
                        {provider === "convex"
                          ? "Sync with a Convex deployment. Requires a deploy key."
                          : "Sync with a Vercel project. Requires an access token."}
                      </p>
                      <button className="button sm mt-2" onClick={() => {
                        showInputModal(
                          `Connect ${provider}`,
                          [
                            { key: "credential", label: provider === "convex" ? "Deploy key" : "Access token", placeholder: provider === "convex" ? "prod:deploy_key_..." : "vercel_..." , type: "password" },
                            { key: "extra", label: provider === "convex" ? "Deployment URL" : "Project ID or name", placeholder: provider === "convex" ? "https://happy-otter-123.convex.cloud" : "my-project" },
                            { key: "label", label: "Label (optional)", placeholder: `${provider} integration` },
                          ],
                          (vals) => {
                            if (!vals.credential || !vals.extra) { pushToast("Credential and URL/ID are required.", "error"); return; }
                            startTransition(async () => {
                              try {
                                await postJson("/api/integrations", {
                                  projectId: selectedProjectId,
                                  provider,
                                  label: vals.label || `${provider} integration`,
                                  config: {
                                    wrappedCredential: vals.credential,
                                    ...(provider === "convex" ? { deploymentUrl: vals.extra } : { vercelProjectId: vals.extra }),
                                  },
                                  environmentMappings: [],
                                });
                                pushToast("Integration added. Attach it to an environment when you’re ready.", "success");
                                void refreshIntegrations();
                              } catch (err) { pushToast(err instanceof Error ? err.message : "Failed.", "error"); }
                            });
                          },
                        );
                      }}>
                        <IconPlus size={12} /> Connect
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeView === "project" && selectedWorkspace && selectedProject && (
          <div className="fade-in p-6 flex flex-col gap-6">
            <div className="panel p-6 overflow-hidden relative">
              <div className="absolute inset-0 opacity-20 pointer-events-none" style={{ background: "radial-gradient(circle at top right, var(--accent) 0%, transparent 45%)" }} />
              <div className="relative flex flex-col gap-4">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <div className="muted text-[11px] uppercase tracking-[0.22em]" style={{ fontFamily: "var(--font-mono)" }}>Project overview</div>
                    <h2 className="m-0 text-[30px]" style={{ fontFamily: "var(--font-heading)" }}>{selectedProject.name}</h2>
                    <p className="muted m-0 mt-2 max-w-[640px]">A clean command center for environments, integration-backed files, schemas, and encrypted revision activity.</p>
                  </div>
                  <div className="flex gap-2">
                    <button className="button secondary" onClick={() => setActiveView("integrations")}>Integrations</button>
                    <button className="button secondary" onClick={() => setActiveView("schemas")}>Schemas</button>
                  </div>
                </div>
                <div className="grid gap-3 md:grid-cols-4">
                  <div className="panel p-4"><div className="muted text-[10px] uppercase tracking-wider">Environments</div><div className="text-2xl font-bold">{selectedProjectEnvironmentMeta.length}</div></div>
                  <div className="panel p-4"><div className="muted text-[10px] uppercase tracking-wider">Files</div><div className="text-2xl font-bold">{selectedProjectFileCount}</div></div>
                  <div className="panel p-4"><div className="muted text-[10px] uppercase tracking-wider">Integrations</div><div className="text-2xl font-bold">{projectIntegrations.length}</div></div>
                  <div className="panel p-4"><div className="muted text-[10px] uppercase tracking-wider">Last activity</div><div className="text-sm font-bold">{selectedProjectLatestTimestamp ? formatRelativeTime(selectedProjectLatestTimestamp) : "No revisions yet"}</div></div>
                </div>
              </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-[1.3fr_0.9fr]">
              <div className="panel p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="m-0 flex items-center gap-2"><IconLayers size={16} /> Environments</h3>
                  <button className="button sm" onClick={() => { setModal("environment"); setModalName(""); setModalPassword(""); }}>New environment</button>
                </div>
                <div className="flex flex-col gap-3">
                  {selectedProjectEnvironmentMeta.map((meta) => (
                    <button key={meta.environment.id} className="panel p-4 text-left transition-transform duration-150 hover:-translate-y-[1px]" onClick={() => { selectEnvironment(meta.environment.id); setActiveView("environment"); }}>
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <div className="font-bold">{meta.environment.name}</div>
                          <div className="muted text-xs mt-1">{meta.fileCount} file{meta.fileCount !== 1 ? "s" : ""}</div>
                        </div>
                        <div className="text-right">
                          <div className="text-[11px] uppercase tracking-wider muted" style={{ fontFamily: "var(--font-mono)" }}>{meta.latestRevisionTimestamp ? formatRelativeTime(meta.latestRevisionTimestamp) : "No revisions"}</div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="panel p-5">
                <h3 className="m-0 flex items-center gap-2 mb-4"><IconCloud size={16} /> Integration coverage</h3>
                <div className="flex flex-col gap-3">
                  {projectIntegrations.length === 0 && <p className="muted text-sm m-0">No integrations connected yet.</p>}
                  {projectIntegrations.map((integration) => (
                    <div key={integration.id} className="border-2 border-[var(--border-light)] p-3">
                      <div className="flex items-center gap-2 mb-2">
                        <FileSourceIcon source={integration.provider} size={12} />
                        <span className="font-bold text-sm">{integration.label || integration.provider}</span>
                      </div>
                      <div className="muted text-xs">{integration.environmentMappings.length === 0 ? "Unmapped. Attach it to an environment to surface it in the file tree." : `${integration.environmentMappings.length} mapped target${integration.environmentMappings.length !== 1 ? "s" : ""}`}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeView === "environment" && selectedWorkspace && selectedProject && selectedEnvironment && (
          <div className="fade-in p-6 flex flex-col gap-6">
            <div className="panel p-6 overflow-hidden relative">
              <div className="absolute inset-0 opacity-20 pointer-events-none" style={{ background: "linear-gradient(120deg, transparent 0%, var(--surface-hover) 30%, transparent 80%)" }} />
              <div className="relative flex items-start justify-between gap-4">
                <div>
                  <div className="muted text-[11px] uppercase tracking-[0.22em]" style={{ fontFamily: "var(--font-mono)" }}>Environment overview</div>
                  <h2 className="m-0 text-[30px]" style={{ fontFamily: "var(--font-heading)" }}>{selectedEnvironment.name}</h2>
                  <p className="muted m-0 mt-2 max-w-[640px]">Encrypted files, integration bindings, and revision activity for this environment.</p>
                </div>
                <div className="flex gap-2">
                  <button className="button secondary" onClick={() => setActiveView("secrets")} disabled={isEnvUnlocked && !selectedSecretSetId}>Unlock</button>
                  <button className="button" onClick={() => setActiveView("secrets")} disabled={!selectedSecretSetId}>Open files</button>
                </div>
              </div>
              <div className="grid gap-3 md:grid-cols-4 mt-5">
                <div className="panel p-4"><div className="muted text-[10px] uppercase tracking-wider">Files</div><div className="text-2xl font-bold">{selectedEnvironmentMeta?.fileCount ?? 0}</div></div>
                <div className="panel p-4"><div className="muted text-[10px] uppercase tracking-wider">Schemas</div><div className="text-2xl font-bold">{selectedEnvironmentMeta?.files.filter((file) => file.hasSchema).length ?? 0}</div></div>
                <div className="panel p-4"><div className="muted text-[10px] uppercase tracking-wider">Provider files</div><div className="text-2xl font-bold">{selectedEnvironmentMeta?.files.filter((file) => file.source && file.source !== "tokengate").length ?? 0}</div></div>
                <div className="panel p-4"><div className="muted text-[10px] uppercase tracking-wider">Last activity</div><div className="text-sm font-bold">{selectedEnvironmentMeta?.latestRevisionTimestamp ? formatRelativeTime(selectedEnvironmentMeta.latestRevisionTimestamp) : "No revisions yet"}</div></div>
              </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-[1.1fr_1fr]">
              <div className="panel p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="m-0 flex items-center gap-2"><IconFile size={16} /> Files</h3>
                  <button className="button sm secondary" onClick={() => setActiveView("secrets")} disabled={!selectedSecretSetId}>Open editor</button>
                </div>
                <div className="flex flex-col gap-3">
                  {(selectedEnvironmentMeta?.files ?? []).map((file) => (
                    <button key={file.secretSetId} className="panel p-4 text-left" onClick={() => { selectSecretSet(file.secretSetId); setActiveView("secrets"); }}>
                      <div className="flex items-center gap-2">
                        <FileSourceIcon source={file.source} size={12} />
                        <span style={{ fontFamily: "var(--font-mono)" }}>{file.filePath || ".env"}</span>
                        {file.hasSchema && <span className="tag text-[8px] ml-auto">schema</span>}
                      </div>
                    </button>
                  ))}
                  {(selectedEnvironmentMeta?.files.length ?? 0) === 0 && (
                    <p className="muted text-sm m-0">No files yet. Pull an attached integration or create the first file from the editor flow.</p>
                  )}
                </div>
              </div>

              <div className="panel p-5">
                <h3 className="m-0 flex items-center gap-2 mb-4"><IconLayers size={16} /> Attached integrations</h3>
                <div className="flex flex-col gap-3">
                  {projectIntegrations.filter((integration) => integration.environmentMappings.some((mapping) => mapping.environmentId === selectedEnvironmentId)).map((integration) => (
                    <div key={integration.id} className="border-2 border-[var(--border-light)] p-3">
                      <div className="flex items-center gap-2">
                        <FileSourceIcon source={integration.provider} size={12} />
                        <span className="font-bold text-sm">{integration.label || integration.provider}</span>
                      </div>
                      <div className="muted text-xs mt-2">
                        {integration.environmentMappings
                          .filter((mapping) => mapping.environmentId === selectedEnvironmentId)
                          .map((mapping) => mapping.filePath)
                          .join(", ")}
                      </div>
                    </div>
                  ))}
                  {projectIntegrations.every((integration) => !integration.environmentMappings.some((mapping) => mapping.environmentId === selectedEnvironmentId)) && (
                    <p className="muted text-sm m-0">No integrations are attached to this environment yet.</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Initial loading — workspaces haven't loaded yet */}
        {(activeView === "project" || activeView === "environment" || activeView === "secrets") && loadingWorkspaces && (
          <div className="empty-state fade-in">
            <div className="loading-spinner" />
            <p className="muted mt-4">Loading your workspaces...</p>
          </div>
        )}

        {/* Loading projects after workspace selected */}
        {activeView === "secrets" && !loadingWorkspaces && selectedWorkspaceId && loadingProjects && !selectedProjectId && (
          <div className="empty-state fade-in">
            <div className="loading-spinner" />
            <p className="muted mt-4">Loading projects...</p>
          </div>
        )}

        {/* Loading environments after project selected */}
        {activeView === "secrets" && !loadingWorkspaces && !loadingProjects && selectedProjectId && loadingEnvironments && !selectedEnvironmentId && (
          <div className="empty-state fade-in">
            <div className="loading-spinner" />
            <p className="muted mt-4">Loading environments...</p>
          </div>
        )}

        {/* Loading secret set metadata */}
        {activeView === "secrets" && !loadingWorkspaces && selectedEnvironmentId && loadingSecrets && (
          <div className="empty-state fade-in">
            <div className="loading-spinner" />
            <p className="muted mt-4">Loading secrets...</p>
          </div>
        )}

        {/* No workspaces — only show after loading completes */}
        {activeView === "secrets" && !loadingWorkspaces && workspaces.length === 0 && (
          <div className="empty-state fade-in">
            <div className="w-[72px] h-[72px] border-[3px] border-[var(--border)] flex items-center justify-center mb-6">
              <IconShield size={32} />
            </div>
            <h2 className="m-0 mb-2 text-xl font-extrabold" style={{ fontFamily: "var(--font-heading)" }}>No workspaces yet</h2>
            <p className="muted max-w-[380px] leading-relaxed mx-auto mb-7 text-sm">
              Create a workspace to start syncing encrypted environment variables across your team.
            </p>
            <button
              className="button px-7 py-[14px] text-sm font-bold uppercase tracking-[0.08em] inline-flex items-center gap-2"
              onClick={() => { setModal("workspace"); setModalName(""); }}
              style={{ fontFamily: "var(--font-mono)" }}
            >
              <IconPlus size={14} /> New workspace
            </button>
          </div>
        )}

        {/* No environment selected */}
        {activeView === "secrets" && !loadingWorkspaces && !loadingProjects && !loadingEnvironments && workspaces.length > 0 && !selectedEnvironmentId && (
          <div className="empty-state fade-in">
            <div className="w-[56px] h-[56px] border-[3px] border-[var(--border)] flex items-center justify-center mb-5">
              <IconLayers size={24} />
            </div>
            <h3 className="m-0 mb-[6px] font-bold text-[17px]" style={{ fontFamily: "var(--font-heading)" }}>No environment selected</h3>
            <p className="muted text-[13px]">Select or create an environment from the sidebar.</p>
          </div>
        )}

        {/* Environment selected but locked */}
        {activeView === "secrets" && !loadingSecrets && selectedEnvironmentId && !isEnvUnlocked && (
          <div className="lock-screen fade-in">
            <div className="lock-icon"><IconLock size={32} /></div>
            <h2 className="mb-2">Enter environment password</h2>
            <p className="muted max-w-[380px] leading-relaxed mb-5">
              This environment's secrets are encrypted. Enter the password to decrypt and view them.
            </p>
            <div className="flex gap-2 items-end max-w-[400px]">
              <div className="field flex-1 relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={envPassword}
                  onChange={(e) => { setEnvPassword(e.target.value); if (unlockError) setUnlockError(null); }}
                  placeholder="Environment password"
                  onKeyDown={(e) => { if (e.key === "Enter" && envPassword) handleUnlockEnv(); }}
                  autoFocus
                />
                <button
                  className="icon-button absolute right-1 top-1/2 -translate-y-1/2"
                  onClick={() => setShowPassword(!showPassword)}
                  type="button"
                >
                  {showPassword ? <IconEyeOff size={14} /> : <IconEye size={14} />}
                </button>
              </div>
              <button className="button" onClick={handleUnlockEnv} disabled={!envPassword || isPending}>
                {isPending ? "Decrypting..." : "Unlock"}
              </button>
            </div>
            {unlockError && (
              <p className="mt-3 text-sm text-[var(--error)] max-w-[420px]">
                {unlockError}
              </p>
            )}
            {!latestRevision && (
              <p className="muted mt-3 text-xs">No secrets pushed yet. Unlock to start adding variables.</p>
            )}
          </div>
        )}

        {/* Environment selected, no secret sets (edge case — only after loading) */}
        {activeView === "secrets" && !loadingSecrets && selectedEnvironmentId && secretSets.length === 0 && isEnvUnlocked && (
          <div className="empty-state fade-in">
            <IconShield size={40} />
            <h3 className="mt-3 mb-1">No files yet</h3>
            <p className="muted">Pull an integration or add a file to create the first encrypted secret set for this environment.</p>
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
                        <FileSourceIcon
                          source={environmentsMeta
                            .find((meta) => meta.environment.id === selectedEnvironmentId)
                            ?.files.find((file) => file.secretSetId === ss.id)?.source}
                          size={12}
                        />
                        {ss.filePath || ".env"}
                      </button>
                    ))}
                  </div>
                  <div className="flex gap-[6px] items-center">
                    <input className="ed1-search" value={searchFilter} onChange={(e) => setSearchFilter(e.target.value)} placeholder="Filter..." spellCheck={false} />
                    <button className="icon-button" onClick={() => setMaskedValues(!maskedValues)} title={maskedValues ? "Reveal values" : "Mask values"}>
                      {maskedValues ? <IconEye size={14} /> : <IconEyeOff size={14} />}
                    </button>
                    {currentIntegration && (
                      <>
                        <span className="tag text-[9px]"><FileSourceIcon source={currentIntegration.provider} size={10} /> {currentIntegration.provider}</span>
                        <button className="button sm secondary" disabled={isPending} onClick={() => {
                          startTransition(async () => {
                            try {
                              const mappingIndex = currentIntegration.environmentMappings.findIndex((mapping) =>
                                mapping.environmentId === selectedEnvironmentId &&
                                mapping.filePath === (selectedSecretSet.filePath || ".env")
                              );
                              await pullIntegrationToFile(currentIntegration, mappingIndex);
                            } catch (err) {
                              pushToast(err instanceof Error ? err.message : "Pull failed.", "error");
                            }
                          });
                        }}>
                          Pull
                        </button>
                        <button className="button sm secondary" disabled={isPending} onClick={() => {
                          startTransition(async () => {
                            try {
                              await pushCurrentFileToIntegration();
                            } catch (err) {
                              pushToast(err instanceof Error ? err.message : "Push failed.", "error");
                            }
                          });
                        }}>
                          Push
                        </button>
                      </>
                    )}
                    {currentFileSchema && <span className="tag encrypted text-[9px]">schema v{currentFileSchema.version}</span>}
                    {dirtyFlag && <span className="tag text-[10px]">unsaved</span>}
                    <button className="button sm" onClick={handleSaveRevision} disabled={isPending || envEntries.length === 0}>
                      {isPending ? "Saving..." : "Save"}
                    </button>
                  </div>
                </div>

                {/* Revision viewing banner */}
                {isViewingRevision && viewingRevision && (
                  <div className="ed-rev-banner">
                    <div className="flex items-center gap-2">
                      <IconClock size={14} />
                      <strong>Viewing r{viewingRevision.revision}</strong>
                      <span className="muted">({formatRelativeTime(viewingRevision.createdAt)})</span>
                    </div>
                    <div className="flex items-center gap-[6px]">
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

                {/* Editor body — normal mode (schema-aware) */}
                {!isViewingRevision && (
                  <div className="ed1-body">
                    {currentFileSchema ? (
                      <>
                        {/* Schema-constrained: render schema fields first */}
                        {currentFileSchema.fields.map((field, i) => {
                          const entryIdx = envEntries.findIndex((e) => e.key === field.name);
                          const entry = entryIdx >= 0 ? envEntries[entryIdx] : null;
                          const isMissing = !entry && field.required;
                          const value = entry?.value ?? "";

                          // Skip if search filter doesn't match
                          if (searchFilter && !field.name.toLowerCase().includes(searchFilter.toLowerCase()) && !value.toLowerCase().includes(searchFilter.toLowerCase())) return null;

                          return (
                            <div className={`ed1-line${isMissing ? " ed-diff-removed" : ""}`} key={field.name}>
                              <span className="ed1-linenum">{i + 1}</span>
                              <span className="ed1-key" title={field.description}>{field.name}</span>
                              <span className="ed1-eq">=</span>
                              <input
                                className="ed1-val"
                                value={maskedValues && field.sensitive ? maskVal(value) : value}
                                onChange={(e) => {
                                  if (maskedValues && field.sensitive) { setMaskedValues(false); return; }
                                  if (entryIdx >= 0) {
                                    updateEntry(entryIdx, "value", e.target.value);
                                  } else {
                                    // Add the entry
                                    setEnvEntries((prev) => [...prev, { key: field.name, value: e.target.value }]);
                                    setDirtyFlag(true);
                                  }
                                }}
                                onFocus={() => { if (maskedValues && field.sensitive) setMaskedValues(false); }}
                                placeholder={field.defaultValue || `(${field.type}${field.required ? ", required" : ""})`}
                                spellCheck={false}
                              />
                              <span className="text-[9px] px-1 muted" style={{ fontFamily: "var(--font-mono)" }}>{field.type}</span>
                            </div>
                          );
                        })}

                        {/* Extra keys not in schema — show warning + "Add to schema" */}
                        {envEntries.filter((e) => e.key && !currentFileSchema.fields.some((f) => f.name === e.key)).map((entry) => {
                          const i = envEntries.indexOf(entry);
                          return (
                            <div className="ed1-line ed-diff-changed" key={entry.key || i}>
                              <span className="ed1-linenum" title="Not in schema">!</span>
                              <input className="ed1-key" value={entry.key} onChange={(e) => updateEntry(i, "key", e.target.value)} spellCheck={false} />
                              <span className="ed1-eq">=</span>
                              <input className="ed1-val" value={maskedValues ? maskVal(entry.value) : entry.value} onChange={(e) => { if (!maskedValues) updateEntry(i, "value", e.target.value); }} onFocus={() => { if (maskedValues) setMaskedValues(false); }} spellCheck={false} />
                              <button className="text-[9px] px-2 cursor-pointer border-0 bg-transparent whitespace-nowrap" style={{ fontFamily: "var(--font-mono)", color: "var(--warning)" }}
                                title="Add this variable to the schema"
                                onClick={() => {
                                  startTransition(async () => {
                                    try {
                                      await postJson("/api/schemas", {
                                        projectId: selectedProjectId,
                                        filePath: selectedSecretSet?.filePath || ".env",
                                        fields: [...currentFileSchema.fields, { name: entry.key, type: "string", required: false, sensitive: false }],
                                      });
                                      pushToast(`Added "${entry.key}" to schema.`, "success");
                                      await Promise.all([refreshSchemas(), refreshEnvironments()]);
                                      await refreshSecretSets();
                                    } catch (err) { pushToast(err instanceof Error ? err.message : "Failed.", "error"); }
                                  });
                                }}
                              >+schema</button>
                              <button className="ed1-del" onClick={() => removeEntry(i)}><IconTrash size={12} /></button>
                            </div>
                          );
                        })}
                      </>
                    ) : (
                      <>
                        {/* No schema — prompt to auto-create one from current values */}
                        <div className="flex flex-col items-center justify-center py-8 gap-3">
                          <IconFile size={32} />
                          <p className="muted text-sm text-center max-w-[360px]">
                            This file has no schema. Create one to enforce variable structure across all environments.
                          </p>
                          {envEntries.length > 0 ? (
                            <button className="button" disabled={isPending} onClick={() => {
                              startTransition(async () => {
                                try {
                                  const fields = envEntries
                                    .filter((e) => e.key.trim())
                                    .map((e) => {
                                      const val = e.value.trim().replace(/^["']|["']$/g, "");
                                      let type = "string";
                                      if (/^(true|false|yes|no|on|off|0|1)$/i.test(val)) type = "boolean";
                                      else if (/^\d+$/.test(val) && Number(val) <= 65535) type = "number";
                                      else if (/^https?:\/\//.test(val)) type = "url";
                                      const sensitive = /secret|key|token|password|private|credential/i.test(e.key);
                                      return { name: e.key, type, required: true, sensitive };
                                    });
                                  await postJson("/api/schemas", {
                                    projectId: selectedProjectId,
                                    filePath: selectedSecretSet?.filePath || ".env",
                                    fields,
                                  });
                                  pushToast(`Schema created with ${fields.length} field${fields.length !== 1 ? "s" : ""}.`, "success");
                                  await Promise.all([refreshSchemas(), refreshEnvironments()]);
                                  await refreshSecretSets();
                                } catch (err) { pushToast(err instanceof Error ? err.message : "Failed.", "error"); }
                              });
                            }}>
                              <IconPlus size={14} /> Auto-create schema from current variables ({envEntries.filter((e) => e.key.trim()).length})
                            </button>
                          ) : (
                            <button className="button secondary" onClick={() => setActiveView("schemas")}>
                              <IconPlus size={14} /> Create schema manually
                            </button>
                          )}
                        </div>
                      </>
                    )}
                    {currentFileSchema && <button className="ed1-add" onClick={addEntry}><IconPlus size={12} /> add extra variable</button>}
                  </div>
                )}

                {/* Editor body — diff mode: shows current vs revision inline */}
                {isViewingRevision && revisionViewMode === "diff" && (
                  <div className="ed1-body">
                    <div className="ed-diff-header-row">
                      <span className="ed1-linenum" />
                      <span className="flex-1 font-bold">Key</span>
                      <span className="flex-1">r{viewingRevision?.revision} (old)</span>
                      <span className="ed-diff-arrow" />
                      <span className="flex-1">Current</span>
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
                        <span className="ed1-key flex-1 py-[6px] px-2">{entry.key}</span>
                        <span className="ed1-eq">=</span>
                        <span className="ed1-val flex-[2] py-[6px] px-2">{maskedValues ? maskVal(entry.value) : entry.value}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Loading revision */}
                {loadingRevision && (
                  <div className="ed1-body flex items-center justify-center">
                    <div className="spinner" />
                    <span className="muted ml-2">Decrypting revision...</span>
                  </div>
                )}

                {/* Status bar */}
                <div className="ed1-status">
                  <span className="inline-flex items-center gap-1"><FileSourceIcon source={currentFileMeta?.source} size={10} />{selectedSecretSet.filePath || ".env"}</span>
                  <span>{envEntries.length} variable{envEntries.length !== 1 ? "s" : ""}</span>
                  {latestRevision && <span>r{latestRevision.revision}</span>}
                  <span className="tag encrypted text-[9px] py-px px-[5px]">E2E</span>
                </div>

                {/* History rail */}
                {history.length > 0 && (
                  <div className="ed1-history">
                    <span className="ed1-history-label">History</span>
                    <div className="flex gap-1 flex-wrap">
                      {history.map((rev) => {
                        const isCurrent = rev.id === latestRevision?.id;
                        const isViewing = viewingRevisionId === rev.id;
                        return (
                          <button key={rev.id} className={`ed1-rev${isCurrent ? " current" : ""}${isViewing ? " expanded" : ""}`} onClick={() => { if (!isCurrent) handleViewRevision(rev, "diff"); }}>
                            <strong>r{rev.revision}</strong>
                            <span className="muted">{formatRelativeTime(rev.createdAt)}</span>
                            {isCurrent && <span className="tag encrypted text-[9px]">live</span>}
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
                  {modalName.trim() && <p className="muted text-[13px]">Slug: <code>{toSlug(modalName)}</code></p>}
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
                  <span className="muted text-xs leading-[1.4]">
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
                    <div className="p-3 bg-[var(--surface-hover)] border-2 border-[var(--border-light)]">
                      <span className="muted text-xs block mb-[6px]">Invite link (share with the user):</span>
                      <div className="flex gap-[6px] items-center">
                        <code className="text-[11px] flex-1 break-all" style={{ fontFamily: "var(--font-mono)" }}>{lastInviteLink}</code>
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

              <div className="flex gap-2 justify-end mt-2">
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

      {integrationMappingModal && (
        <div className="modal-overlay" onClick={() => setIntegrationMappingModal(null)}>
          <div className="modal panel" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <strong>{integrationMappingModal.mode === "attach" ? "Attach integration" : "Add integration mapping"}</strong>
              <button className="icon-button" onClick={() => setIntegrationMappingModal(null)}><IconX size={16} /></button>
            </div>
            <div className="modal-body">
              <div className="field">
                <span>Environment</span>
                <select
                  className="select"
                  value={integrationMappingValues.environmentId}
                  onChange={(e) => setIntegrationMappingValues((prev) => ({ ...prev, environmentId: e.target.value }))}
                >
                  <option value="" disabled>Select environment</option>
                  {environments.map((environment) => (
                    <option key={environment.id} value={environment.id}>{environment.name}</option>
                  ))}
                </select>
              </div>
              <div className="field">
                <span>File path</span>
                <input
                  value={integrationMappingValues.filePath}
                  onChange={(e) => setIntegrationMappingValues((prev) => ({ ...prev, filePath: e.target.value }))}
                  placeholder=".env"
                />
              </div>
              <div className="field">
                <span>{integrationMappingModal.integration.provider === "vercel" ? "Target" : "Provider target"}</span>
                <input
                  value={integrationMappingValues.providerTarget}
                  onChange={(e) => setIntegrationMappingValues((prev) => ({ ...prev, providerTarget: e.target.value }))}
                  placeholder={integrationMappingModal.integration.provider === "vercel" ? "production" : "*"}
                />
                <span className="muted text-xs">
                  {integrationMappingModal.integration.provider === "vercel" ? "Use production, preview, or development." : "Use * for the default Convex environment variable set."}
                </span>
              </div>
              <div className="flex gap-2 justify-end mt-2">
                <button className="button secondary" onClick={() => setIntegrationMappingModal(null)}>Cancel</button>
                <button className="button" onClick={handleSaveIntegrationMapping} disabled={!integrationMappingValues.environmentId || !integrationMappingValues.filePath.trim() || isPending}>
                  {isPending ? "Saving..." : "Save mapping"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {syncPasswordPrompt && (
        <div className="modal-overlay" onClick={() => setSyncPasswordPrompt(null)}>
          <div className="modal panel" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <strong>Unlock mapped environment</strong>
              <button className="icon-button" onClick={() => setSyncPasswordPrompt(null)}><IconX size={16} /></button>
            </div>
            <div className="modal-body">
              <p className="muted text-sm mt-0 mb-4">
                Enter the environment password to import provider variables into the mapped encrypted file.
              </p>
              <div className="field">
                <span>Password</span>
                <input
                  type="password"
                  value={syncPasswordValue}
                  onChange={(e) => setSyncPasswordValue(e.target.value)}
                  placeholder="Environment password"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && syncPasswordValue.trim()) {
                      const prompt = syncPasswordPrompt;
                      startTransition(async () => {
                        try {
                          await pullIntegrationToFile(prompt.integration, prompt.mappingIndex, syncPasswordValue.trim());
                          setSyncPasswordPrompt(null);
                          setSyncPasswordValue("");
                        } catch (err) {
                          pushToast(err instanceof Error ? err.message : "Sync failed.", "error");
                        }
                      });
                    }
                  }}
                />
              </div>
              <div className="flex gap-2 justify-end mt-2">
                <button className="button secondary" onClick={() => setSyncPasswordPrompt(null)}>Cancel</button>
                <button className="button" disabled={!syncPasswordValue.trim() || isPending} onClick={() => {
                  const prompt = syncPasswordPrompt;
                  startTransition(async () => {
                    try {
                      await pullIntegrationToFile(prompt.integration, prompt.mappingIndex, syncPasswordValue.trim());
                      setSyncPasswordPrompt(null);
                      setSyncPasswordValue("");
                    } catch (err) {
                      pushToast(err instanceof Error ? err.message : "Sync failed.", "error");
                    }
                  });
                }}>
                  {isPending ? "Unlocking..." : "Unlock and sync"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRM DIALOG */}
      {confirmAction && (
        <div className="modal-overlay" onClick={() => setConfirmAction(null)}>
          <div className="modal panel max-w-[440px]" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <strong>{confirmAction.title}</strong>
              <button className="icon-button" onClick={() => setConfirmAction(null)}><IconX size={16} /></button>
            </div>
            <div className="modal-body">
              <p className="text-sm leading-relaxed m-0 mb-5 text-[var(--fg)]">
                {confirmAction.message}
              </p>
              <div className="flex gap-2 justify-end">
                <button className="button secondary" onClick={() => setConfirmAction(null)}>Cancel</button>
                <button
                  className={`button${confirmAction.destructive ? " bg-[#c0392b] border-[#c0392b]" : ""}`}
                  onClick={confirmAction.onConfirm}
                >
                  {confirmAction.destructive ? "Restore" : "Save"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* INPUT MODAL */}
      {inputModal && (
        <div className="modal-overlay" onClick={() => setInputModal(null)}>
          <div className="modal panel" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <strong>{inputModal.title}</strong>
              <button className="icon-button" onClick={() => setInputModal(null)}><IconX size={16} /></button>
            </div>
            <div className="modal-body">
              {inputModal.fields.map((f) => (
                <div className="field" key={f.key}>
                  <span>{f.label}</span>
                  <input
                    type={f.type || "text"}
                    value={inputModalValues[f.key] || ""}
                    onChange={(e) => setInputModalValues((prev) => ({ ...prev, [f.key]: e.target.value }))}
                    placeholder={f.placeholder}
                    autoFocus={inputModal.fields[0].key === f.key}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        inputModal.onSubmit(inputModalValues);
                        setInputModal(null);
                      }
                    }}
                  />
                </div>
              ))}
              <div className="flex gap-2 justify-end mt-2">
                <button className="button secondary" onClick={() => setInputModal(null)}>Cancel</button>
                <button className="button" onClick={() => { inputModal.onSubmit(inputModalValues); setInputModal(null); }}>
                  Confirm
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CONTEXT MENU */}
      {ctxMenu && (
        <div
          className="fixed z-[2000]"
          style={{ left: ctxMenu.x, top: ctxMenu.y }}
        >
          <div className="border-3 border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-md)] min-w-[160px]" style={{ fontFamily: "var(--font-mono)" }}>
            {ctxMenu.items.map((item, i) => (
              <button
                key={i}
                className={`w-full text-left px-3 py-2 text-xs font-bold uppercase tracking-wider border-0 cursor-pointer transition-colors duration-75 hover:bg-[var(--surface-hover)] ${item.destructive ? "text-[var(--error)] hover:bg-[var(--error-bg)]" : "text-[var(--text)]"}`}
                style={{ background: "transparent" }}
                onClick={(e) => { e.stopPropagation(); setCtxMenu(null); item.onClick(); }}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* TOASTS */}
      {toasts.length > 0 && (
        <div className="fixed bottom-6 right-6 flex flex-col gap-2 z-[1000] pointer-events-none">
          {toasts.map((t) => (
            <div key={t.id} className="panel fade-in py-3 px-4 rounded-xl text-sm flex items-center gap-2 pointer-events-auto max-w-[380px]" style={{
              borderLeft: `4px solid ${t.variant === "error" ? "#c0392b" : t.variant === "success" ? "var(--accent)" : "var(--muted)"}`
            }}>
              <span className="flex-1">{t.message}</span>
              <button className="icon-button" onClick={() => setToasts((p) => p.filter((x) => x.id !== t.id))}><IconX size={14} /></button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
