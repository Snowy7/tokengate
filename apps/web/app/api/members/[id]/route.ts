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
    const body = (await request.json()) as { newRole?: string };
    if (!body.newRole) {
      return jsonError(400, "Missing newRole");
    }

    const { client } = await getAuthenticatedConvexClient();
    await client.mutation(convexFunctions.updateMemberRole, {
      memberId: id,
      newRole: body.newRole,
    });

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
    await client.mutation(convexFunctions.removeMember, { memberId: id });
    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}
