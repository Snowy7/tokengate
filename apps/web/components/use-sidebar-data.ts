import { useCallback, useEffect, useMemo, useReducer, useRef } from "react";
import type {
  Environment,
  Invite,
  MemberWithProfile,
  Project,
  SecretSet,
  SidebarData,
  SidebarEnvMeta,
  WorkspaceWithMembership,
} from "@tokengate/sdk";

// ---------------------------------------------------------------------------
// Re-export types the dashboard needs
// ---------------------------------------------------------------------------

export type EnvironmentWithMeta = SidebarEnvMeta;
export type { SidebarEnvMeta as EnvFileMeta };

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

interface SidebarState {
  workspaces: WorkspaceWithMembership[];
  projects: Project[];
  environmentsMeta: SidebarEnvMeta[];
  secretSets: SecretSet[];
  members: MemberWithProfile[];
  pendingInvites: Invite[];

  selectedWorkspaceId: string;
  selectedProjectId: string;
  selectedEnvironmentId: string;
  selectedSecretSetId: string;

  loading: {
    sidebar: boolean;
    secretSets: boolean;
    members: boolean;
  };
}

type Action =
  | { type: "SIDEBAR_LOADED"; data: SidebarData; selectedWorkspaceId: string; selectedProjectId: string; selectedEnvironmentId: string }
  | { type: "SET_SECRET_SETS"; secretSets: SecretSet[]; autoSelect: string }
  | { type: "SET_MEMBERS"; members: MemberWithProfile[]; invites: Invite[] }
  | { type: "SELECT_WORKSPACE"; id: string }
  | { type: "SELECT_PROJECT"; id: string }
  | { type: "SELECT_ENVIRONMENT"; id: string }
  | { type: "SELECT_SECRET_SET"; id: string }
  | { type: "LOADING"; key: keyof SidebarState["loading"]; value: boolean };

const initialState: SidebarState = {
  workspaces: [],
  projects: [],
  environmentsMeta: [],
  secretSets: [],
  members: [],
  pendingInvites: [],
  selectedWorkspaceId: "",
  selectedProjectId: "",
  selectedEnvironmentId: "",
  selectedSecretSetId: "",
  loading: { sidebar: true, secretSets: false, members: false },
};

function reducer(state: SidebarState, action: Action): SidebarState {
  switch (action.type) {
    case "SIDEBAR_LOADED":
      return {
        ...state,
        workspaces: action.data.workspaces,
        projects: action.data.projects,
        environmentsMeta: action.data.environments,
        selectedWorkspaceId: action.selectedWorkspaceId,
        selectedProjectId: action.selectedProjectId,
        selectedEnvironmentId: action.selectedEnvironmentId,
        // Clear secret sets — they load on environment select
        secretSets: [],
        selectedSecretSetId: "",
        loading: { ...state.loading, sidebar: false },
      };

    case "SET_SECRET_SETS":
      return {
        ...state,
        secretSets: action.secretSets,
        selectedSecretSetId: action.autoSelect,
        loading: { ...state.loading, secretSets: false },
      };

    case "SET_MEMBERS":
      return {
        ...state,
        members: action.members,
        pendingInvites: action.invites,
        loading: { ...state.loading, members: false },
      };

    case "SELECT_WORKSPACE":
      // Workspace changed — projects/envs will reload via sidebar fetch
      return {
        ...state,
        selectedWorkspaceId: action.id,
        projects: [],
        environmentsMeta: [],
        secretSets: [],
        selectedProjectId: "",
        selectedEnvironmentId: "",
        selectedSecretSetId: "",
        members: [],
        pendingInvites: [],
        loading: { ...state.loading, sidebar: true },
      };

    case "SELECT_PROJECT":
      return {
        ...state,
        selectedProjectId: action.id,
        secretSets: [],
        selectedEnvironmentId: "",
        selectedSecretSetId: "",
      };

    case "SELECT_ENVIRONMENT":
      return {
        ...state,
        selectedEnvironmentId: action.id,
        secretSets: [],
        selectedSecretSetId: "",
      };

    case "SELECT_SECRET_SET":
      return { ...state, selectedSecretSetId: action.id };

    case "LOADING":
      return { ...state, loading: { ...state.loading, [action.key]: action.value } };

    default:
      return state;
  }
}

// ---------------------------------------------------------------------------
// Fetch
// ---------------------------------------------------------------------------

async function fetchJson<T>(input: string): Promise<T> {
  const response = await fetch(input, { cache: "no-store" });
  if (!response.ok) throw new Error(await response.text());
  return (await response.json()) as T;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useSidebarData() {
  const [state, dispatch] = useReducer(reducer, initialState);
  const prevWorkspaceId = useRef<string | null>(null);
  const prevEnvironmentId = useRef("");

  // --- Derived ---
  const selectedWorkspace = useMemo(
    () => state.workspaces.find((w) => w.workspace?.id === state.selectedWorkspaceId)?.workspace ?? null,
    [state.selectedWorkspaceId, state.workspaces],
  );
  const selectedMembership = useMemo(
    () => state.workspaces.find((w) => w.workspace?.id === state.selectedWorkspaceId)?.membership ?? null,
    [state.selectedWorkspaceId, state.workspaces],
  );
  const selectedProject = useMemo(
    () => state.projects.find((p) => p.id === state.selectedProjectId) ?? null,
    [state.selectedProjectId, state.projects],
  );

  // Environments for the selected project only
  const environments = useMemo(
    () => state.environmentsMeta
      .filter((em) => em.environment.projectId === state.selectedProjectId)
      .map((em) => em.environment),
    [state.environmentsMeta, state.selectedProjectId],
  );

  const selectedEnvironment = useMemo(
    () => environments.find((e) => e.id === state.selectedEnvironmentId) ?? null,
    [state.selectedEnvironmentId, environments],
  );
  const selectedSecretSet = useMemo(
    () => state.secretSets.find((s) => s.id === state.selectedSecretSetId) ?? null,
    [state.selectedSecretSetId, state.secretSets],
  );

  const isOwner = selectedMembership?.role === "owner";
  const isAdmin = selectedMembership?.role === "admin";
  const isOwnerOrAdmin = isOwner || isAdmin;

  // --- Core: load sidebar data (single fetch) ---
  const loadSidebar = useCallback(async (workspaceId?: string) => {
    dispatch({ type: "LOADING", key: "sidebar", value: true });
    try {
      const url = workspaceId ? `/api/sidebar?workspaceId=${workspaceId}` : "/api/sidebar";
      const data = await fetchJson<SidebarData>(url);

      // Auto-select: prefer current selections if still valid
      const wsId = workspaceId
        ?? data.workspaces.find((w) => w.workspace?.id === state.selectedWorkspaceId)?.workspace?.id
        ?? data.workspaces[0]?.workspace?.id
        ?? "";

      const pId = data.projects.find((p) => p.id === state.selectedProjectId)?.id
        ?? data.projects[0]?.id
        ?? "";

      // Find environments for the auto-selected project
      const projectEnvs = data.environments.filter((em) => em.environment.projectId === pId);
      const eId = projectEnvs.find((em) => em.environment.id === state.selectedEnvironmentId)?.environment.id
        ?? projectEnvs[0]?.environment.id
        ?? "";

      dispatch({ type: "SIDEBAR_LOADED", data, selectedWorkspaceId: wsId, selectedProjectId: pId, selectedEnvironmentId: eId });
    } catch {
      dispatch({ type: "LOADING", key: "sidebar", value: false });
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // --- Load secret sets when environment changes ---
  const loadSecretSets = useCallback(async (environmentId: string) => {
    if (!environmentId) return;
    dispatch({ type: "LOADING", key: "secretSets", value: true });
    try {
      const envMeta = state.environmentsMeta.find((m) => m.environment.id === environmentId);
      let sets: SecretSet[] = [];

      if (envMeta && envMeta.files.length > 0) {
        const sp = await fetchJson<{ secretSets: SecretSet[] }>(`/api/secret-sets/list?environmentId=${environmentId}`);
        sets = sp.secretSets;
      } else {
        const sp = await fetchJson<{ secretSet: SecretSet | null }>(`/api/secret-sets?environmentId=${environmentId}`);
        if (sp.secretSet) sets = [sp.secretSet];
      }

      dispatch({ type: "SET_SECRET_SETS", secretSets: sets, autoSelect: sets[0]?.id ?? "" });
    } catch {
      dispatch({ type: "LOADING", key: "secretSets", value: false });
    }
  }, [state.environmentsMeta]);

  // --- Load members ---
  const loadMembers = useCallback(async (workspaceId: string, canListInvites: boolean) => {
    if (!workspaceId) return;
    dispatch({ type: "LOADING", key: "members", value: true });
    try {
      const [membersRes, invitesRes] = await Promise.all([
        fetchJson<{ members: MemberWithProfile[] }>(`/api/members?workspaceId=${workspaceId}`),
        canListInvites
          ? fetchJson<{ invites: Invite[] }>(`/api/invites?workspaceId=${workspaceId}`)
          : Promise.resolve({ invites: [] as Invite[] }),
      ]);
      dispatch({ type: "SET_MEMBERS", members: membersRes.members, invites: invitesRes.invites });
    } catch {
      dispatch({ type: "LOADING", key: "members", value: false });
    }
  }, []);

  // --- Initial load ---
  useEffect(() => { void loadSidebar(); }, [loadSidebar]);

  // --- Reload when workspace selection changes (user picks different workspace) ---
  useEffect(() => {
    const wsId = state.selectedWorkspaceId;
    if (prevWorkspaceId.current === null) {
      // First render — already loaded by initial loadSidebar
      prevWorkspaceId.current = wsId;
      return;
    }
    if (wsId === prevWorkspaceId.current) return;
    prevWorkspaceId.current = wsId;
    if (wsId) void loadSidebar(wsId);
  }, [state.selectedWorkspaceId, loadSidebar]);

  // --- Load secret sets when environment changes ---
  useEffect(() => {
    const eId = state.selectedEnvironmentId;
    if (eId === prevEnvironmentId.current) return;
    prevEnvironmentId.current = eId;
    if (eId) void loadSecretSets(eId);
  }, [state.selectedEnvironmentId, loadSecretSets]);

  // --- Auto-select first environment when project changes ---
  useEffect(() => {
    if (!state.selectedProjectId || state.selectedEnvironmentId) return;
    const projectEnvs = state.environmentsMeta.filter(
      (em) => em.environment.projectId === state.selectedProjectId,
    );
    if (projectEnvs.length > 0) {
      dispatch({ type: "SELECT_ENVIRONMENT", id: projectEnvs[0].environment.id });
    }
  }, [state.selectedProjectId, state.selectedEnvironmentId, state.environmentsMeta]);

  // --- Selection handlers ---
  const selectWorkspace = useCallback((id: string) => {
    dispatch({ type: "SELECT_WORKSPACE", id });
  }, []);

  const selectProject = useCallback((id: string) => {
    dispatch({ type: "SELECT_PROJECT", id });
  }, []);

  const selectEnvironment = useCallback((id: string) => {
    dispatch({ type: "SELECT_ENVIRONMENT", id });
  }, []);

  const selectSecretSet = useCallback((id: string) => {
    dispatch({ type: "SELECT_SECRET_SET", id });
  }, []);

  // --- Refresh helpers ---
  const refreshWorkspaces = useCallback(async () => {
    await loadSidebar(state.selectedWorkspaceId || undefined);
  }, [state.selectedWorkspaceId, loadSidebar]);

  const refreshEnvironments = useCallback(async () => {
    await loadSidebar(state.selectedWorkspaceId || undefined);
  }, [state.selectedWorkspaceId, loadSidebar]);

  const refreshSecretSets = useCallback(async () => {
    if (state.selectedEnvironmentId) await loadSecretSets(state.selectedEnvironmentId);
  }, [state.selectedEnvironmentId, loadSecretSets]);

  const refreshMembers = useCallback(async () => {
    await loadMembers(state.selectedWorkspaceId, isOwnerOrAdmin);
  }, [state.selectedWorkspaceId, isOwnerOrAdmin, loadMembers]);

  return {
    // State
    ...state,
    environments,

    // Derived
    selectedWorkspace,
    selectedMembership,
    selectedProject,
    selectedEnvironment,
    selectedSecretSet,
    isOwner,
    isAdmin,
    isOwnerOrAdmin,

    // Loading (compat aliases)
    loading: {
      workspaces: state.loading.sidebar,
      projects: state.loading.sidebar,
      environments: state.loading.sidebar,
      secretSets: state.loading.secretSets,
      members: state.loading.members,
    },

    // Selection handlers
    selectWorkspace,
    selectProject,
    selectEnvironment,
    selectSecretSet,

    // Refresh
    refreshWorkspaces,
    refreshEnvironments,
    refreshSecretSets,
    refreshMembers,
  };
}
