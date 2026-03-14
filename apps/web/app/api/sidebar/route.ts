import { NextRequest, NextResponse } from "next/server";
import { convexFunctions, type SidebarData } from "@tokengate/sdk";
import { handleApiError } from "@/lib/api";
import { getAuthenticatedConvexClient } from "@/lib/convex";

export async function GET(request: NextRequest) {
  try {
    const workspaceId = request.nextUrl.searchParams.get("workspaceId") || undefined;
    const { client } = await getAuthenticatedConvexClient();

    const data = await client.query<SidebarData>(
      convexFunctions.loadSidebar,
      workspaceId ? { workspaceId } : {}
    );

    return NextResponse.json(data);
  } catch (error) {
    return handleApiError(error);
  }
}
