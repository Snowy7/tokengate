export type WorkspaceRole = "owner" | "admin" | "member" | "viewer";

export interface UserProfile {
  id: string;
  email: string;
  fullName?: string;
  imageUrl?: string;
}

export interface Workspace {
  id: string;
  name: string;
  slug: string;
  type: "personal" | "team";
  createdBy: string;
  createdAt: number;
}

export interface WorkspaceMember {
  id: string;
  workspaceId: string;
  userId: string;
  role: WorkspaceRole;
  invitedBy?: string;
  joinedAt: number;
}

export interface Project {
  id: string;
  workspaceId: string;
  name: string;
  slug: string;
  createdAt: number;
}

export interface Environment {
  id: string;
  projectId: string;
  name: string;
  slug: string;
  createdAt: number;
}

export interface SecretSet {
  id: string;
  environmentId: string;
  filePath?: string;
  keySalt: string;
  latestRevision?: number;
  createdAt: number;
}

export interface SecretRevision {
  id: string;
  secretSetId: string;
  revision: number;
  ciphertext: string;
  wrappedDataKey: string;
  contentHash: string;
  baseRevision?: number;
  createdAt: number;
  createdBy: string;
}

export interface Device {
  id: string;
  userId: string;
  label: string;
  publicKey: JsonWebKey;
  lastSeenAt: number;
  revokedAt?: number;
}

export interface KeyShare {
  id: string;
  workspaceId: string;
  targetKind: "member" | "device";
  targetId: string;
  wrappedWorkspaceKey: string;
  createdAt: number;
  createdBy: string;
}

export interface AuditEvent {
  id: string;
  workspaceId: string;
  actorId: string;
  action:
    | "workspace.created"
    | "project.created"
    | "environment.created"
    | "revision.created"
    | "device.registered"
    | "device.revoked"
    | "revision.restored"
    | "invite.created"
    | "invite.accepted"
    | "invite.cancelled"
    | "member.removed"
    | "member.role_changed";
  subjectId: string;
  metadata?: Record<string, string | number | boolean | null>;
  createdAt: number;
}

export interface CreateWorkspaceInput {
  name: string;
  slug: string;
  type: "personal" | "team";
  ownerWrappedWorkspaceKey: string;
}

export interface CreateProjectInput {
  workspaceId: string;
  name: string;
  slug: string;
}

export interface CreateEnvironmentInput {
  projectId: string;
  name: string;
  slug: string;
  keySalt: string;
}

export interface CreateRevisionInput {
  secretSetId: string;
  baseRevision?: number;
  ciphertext: string;
  wrappedDataKey: string;
  contentHash: string;
}

export interface CreateRevisionResult {
  acceptedRevision?: number;
  conflict: boolean;
  latestRevision?: number;
}

export interface DeviceRegistrationInput {
  label: string;
  publicKey: JsonWebKey;
}

export interface DeviceLoginSession {
  state: string;
  callbackUrl: string;
  deviceName: string;
}

export interface CliConfig {
  appUrl: string;
  apiUrl: string;
  convexUrl?: string;
  deviceId?: string;
  deviceLabel?: string;
  accessToken?: string;
  privateKey?: JsonWebKey;
  publicKey?: JsonWebKey;
  lastWorkspaceId?: string;
  lastProjectId?: string;
  lastEnvironmentId?: string;
  lastSecretSetId?: string;
  encryptedWorkspaceKeys?: string;
}

export interface Invite {
  id: string;
  workspaceId: string;
  email: string;
  role: WorkspaceRole;
  token: string;
  invitedBy: string;
  status: "pending" | "accepted" | "expired";
  createdAt: number;
  expiresAt: number;
}

export interface InviteWithWorkspace {
  invite: Invite;
  workspace: Workspace | null;
}

export interface MemberWithProfile {
  id: string;
  workspaceId: string;
  userId: string;
  role: WorkspaceRole;
  invitedBy?: string;
  joinedAt: number;
  email: string | null;
  fullName: string | null;
  imageUrl: string | null;
}

export interface WorkspaceWithMembership {
  workspace: Workspace | null;
  membership: WorkspaceMember;
}

export interface EnvironmentWithSecretSet {
  environment: Environment;
  secretSet: SecretSet | null;
}

export interface SidebarEnvMeta {
  environment: Environment;
  fileCount: number;
  files: Array<{ secretSetId: string; filePath: string | null; latestRevision: number | null }>;
  latestRevisionTimestamp: number | null;
}

export interface SidebarData {
  workspaces: WorkspaceWithMembership[];
  projects: Project[];
  environments: SidebarEnvMeta[];
}

export const convexFunctions = {
  loadSidebar: "sidebar:load",
  listWorkspaces: "workspaces:listWorkspaces",
  createWorkspace: "workspaces:createWorkspace",
  createProject: "workspaces:createProject",
  listProjects: "workspaces:listProjects",
  createEnvironment: "workspaces:createEnvironment",
  listEnvironments: "workspaces:listEnvironments",
  getSecretSetForEnvironment: "workspaces:getSecretSetForEnvironment",
  getSecretSetForEnvironmentById: "workspaces:getSecretSetById",
  createRevision: "revisions:createRevision",
  getLatestRevision: "revisions:getLatestRevision",
  listRevisionHistory: "revisions:listRevisionHistory",
  updateEnvironment: "workspaces:updateEnvironment",
  listEnvironmentsWithMeta: "workspaces:listEnvironmentsWithMeta",
  addSecretSet: "workspaces:addSecretSet",
  listSecretSetsForEnvironment: "workspaces:listSecretSetsForEnvironment",
  restoreRevision: "revisions:restoreRevision",
  registerDevice: "devices:registerDevice",
  listDevices: "devices:listDevices",
  revokeDevice: "devices:revokeDevice",
  createInvite: "invites:createInvite",
  acceptInvite: "invites:acceptInvite",
  cancelInvite: "invites:cancelInvite",
  listPendingInvites: "invites:listPendingInvites",
  listMyInvites: "invites:listMyInvites",
  listMembers: "members:listMembers",
  updateMemberRole: "members:updateMemberRole",
  removeMember: "members:removeMember",
} as const;

export type ConvexFunctionName = (typeof convexFunctions)[keyof typeof convexFunctions];

export { AuthError, PermissionError } from "./convex-client";
