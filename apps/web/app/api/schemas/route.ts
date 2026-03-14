import { NextRequest, NextResponse } from "next/server";
import { convexFunctions, type FileSchema } from "@tokengate/sdk";
import { jsonError, handleApiError } from "@/lib/api";
import { getAuthenticatedConvexClient } from "@/lib/convex";

export async function GET(request: NextRequest) {
  try {
    const projectId = request.nextUrl.searchParams.get("projectId");
    if (!projectId) return jsonError(400, "Missing projectId");

    const { client } = await getAuthenticatedConvexClient();
    const schemas = await client.query<FileSchema[]>(convexFunctions.listFileSchemas, { projectId });
    return NextResponse.json({ schemas });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      projectId?: string;
      filePath?: string;
      fields?: unknown[];
    };

    if (!body.projectId || !body.filePath || !body.fields) {
      return jsonError(400, "Missing projectId, filePath, or fields");
    }

    const { client } = await getAuthenticatedConvexClient();
    const schemaId = await client.mutation<string>(convexFunctions.upsertFileSchema, {
      projectId: body.projectId,
      filePath: body.filePath,
      fields: body.fields,
    });

    return NextResponse.json({ schemaId });
  } catch (error) {
    return handleApiError(error);
  }
}
