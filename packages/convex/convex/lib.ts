import { ConvexError } from "convex/values";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";

export type Role = "owner" | "admin" | "member" | "viewer";
export type Ctx = QueryCtx | MutationCtx;

export async function requireAuth(ctx: Ctx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw new ConvexError("Unauthorized");
  }
  return identity;
}

export async function requireWorkspaceRole(
  ctx: Ctx,
  workspaceId: Id<"workspaces">,
  allowedRoles: Role[]
) {
  const identity = await requireAuth(ctx);
  const membership = await ctx.db
    .query("workspaceMembers")
    .withIndex("by_workspace_and_user", (query) => query.eq("workspaceId", workspaceId).eq("userId", identity.subject))
    .unique();

  if (!membership || !allowedRoles.includes(membership.role as Role)) {
    throw new ConvexError({
      code: "Forbidden",
      userRole: membership?.role ?? null,
      requiredRoles: allowedRoles,
    });
  }

  return { identity, membership };
}

export async function createAuditEvent(
  ctx: MutationCtx,
  args: {
    workspaceId: Id<"workspaces">;
    actorId: string;
    action: string;
    subjectId: string;
    metadata?: Record<string, string | number | boolean | null>;
  }
) {
  await ctx.db.insert("auditEvents", {
    ...args,
    createdAt: Date.now()
  });
}
