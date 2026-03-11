import Link from "next/link";
import { SignedIn, SignedOut, SignInButton } from "@clerk/nextjs";

export default function MarketingPage() {
  return (
    <main className="page-shell hero">
      <section
        className="panel"
        style={{
          padding: 32,
          display: "grid",
          gap: 32
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16 }}>
          <div>
            <p style={{ letterSpacing: "0.22em", textTransform: "uppercase", fontWeight: 800, color: "#2f6f52" }}>
              Tokengate.dev
            </p>
            <h1
              style={{
                fontFamily: "var(--font-display)",
                fontSize: "clamp(2.75rem, 7vw, 5.5rem)",
                lineHeight: 1,
                margin: "12px 0"
              }}
            >
              Zero-knowledge env sync for teams that ship fast.
            </h1>
            <p className="muted" style={{ maxWidth: 720, fontSize: 18, lineHeight: 1.6 }}>
              Manage project environments in the browser, encrypt everything client-side, and pull the latest revision
              to your machines with the Tokengate CLI.
            </p>
          </div>
          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <SignedOut>
              <SignInButton mode="modal">
                <button className="button">Start free</button>
              </SignInButton>
            </SignedOut>
            <SignedIn>
              <Link className="button" href="/dashboard">
                Open dashboard
              </Link>
            </SignedIn>
          </div>
        </div>

        <div
          className="grid"
          style={{
            gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))"
          }}
        >
          {[
            ["Zero-knowledge", "Secrets are encrypted in the browser and CLI before they ever touch the backend."],
            ["Workspace sharing", "Invite teammates into a workspace and share wrapped workspace keys safely."],
            ["Immutable history", "Every env change becomes a new revision with conflict-aware sync semantics."],
            ["Local sync", "Pull normalized `.env` files to your machine through a device-scoped CLI flow."]
          ].map(([title, description]) => (
            <article key={title} className="panel" style={{ padding: 22 }}>
              <h2 style={{ margin: "0 0 8px", fontSize: 20 }}>{title}</h2>
              <p className="muted" style={{ margin: 0, lineHeight: 1.6 }}>
                {description}
              </p>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}

