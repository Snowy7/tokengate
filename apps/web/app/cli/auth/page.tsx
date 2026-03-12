"use client";

import { Suspense, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

export const dynamic = "force-dynamic";

function CliAuthContent() {
  const params = useSearchParams();
  const [approved, setApproved] = useState(false);
  const [loading, setLoading] = useState(false);

  const callbackUrl = params.get("callback");
  const state = params.get("state");
  const deviceName = params.get("device_name");

  const approvalHref = useMemo(() => {
    if (!callbackUrl || !state) return null;

    const search = new URLSearchParams();
    search.set("callback", callbackUrl);
    search.set("state", state);
    search.set("device_name", deviceName ?? "tokengate-cli");
    search.set("public_key", params.get("public_key") ?? "");
    return `/api/cli/device-flow/approve?${search.toString()}`;
  }, [callbackUrl, deviceName, params, state]);

  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "24px",
      background: "var(--background)",
    }}>
      <div style={{
        width: "100%",
        maxWidth: 480,
        border: "3px solid var(--border)",
        background: "var(--surface)",
        padding: "40px 32px",
      }}>
        {/* Terminal-style header */}
        <div style={{
          fontFamily: "var(--font-mono)",
          fontSize: 11,
          textTransform: "uppercase",
          letterSpacing: "0.15em",
          color: "var(--accent)",
          fontWeight: 700,
          marginBottom: 8,
        }}>
          CLI Authorization
        </div>

        <h1 style={{
          fontSize: 24,
          fontWeight: 800,
          margin: "0 0 16px",
          color: "var(--text)",
          fontFamily: "var(--font-heading)",
        }}>
          Authorize {deviceName ?? "your device"}
        </h1>

        {/* Device info */}
        {deviceName && (
          <div style={{
            fontFamily: "var(--font-mono)",
            fontSize: 13,
            padding: "12px 16px",
            background: "var(--surface-hover)",
            border: "2px solid var(--border)",
            marginBottom: 20,
            display: "flex",
            alignItems: "center",
            gap: 10,
          }}>
            <span style={{ color: "var(--accent)" }}>$</span>
            <span style={{ color: "var(--muted)" }}>device:</span>
            <span style={{ color: "var(--text)" }}>{deviceName}</span>
          </div>
        )}

        <p style={{
          lineHeight: 1.6,
          color: "var(--muted)",
          fontSize: 14,
          margin: "0 0 24px",
        }}>
          This will register the device&apos;s public key and return an access token to the CLI.
        </p>

        {approvalHref && !approved ? (
          <a
            href={approvalHref}
            onClick={() => { setApproved(true); setLoading(true); }}
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              width: "100%",
              padding: "14px 24px",
              fontFamily: "var(--font-mono)",
              fontSize: 14,
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              color: "var(--accent-fg)",
              background: "var(--accent)",
              border: "3px solid var(--text)",
              textDecoration: "none",
              cursor: "pointer",
              transition: "box-shadow 120ms ease, transform 120ms ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.boxShadow = "4px 4px 0 var(--text)";
              e.currentTarget.style.transform = "translate(-2px, -2px)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.boxShadow = "none";
              e.currentTarget.style.transform = "none";
            }}
          >
            Approve device
          </a>
        ) : approvalHref === null ? (
          <div style={{
            padding: "14px 20px",
            border: "2px solid var(--border)",
            background: "var(--surface-hover)",
            color: "var(--muted)",
            fontFamily: "var(--font-mono)",
            fontSize: 13,
            textAlign: "center",
          }}>
            Missing callback parameters. Run <code style={{ color: "var(--accent)" }}>tokengate login</code> again.
          </div>
        ) : null}

        {loading && (
          <div style={{
            marginTop: 20,
            display: "flex",
            alignItems: "center",
            gap: 10,
            fontFamily: "var(--font-mono)",
            fontSize: 13,
            color: "var(--accent)",
          }}>
            <div className="loading-spinner" style={{ width: 16, height: 16, borderWidth: 2 }} />
            Redirecting to CLI...
          </div>
        )}

        <div style={{
          marginTop: 24,
          paddingTop: 16,
          borderTop: "2px solid var(--border)",
          fontFamily: "var(--font-mono)",
          fontSize: 11,
          color: "var(--muted)",
          letterSpacing: "0.05em",
        }}>
          tokengate.dev — end-to-end encrypted env sync
        </div>
      </div>
    </div>
  );
}

export default function CliAuthPage() {
  return (
    <Suspense fallback={
      <div style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "var(--background)",
      }}>
        <div className="loading-spinner" />
      </div>
    }>
      <CliAuthContent />
    </Suspense>
  );
}
