import { UserButton } from "@clerk/nextjs";
import { DashboardClient } from "@/components/dashboard-client";

export const dynamic = "force-dynamic";

export default function DashboardPage() {
  return (
    <main className="page-shell hero">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div>
          <p style={{ margin: 0, color: "#2f6f52", fontWeight: 800, letterSpacing: "0.18em", textTransform: "uppercase" }}>
            Workspace bootstrap
          </p>
          <h1 style={{ margin: "8px 0 0", fontSize: 40 }}>Dashboard</h1>
        </div>
        <UserButton />
      </div>

      <DashboardClient />
    </main>
  );
}
