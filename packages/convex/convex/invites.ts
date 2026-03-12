import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { createAuditEvent, requireAuth, requireWorkspaceRole } from "./lib";

export const createInvite = mutation({
  args: {
    workspaceId: v.id("workspaces"),
    email: v.string(),
    role: v.union(v.literal("admin"), v.literal("member"), v.literal("viewer")),
  },
  handler: async (ctx, args) => {
    const { identity } = await requireWorkspaceRole(ctx, args.workspaceId, ["owner", "admin"]);

    // Deduplicate: check if a pending invite already exists for this email+workspace
    const existing = await ctx.db
      .query("invites")
      .withIndex("by_workspace_and_email", (q) =>
        q.eq("workspaceId", args.workspaceId).eq("email", args.email)
      )
      .collect();

    const pendingExisting = existing.find((inv) => inv.status === "pending");
    if (pendingExisting) {
      throw new Error("A pending invite already exists for this email in this workspace.");
    }

    // Check if user is already a member
    const members = await ctx.db
      .query("workspaceMembers")
      .withIndex("by_workspace", (q) => q.eq("workspaceId", args.workspaceId))
      .collect();

    // Look up users by email to check membership
    const users = await ctx.db.query("users").collect();
    const userByEmail = users.find((u) => u.email === args.email);
    if (userByEmail) {
      const alreadyMember = members.find((m) => m.userId === userByEmail.clerkId);
      if (alreadyMember) {
        throw new Error("This user is already a member of this workspace.");
      }
    }

    const now = Date.now();
    const token = generateToken();
    const inviteId = await ctx.db.insert("invites", {
      workspaceId: args.workspaceId,
      email: args.email,
      role: args.role,
      token,
      invitedBy: identity.subject,
      status: "pending",
      createdAt: now,
      expiresAt: now + 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    await createAuditEvent(ctx, {
      workspaceId: args.workspaceId,
      actorId: identity.subject,
      action: "invite.created",
      subjectId: inviteId,
      metadata: { email: args.email, role: args.role },
    });

    return { inviteId, token };
  },
});

export const acceptInvite = mutation({
  args: {
    token: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await requireAuth(ctx);
    const email = identity.email;
    if (!email) {
      throw new Error("Your account has no email address.");
    }

    const invite = await ctx.db
      .query("invites")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .unique();

    if (!invite) {
      throw new Error("Invite not found.");
    }

    if (invite.status !== "pending") {
      throw new Error(`This invite has already been ${invite.status}.`);
    }

    if (Date.now() > invite.expiresAt) {
      await ctx.db.patch(invite._id, { status: "expired" });
      throw new Error("This invite has expired.");
    }

    if (invite.email.toLowerCase() !== email.toLowerCase()) {
      throw new Error("This invite was sent to a different email address.");
    }

    // Check if already a member
    const existingMembership = await ctx.db
      .query("workspaceMembers")
      .withIndex("by_workspace_and_user", (q) =>
        q.eq("workspaceId", invite.workspaceId).eq("userId", identity.subject)
      )
      .unique();

    if (existingMembership) {
      await ctx.db.patch(invite._id, { status: "accepted" });
      throw new Error("You are already a member of this workspace.");
    }

    // Create membership
    await ctx.db.insert("workspaceMembers", {
      workspaceId: invite.workspaceId,
      userId: identity.subject,
      role: invite.role,
      invitedBy: invite.invitedBy,
      joinedAt: Date.now(),
    });

    // Mark invite as accepted
    await ctx.db.patch(invite._id, { status: "accepted" });

    await createAuditEvent(ctx, {
      workspaceId: invite.workspaceId,
      actorId: identity.subject,
      action: "invite.accepted",
      subjectId: invite._id,
      metadata: { email: invite.email, role: invite.role },
    });

    return { workspaceId: invite.workspaceId };
  },
});

export const cancelInvite = mutation({
  args: {
    inviteId: v.id("invites"),
  },
  handler: async (ctx, args) => {
    const invite = await ctx.db.get(args.inviteId);
    if (!invite) {
      throw new Error("Invite not found.");
    }

    const { identity } = await requireWorkspaceRole(ctx, invite.workspaceId, ["owner", "admin"]);

    await ctx.db.delete(args.inviteId);

    await createAuditEvent(ctx, {
      workspaceId: invite.workspaceId,
      actorId: identity.subject,
      action: "invite.cancelled",
      subjectId: args.inviteId,
      metadata: { email: invite.email },
    });
  },
});

export const listPendingInvites = query({
  args: {
    workspaceId: v.id("workspaces"),
  },
  handler: async (ctx, args) => {
    await requireWorkspaceRole(ctx, args.workspaceId, ["owner", "admin"]);
    const invites = await ctx.db
      .query("invites")
      .withIndex("by_workspace", (q) => q.eq("workspaceId", args.workspaceId))
      .collect();
    return invites.filter((inv) => inv.status === "pending");
  },
});

export const listMyInvites = query({
  args: {},
  handler: async (ctx) => {
    const identity = await requireAuth(ctx);
    const email = identity.email;
    if (!email) return [];

    const invites = await ctx.db
      .query("invites")
      .withIndex("by_email", (q) => q.eq("email", email))
      .collect();

    const pending = invites.filter((inv) => inv.status === "pending" && Date.now() <= inv.expiresAt);

    // Enrich with workspace info
    return Promise.all(
      pending.map(async (inv) => {
        const workspace = await ctx.db.get(inv.workspaceId);
        return { invite: inv, workspace };
      })
    );
  },
});

function generateToken(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  for (let i = 0; i < 48; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}
