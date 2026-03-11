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
    | "device.revoked";
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
  deviceId?: string;
  deviceLabel?: string;
  accessToken?: string;
  privateKey?: JsonWebKey;
  publicKey?: JsonWebKey;
  lastWorkspaceId?: string;
}

