import { NextRequest, NextResponse } from "next/server";
import { convexFunctions } from "@tokengate/sdk";
import { jsonError, handleApiError } from "@/lib/api";
import { getAuthenticatedConvexClient } from "@/lib/convex";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { client } = await getAuthenticatedConvexClient();
    await client.mutation(convexFunctions.updateIntegration, { integrationId: id, ...body });
    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { client } = await getAuthenticatedConvexClient();
    await client.mutation(convexFunctions.removeIntegration, { integrationId: id });
    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}
