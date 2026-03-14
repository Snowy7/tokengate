import { useCallback, useEffect, useMemo, useReducer, useRef } from "react";
import type {
  Environment,
  Invite,
  MemberWithProfile,
  Project,
  SecretSet,
  WorkspaceWithMembership,
} from "@tokengate/sdk";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface EnvFileMeta {
  secretSetId: string;
  filePath: string | null;
  latestRevision: number | null;
}

interface EnvironmentWithMeta {
  environment: Environment;
  fileCount: number;
  files: EnvFileMeta[];
  latestRevisionTimestamp: number | null;
}

interface SidebarState {
  // Data
  workspaces: WorkspaceWithMembership[];
  projects: Project[];
  environments: Environment[];
  environmentsMeta: EnvironmentWithMeta[];
  secretSets: SecretSet[];
  members: MemberWithProfile[];
  pendingInvites: Invite[];

  // Selections
  selectedWorkspaceId: string;
  selectedProjectId: string;
  selectedEnvironmentId: string;
  selectedSecretSetId: string;

  // Loading flags — one per level, collapsed into a single object
  loading: {
    workspaces: boolean;
    projects: boolean;
    environments: boolean;
    secretSets: boolean;
    members: boolean;
  };
}

type SidebarAction =
  | { type: "SET_WORKSPACES"; workspaces: WorkspaceWithMembership[]; autoSelect: string }
  | { type: "SET_PROJECTS"; projects: Project[]; autoSelect: string }
  | { type: "SET_ENVIRONMENTS"; environments: Environment[]; meta: EnvironmentWithMeta[]; autoSelect: string }
  | { type: "SET_SECRET_SETS"; secretSets: SecretSet[]; autoSelect: string }
  | { type: "SET_MEMBERS"; members: MemberWithProfile[]; invites: Invite[] }
  | { type: "SELECT_WORKSPACE"; id: string }
  | { type: "SELECT_PROJECT"; id: string }
  | { type: "SELECT_ENVIRONMENT"; id: string }
  | { type: "SELECT_SECRET_SET"; id: string }
  | { type: "LOADING"; key: keyof SidebarState["loading"]; value: boolean }
  | { type: "CLEAR_BELOW_WORKSPACE" }
  | { type: "CLEAR_BELOW_PROJECT" }
  | { type: "CLEAR_BELOW_ENVIRONMENT" };

// ---------------------------------------------------------------------------
// Reducer
// ---------------------------------------------------------------------------

const initialState: SidebarState = {
  workspaces: [],
  projects: [],
  environments: [],
  environmentsMeta: [],
  secretSets: [],
  members: [],
  pendingInvites: [],
  selectedWorkspaceId: "",
  selectedProjectId: "",
  selectedEnvironmentId: "",
  selectedSecretSetId: "",
  loading: {
    workspaces: true,
    projects: false,
    environments: false,
    secretSets: false,
    members: false,
  },
};

function reducer(state: SidebarState, action: SidebarAction): SidebarState {
  switch (action.type) {
    case "SET_WORKSPACES":
      return {
        ...state,
        workspaces: action.workspaces,
        selectedWorkspaceId: action.autoSelect,
        loading: { ...state.loading, workspaces: false },
      };

    case "SET_PROJECTS":
      return {
        ...state,
        projects: action.projects,
        selectedProjectId: action.autoSelect,
        loading: { ...state.loading, projects: false },
      };

    case "SET_ENVIRONMENTS":
      return {
        ...state,
        environments: action.environments,
        environmentsMeta: action.meta,
        selectedEnvironmentId: action.autoSelect,
        loading: { ...state.loading, environments: false },
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
      return {
        ...state,
        selectedWorkspaceId: action.id,
        // Clear everything below
        projects: [],
        environments: [],
        environmentsMeta: [],
        secretSets: [],
        selectedProjectId: "",
        selectedEnvironmentId: "",
        selectedSecretSetId: "",
        members: [],
        pendingInvites: [],
      };

    case "SELECT_PROJECT":
      return {
        ...state,
        selectedProjectId: action.id,
        // Clear everything below
        environments: [],
        environmentsMeta: [],
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
      return {
        ...state,
        selectedSecretSetId: action.id,
      };

    case "LOADING":
      return {
        ...state,
        loading: { ...state.loading, [action.key]: action.value },
      };

    case "CLEAR_BELOW_WORKSPACE":
      return {
        ...state,
        projects: [],
        environments: [],
        environmentsMeta: [],
        secretSets: [],
        selectedProjectId: "",
        selectedEnvironmentId: "",
        selectedSecretSetId: "",
      };

    case "CLEAR_BELOW_PROJECT":
      return {
        ...state,
        environments: [],
        environmentsMeta: [],
        secretSets: [],
        selectedEnvironmentId: "",
        selectedSecretSetId: "",
      };

    case "CLEAR_BELOW_ENVIRONMENT":
      return {
        ...state,
        secretSets: [],
        selectedSecretSetId: "",
      };

    default:
      return state;
  }
}

// ---------------------------------------------------------------------------
// Fetch helpers
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

  // Track previous selections to avoid redundant fetches
  const prevWorkspaceId = useRef("");
  const prevProjectId = useRef("");
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
  const selectedEnvironment = useMemo(
    () => state.environments.find((e) => e.id === state.selectedEnvironmentId) ?? null,
    [state.selectedEnvironmentId, state.environments],
  );
  const selectedSecretSet = useMemo(
    () => state.secretSets.find((s) => s.id === state.selectedSecretSetId) ?? null,
    [state.selectedSecretSetId, state.secretSets],
  );

  const isOwner = selectedMembership?.role === "owner";
  const isAdmin = selectedMembership?.role === "admin";
  const isOwnerOrAdmin = isOwner || isAdmin;

  // --- Load workspaces (initial) ---
  const loadWorkspaces = useCallback(async () => {
    dispatch({ type: "LOADING", key: "workspaces", value: true });
    try {
      const payload = await fetchJson<{ workspaces: WorkspaceWithMembership[] }>("/api/workspaces");
      const ws = payload.workspaces;
      const autoSelect = ws.some((w) => w.workspace?.id === state.selectedWorkspaceId)
        ? state.selectedWorkspaceId
        : ws[0]?.workspace?.id ?? "";
      dispatch({ type: "SET_WORKSPACES", workspaces: ws, autoSelect });
    } catch {
      dispatch({ type: "LOADING", key: "workspaces", value: false });
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // --- Load projects when workspace changes ---
  const loadProjects = useCallback(async (workspaceId: string) => {
    if (!workspaceId) return;
    dispatch({ type: "LOADING", key: "projects", value: true });
    try {
      const payload = await fetchJson<{ projects: Project[] }>(`/api/projects?workspaceId=${workspaceId}`);
      const pjs = payload.projects;
      const autoSelect = pjs.some((p) => p.id === state.selectedProjectId)
        ? state.selectedProjectId
        : pjs[0]?.id ?? "";
      dispatch({ type: "SET_PROJECTS", projects: pjs, autoSelect });
    } catch {
      dispatch({ type: "LOADING", key: "projects", value: false });
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // --- Load environments when project changes ---
  const loadEnvironments = useCallback(async (projectId: string) => {
    if (!projectId) return;
    dispatch({ type: "LOADING", key: "environments", value: true });
    try {
      const [envRes, metaRes] = await Promise.all([
        fetchJson<{ environments: Environment[] }>(`/api/environments?projectId=${projectId}`),
        fetchJson<{ environments: EnvironmentWithMeta[] }>(`/api/environments/meta?projectId=${projectId}`)
          .catch(() => ({ environments: [] as EnvironmentWithMeta[] })),
      ]);
      const envs = envRes.environments;
      const autoSelect = envs.some((e) => e.id === state.selectedEnvironmentId)
        ? state.selectedEnvironmentId
        : envs[0]?.id ?? "";
      dispatch({ type: "SET_ENVIRONMENTS", environments: envs, meta: metaRes.environments, autoSelect });
    } catch {
      dispatch({ type: "LOADING", key: "environments", value: false });
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // --- Load secret sets when environment changes ---
  const loadSecretSets = useCallback(async (environmentId: string, meta: EnvironmentWithMeta[]) => {
    if (!environmentId) return;
    dispatch({ type: "LOADING", key: "secretSets", value: true });
    try {
      const envMeta = meta.find((m) => m.environment.id === environmentId);
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
  }, []);

  // --- Load members/invites ---
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

  // --- Cascade: workspace → projects ---
  useEffect(() => {
    const wsId = state.selectedWorkspaceId;
    if (wsId === prevWorkspaceId.current) return;
    prevWorkspaceId.current = wsId;
    if (!wsId) return;
    void loadProjects(wsId);
  }, [state.selectedWorkspaceId, loadProjects]);

  // --- Cascade: project → environments ---
  useEffect(() => {
    const pId = state.selectedProjectId;
    if (pId === prevProjectId.current) return;
    prevProjectId.current = pId;
    if (!pId) return;
    void loadEnvironments(pId);
  }, [state.selectedProjectId, loadEnvironments]);

  // --- Cascade: environment → secret sets ---
  useEffect(() => {
    const eId = state.selectedEnvironmentId;
    if (eId === prevEnvironmentId.current) return;
    prevEnvironmentId.current = eId;
    if (!eId) return;
    void loadSecretSets(eId, state.environmentsMeta);
  }, [state.selectedEnvironmentId, state.environmentsMeta, loadSecretSets]);

  // --- Initial load ---
  useEffect(() => { void loadWorkspaces(); }, [loadWorkspaces]);

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

  // --- Refresh helpers (for after create/mutate) ---
  const refreshWorkspaces = useCallback(async () => {
    await loadWorkspaces();
  }, [loadWorkspaces]);

  const refreshProjects = useCallback(async () => {
    if (state.selectedWorkspaceId) {
      await loadProjects(state.selectedWorkspaceId);
    }
  }, [state.selectedWorkspaceId, loadProjects]);

  const refreshEnvironments = useCallback(async () => {
    if (state.selectedProjectId) {
      await loadEnvironments(state.selectedProjectId);
    }
  }, [state.selectedProjectId, loadEnvironments]);

  const refreshSecretSets = useCallback(async () => {
    if (state.selectedEnvironmentId) {
      await loadSecretSets(state.selectedEnvironmentId, state.environmentsMeta);
    }
  }, [state.selectedEnvironmentId, state.environmentsMeta, loadSecretSets]);

  const refreshMembers = useCallback(async () => {
    await loadMembers(state.selectedWorkspaceId, isOwnerOrAdmin);
  }, [state.selectedWorkspaceId, isOwnerOrAdmin, loadMembers]);

  return {
    // State
    ...state,

    // Derived
    selectedWorkspace,
    selectedMembership,
    selectedProject,
    selectedEnvironment,
    selectedSecretSet,
    isOwner,
    isAdmin,
    isOwnerOrAdmin,

    // Selection handlers
    selectWorkspace,
    selectProject,
    selectEnvironment,
    selectSecretSet,

    // Refresh
    refreshWorkspaces,
    refreshProjects,
    refreshEnvironments,
    refreshSecretSets,
    refreshMembers,
  };
}

export type { EnvironmentWithMeta, EnvFileMeta };
