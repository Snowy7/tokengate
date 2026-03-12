import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { createAuditEvent, requireWorkspaceRole } from "./lib";

export const listMembers = query({
  args: {
    workspaceId: v.id("workspaces"),
  },
  handler: async (ctx, args) => {
    await requireWorkspaceRole(ctx, args.workspaceId, ["owner", "admin", "member", "viewer"]);

    const members = await ctx.db
      .query("workspaceMembers")
      .withIndex("by_workspace", (q) => q.eq("workspaceId", args.workspaceId))
      .collect();

    // Enrich with user info
    return Promise.all(
      members.map(async (member) => {
        const users = await ctx.db
          .query("users")
          .withIndex("by_clerk_id", (q) => q.eq("clerkId", member.userId))
          .collect();
        const user = users[0] ?? null;
        return {
          ...member,
          email: user?.email ?? null,
          fullName: user?.fullName ?? null,
          imageUrl: user?.imageUrl ?? null,
        };
      })
    );
  },
});

export const updateMemberRole = mutation({
  args: {
    memberId: v.id("workspaceMembers"),
    newRole: v.union(v.literal("admin"), v.literal("member"), v.literal("viewer")),
  },
  handler: async (ctx, args) => {
    const member = await ctx.db.get(args.memberId);
    if (!member) {
      throw new Error("Member not found.");
    }

    const { identity, membership } = await requireWorkspaceRole(ctx, member.workspaceId, ["owner"]);

    // Can't change own role
    if (member.userId === identity.subject) {
      throw new Error("You cannot change your own role.");
    }

    // Can't change another owner's role
    if (member.role === "owner") {
      throw new Error("Cannot change the role of a workspace owner.");
    }

    await ctx.db.patch(args.memberId, { role: args.newRole });

    await createAuditEvent(ctx, {
      workspaceId: member.workspaceId,
      actorId: identity.subject,
      action: "member.role_changed",
      subjectId: args.memberId,
      metadata: { previousRole: member.role, newRole: args.newRole },
    });
  },
});

export const removeMember = mutation({
  args: {
    memberId: v.id("workspaceMembers"),
  },
  handler: async (ctx, args) => {
    const member = await ctx.db.get(args.memberId);
    if (!member) {
      throw new Error("Member not found.");
    }

    const { identity } = await requireWorkspaceRole(ctx, member.workspaceId, ["owner", "admin"]);

    // Can't remove self
    if (member.userId === identity.subject) {
      throw new Error("You cannot remove yourself.");
    }

    // Can't remove owner
    if (member.role === "owner") {
      throw new Error("Cannot remove a workspace owner.");
    }

    // Delete member's key wrappers for this workspace
    const keyWrappers = await ctx.db
      .query("keyWrappers")
      .withIndex("by_workspace_and_target", (q) =>
        q.eq("workspaceId", member.workspaceId).eq("targetId", member.userId)
      )
      .collect();

    for (const kw of keyWrappers) {
      await ctx.db.delete(kw._id);
    }

    // Delete the membership
    await ctx.db.delete(args.memberId);

    await createAuditEvent(ctx, {
      workspaceId: member.workspaceId,
      actorId: identity.subject,
      action: "member.removed",
      subjectId: args.memberId,
      metadata: { removedUserId: member.userId, role: member.role },
    });
  },
});
