import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json(
    {
      error: "CLI latest revision lookup is not wired to Convex yet.",
      nextStep: "Implement a read endpoint backed by Convex secret revision queries."
    },
    { status: 501 }
  );
}

