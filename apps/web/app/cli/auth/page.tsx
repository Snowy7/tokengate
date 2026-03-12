"use client";

import { Suspense, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

export const dynamic = "force-dynamic";

function CliAuthContent() {
  const params = useSearchParams();
  const [approved, setApproved] = useState(false);

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

  const hasParams = approvalHref !== null;

  return (
    <div className="cli-auth-page">
      <style>{`
        .cli-auth-page {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 24px;
          background: var(--background);
        }
        .cli-auth-card {
          width: 100%;
          max-width: 460px;
          border: 3px solid var(--border);
          background: var(--surface);
        }
        .cli-auth-header {
          padding: 20px 28px;
          border-bottom: 3px solid var(--border);
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .cli-auth-header svg { color: var(--accent); }
        .cli-auth-header span {
          font-family: var(--font-mono);
          font-size: 12px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.12em;
          color: var(--muted);
        }
        .cli-auth-body { padding: 32px 28px; }
        .cli-auth-body h1 {
          font-size: 22px;
          font-weight: 800;
          margin: 0 0 20px;
          color: var(--text);
          font-family: var(--font-heading);
          line-height: 1.2;
        }
        .cli-auth-device {
          font-family: var(--font-mono);
          font-size: 13px;
          padding: 14px 16px;
          background: var(--surface-hover);
          border: 2px solid var(--border);
          margin-bottom: 20px;
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .cli-auth-device .prompt { color: var(--accent); font-weight: 700; }
        .cli-auth-device .label { color: var(--muted); }
        .cli-auth-device .name { color: var(--text); font-weight: 700; }
        .cli-auth-desc {
          font-size: 14px;
          line-height: 1.7;
          color: var(--muted);
          margin: 0 0 24px;
        }
        .cli-auth-approve {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          width: 100%;
          padding: 16px 24px;
          font-family: var(--font-mono);
          font-size: 14px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          color: var(--accent-fg);
          background: var(--accent);
          border: 3px solid var(--text);
          text-decoration: none;
          cursor: pointer;
          transition: box-shadow 120ms ease, transform 120ms ease;
        }
        .cli-auth-approve:hover {
          box-shadow: 4px 4px 0 var(--text);
          transform: translate(-2px, -2px);
        }
        .cli-auth-approve.disabled {
          opacity: 0.5;
          pointer-events: none;
        }
        .cli-auth-status {
          margin-top: 20px;
          display: flex;
          align-items: center;
          gap: 10px;
          font-family: var(--font-mono);
          font-size: 13px;
          color: var(--accent);
          padding: 12px 16px;
          border: 2px solid var(--accent);
          background: color-mix(in srgb, var(--accent) 5%, transparent);
        }
        .cli-auth-error {
          padding: 24px;
          border: 2px solid var(--border);
          background: var(--surface-hover);
          text-align: center;
        }
        .cli-auth-error svg {
          margin-bottom: 12px;
          color: var(--muted);
          opacity: 0.5;
        }
        .cli-auth-error p {
          font-size: 14px;
          color: var(--muted);
          line-height: 1.6;
          margin: 0 0 16px;
        }
        .cli-auth-error code {
          font-family: var(--font-mono);
          color: var(--accent);
          font-size: 13px;
        }
        .cli-auth-footer {
          padding: 16px 28px;
          border-top: 2px solid var(--border);
          display: flex;
          align-items: center;
          justify-content: space-between;
          font-family: var(--font-mono);
          font-size: 11px;
          color: var(--muted);
          letter-spacing: 0.04em;
        }
      `}</style>

      <div className="cli-auth-card">
        {/* Header bar */}
        <div className="cli-auth-header">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          </svg>
          <span>CLI Authorization</span>
        </div>

        <div className="cli-auth-body">
          {hasParams ? (
            <>
              <h1>Authorize device</h1>

              {/* Device terminal block */}
              <div className="cli-auth-device">
                <span className="prompt">$</span>
                <span className="label">device</span>
                <span className="name">{deviceName ?? "tokengate-cli"}</span>
              </div>

              <p className="cli-auth-desc">
                This will register the device and return an encrypted access token to the CLI running on your machine.
              </p>

              {!approved ? (
                <a href={approvalHref!} className="cli-auth-approve" onClick={() => setApproved(true)}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M22 11.08V12a10 10 0 11-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" />
                  </svg>
                  Approve &amp; authorize
                </a>
              ) : (
                <div className="cli-auth-approve disabled">Approved</div>
              )}

              {approved && (
                <div className="cli-auth-status">
                  <div className="loading-spinner" style={{ width: 14, height: 14, borderWidth: 2 }} />
                  Redirecting to CLI callback...
                </div>
              )}
            </>
          ) : (
            <div className="cli-auth-error">
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              <p>Missing callback parameters. The login link may have expired or been truncated.</p>
              <p>Run <code>tokengate login</code> in your terminal to try again.</p>
            </div>
          )}
        </div>

        <div className="cli-auth-footer">
          <span>tokengate.dev</span>
          <span>e2e encrypted</span>
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
