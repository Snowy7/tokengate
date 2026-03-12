"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

export default function AcceptInvitePage() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setMessage("No invite token provided.");
      return;
    }

    void (async () => {
      try {
        const response = await fetch("/api/invites/accept", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ token }),
        });

        if (!response.ok) {
          const data = await response.json().catch(() => ({ error: "Failed to accept invite." }));
          throw new Error(data.error || "Failed to accept invite.");
        }

        setStatus("success");
        setMessage("You have been added to the workspace. Redirecting to dashboard...");
        setTimeout(() => {
          window.location.href = "/dashboard";
        }, 2000);
      } catch (err) {
        setStatus("error");
        setMessage(err instanceof Error ? err.message : "Failed to accept invite.");
      }
    })();
  }, [token]);

  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: 24,
    }}>
      <div className="panel" style={{ maxWidth: 480, width: "100%", padding: "40px 32px", textAlign: "center" }}>
        <div style={{
          fontFamily: "var(--font-mono)",
          fontSize: 11,
          textTransform: "uppercase",
          letterSpacing: "0.15em",
          color: status === "error" ? "var(--error)" : "var(--accent)",
          fontWeight: 700,
          marginBottom: 20,
        }}>
          tokengate invite
        </div>
        {status === "loading" && (
          <>
            <div className="loading-spinner" style={{ margin: "0 auto 16px" }} />
            <p className="muted">Accepting invite...</p>
          </>
        )}
        {status === "success" && (
          <>
            <h2 style={{ marginBottom: 12 }}>Invite accepted</h2>
            <p className="muted" style={{ lineHeight: 1.6 }}>{message}</p>
          </>
        )}
        {status === "error" && (
          <>
            <h2 style={{ marginBottom: 12 }}>Could not accept invite</h2>
            <p className="muted" style={{ lineHeight: 1.6, marginBottom: 20 }}>{message}</p>
            <a href="/dashboard" className="button">Go to dashboard</a>
          </>
        )}
      </div>
    </div>
  );
}
