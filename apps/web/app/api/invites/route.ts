import { NextRequest, NextResponse } from "next/server";
import { convexFunctions, type Invite, type InviteWithWorkspace } from "@tokengate/sdk";
import { jsonError, handleApiError } from "@/lib/api";
import { getAuthenticatedConvexClient } from "@/lib/convex";

export async function GET(request: NextRequest) {
  try {
    const { client } = await getAuthenticatedConvexClient();
    const mine = request.nextUrl.searchParams.get("mine");

    if (mine === "true") {
      const invites = await client.query<InviteWithWorkspace[]>(convexFunctions.listMyInvites, {});
      return NextResponse.json({ invites });
    }

    const workspaceId = request.nextUrl.searchParams.get("workspaceId");
    if (!workspaceId) {
      return jsonError(400, "Missing workspaceId");
    }

    const invites = await client.query<Invite[]>(convexFunctions.listPendingInvites, { workspaceId });
    return NextResponse.json({ invites });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      workspaceId?: string;
      email?: string;
      role?: string;
    };

    if (!body.workspaceId || !body.email || !body.role) {
      return jsonError(400, "Missing required fields: workspaceId, email, role");
    }

    const { client } = await getAuthenticatedConvexClient();
    const result = await client.mutation<{ inviteId: string; token: string }>(
      convexFunctions.createInvite,
      { workspaceId: body.workspaceId, email: body.email, role: body.role }
    );

    return NextResponse.json(result);
  } catch (error) {
    return handleApiError(error);
  }
}
