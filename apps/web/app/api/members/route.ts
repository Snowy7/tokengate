import { NextRequest, NextResponse } from "next/server";
import { convexFunctions, type MemberWithProfile } from "@tokengate/sdk";
import { jsonError, handleApiError } from "@/lib/api";
import { getAuthenticatedConvexClient } from "@/lib/convex";

export async function GET(request: NextRequest) {
  try {
    const workspaceId = request.nextUrl.searchParams.get("workspaceId");
    if (!workspaceId) {
      return jsonError(400, "Missing workspaceId");
    }

    const { client } = await getAuthenticatedConvexClient();
    const members = await client.query<MemberWithProfile[]>(
      convexFunctions.listMembers,
      { workspaceId }
    );

    return NextResponse.json({ members });
  } catch (error) {
    return handleApiError(error);
  }
}
