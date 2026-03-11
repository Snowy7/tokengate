import { NextRequest, NextResponse } from "next/server";
import { convexFunctions, type Project } from "@tokengate/sdk";
import { jsonError, toErrorMessage } from "@/lib/api";
import { getAuthenticatedConvexClient } from "@/lib/convex";

export async function GET(request: NextRequest) {
  try {
    const workspaceId = request.nextUrl.searchParams.get("workspaceId");
    if (!workspaceId) {
      return jsonError(400, "Missing workspaceId");
    }

    const { client } = await getAuthenticatedConvexClient();
    const projects = await client.query<Project[]>(convexFunctions.listProjects, {
      workspaceId
    });
    return NextResponse.json({ projects });
  } catch (error) {
    return jsonError(500, toErrorMessage(error));
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      workspaceId?: string;
      name?: string;
      slug?: string;
    };

    if (!body.workspaceId || !body.name || !body.slug) {
      return jsonError(400, "Missing project fields");
    }

    const { client } = await getAuthenticatedConvexClient();
    const projectId = await client.mutation<string>(convexFunctions.createProject, {
      workspaceId: body.workspaceId,
      name: body.name,
      slug: body.slug
    });
    return NextResponse.json({ projectId });
  } catch (error) {
    return jsonError(500, toErrorMessage(error));
  }
}
