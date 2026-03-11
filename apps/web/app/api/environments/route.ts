import { NextRequest, NextResponse } from "next/server";
import { convexFunctions, type Environment } from "@tokengate/sdk";
import { jsonError, toErrorMessage } from "@/lib/api";
import { getAuthenticatedConvexClient } from "@/lib/convex";

export async function GET(request: NextRequest) {
  try {
    const projectId = request.nextUrl.searchParams.get("projectId");
    if (!projectId) {
      return jsonError(400, "Missing projectId");
    }

    const { client } = await getAuthenticatedConvexClient();
    const environments = await client.query<Environment[]>(convexFunctions.listEnvironments, {
      projectId
    });
    return NextResponse.json({ environments });
  } catch (error) {
    return jsonError(500, toErrorMessage(error));
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      projectId?: string;
      name?: string;
      slug?: string;
    };

    if (!body.projectId || !body.name || !body.slug) {
      return jsonError(400, "Missing environment fields");
    }

    const { client } = await getAuthenticatedConvexClient();
    const environmentId = await client.mutation<string>(convexFunctions.createEnvironment, {
      projectId: body.projectId,
      name: body.name,
      slug: body.slug
    });
    return NextResponse.json({ environmentId });
  } catch (error) {
    return jsonError(500, toErrorMessage(error));
  }
}
