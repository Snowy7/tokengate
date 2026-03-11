import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json(
    {
      error: "CLI revision history is not wired to Convex yet.",
      nextStep: "Implement a history endpoint backed by Convex secret revision queries."
    },
    { status: 501 }
  );
}
