import { NextRequest, NextResponse } from "next/server";
import { convexFunctions, type WorkspaceWithMembership } from "@tokengate/sdk";
import { jsonError, toErrorMessage } from "@/lib/api";
import { getAuthenticatedConvexClient } from "@/lib/convex";

export async function GET() {
  try {
    const { client } = await getAuthenticatedConvexClient();
    const workspaces = await client.query<WorkspaceWithMembership[]>(convexFunctions.listWorkspaces, {});
    return NextResponse.json({ workspaces });
  } catch (error) {
    return jsonError(401, toErrorMessage(error));
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      name?: string;
      slug?: string;
      type?: "personal" | "team";
      ownerWrappedWorkspaceKey?: string;
    };

    if (!body.name || !body.slug || !body.type || !body.ownerWrappedWorkspaceKey) {
      return jsonError(400, "Missing workspace fields");
    }

    const { client } = await getAuthenticatedConvexClient();
    const workspaceId = await client.mutation<string>(convexFunctions.createWorkspace, {
      name: body.name,
      slug: body.slug,
      type: body.type,
      ownerWrappedWorkspaceKey: body.ownerWrappedWorkspaceKey
    });

    return NextResponse.json({ workspaceId });
  } catch (error) {
    return jsonError(500, toErrorMessage(error));
  }
}
