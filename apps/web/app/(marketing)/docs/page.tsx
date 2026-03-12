"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";

const sections = [
  { id: "getting-started", label: "Getting Started" },
  { id: "installation", label: "Installation" },
  { id: "cli-commands", label: "CLI Commands" },
  { id: "configuration", label: "Configuration" },
  { id: "multi-file-sync", label: "Multi-file Sync" },
  { id: "encryption", label: "Encryption" },
  { id: "web-dashboard", label: "Web Dashboard" },
  { id: "team-workflows", label: "Team Workflows" },
];

function Terminal({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="docs-terminal">
      <div className="docs-terminal-bar">
        <div className="docs-terminal-dot" />
        <div className="docs-terminal-dot" />
        <div className="docs-terminal-dot" />
        <span className="docs-terminal-title">{title}</span>
      </div>
      <div className="docs-terminal-body">{children}</div>
    </div>
  );
}

function Line({
  prompt,
  cmd,
  children,
}: {
  prompt?: boolean;
  cmd?: boolean;
  children?: React.ReactNode;
}) {
  if (prompt && cmd) {
    return (
      <div>
        <span className="docs-green">$ </span>
        <span className="docs-white docs-bold">{children}</span>
      </div>
    );
  }
  return <div>{children}</div>;
}

function G({ children }: { children: React.ReactNode }) {
  return <span className="docs-green">{children}</span>;
}
function Y({ children }: { children: React.ReactNode }) {
  return <span className="docs-yellow">{children}</span>;
}
function B({ children }: { children: React.ReactNode }) {
  return <span className="docs-blue">{children}</span>;
}
function D({ children }: { children: React.ReactNode }) {
  return <span className="docs-dim">{children}</span>;
}
function W({ children }: { children: React.ReactNode }) {
  return <span className="docs-white">{children}</span>;
}
function Bold({ children }: { children: React.ReactNode }) {
  return <span className="docs-bold">{children}</span>;
}

export default function DocsPage() {
  const [dark, setDark] = useState(false);
  const [activeSection, setActiveSection] = useState("getting-started");
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  useEffect(() => {
    if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
      setDark(true);
    }
  }, []);

  const handleScroll = useCallback(() => {
    const offsets = sections.map((s) => {
      const el = document.getElementById(s.id);
      return { id: s.id, top: el ? el.getBoundingClientRect().top : Infinity };
    });
    const current = offsets.reduce((best, item) =>
      item.top <= 120 && item.top > best.top ? item : best,
      { id: offsets[0].id, top: -Infinity }
    );
    setActiveSection(current.id);
  }, []);

  useEffect(() => {
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [handleScroll]);

  return (
    <div className="docs-root" data-theme={dark ? "dark" : "light"}>
      <style
        dangerouslySetInnerHTML={{
          __html: `
@import url('https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&family=Work+Sans:wght@400;500;600;700;800;900&display=swap');

/* ========== DOCS VARIABLES ========== */
.docs-root {
  --docs-bg: #ffffff;
  --docs-bg-alt: #f5f5f0;
  --docs-surface: #ffffff;
  --docs-text: #0a0a0a;
  --docs-text-secondary: #555555;
  --docs-green: #00a86b;
  --docs-green-dim: rgba(0, 168, 107, 0.12);
  --docs-border: #0a0a0a;
  --docs-border-light: #e0e0e0;
  --docs-terminal-bg: #0a0a0a;
  --docs-terminal-text: #d4d4d4;
  --docs-terminal-green: #00d68f;
  --docs-terminal-yellow: #fbbf24;
  --docs-terminal-blue: #60a5fa;
  --docs-terminal-red: #f87171;
  --docs-terminal-dim: #666666;
  --docs-font-mono: 'Space Mono', monospace;
  --docs-font-sans: 'Work Sans', sans-serif;
  --docs-shadow: 4px 4px 0 #0a0a0a;
  --docs-sidebar-width: 260px;
}

.docs-root[data-theme="dark"] {
  --docs-bg: #0a0e0c;
  --docs-bg-alt: #0f1412;
  --docs-surface: #131a17;
  --docs-text: #e8e8e8;
  --docs-text-secondary: #999999;
  --docs-green: #00d68f;
  --docs-green-dim: rgba(0, 214, 143, 0.12);
  --docs-border: #e8e8e8;
  --docs-border-light: #2a2a2a;
  --docs-terminal-bg: #111111;
  --docs-shadow: 4px 4px 0 #00d68f;
}

/* ========== BASE ========== */
.docs-root {
  background: var(--docs-bg);
  color: var(--docs-text);
  font-family: var(--docs-font-sans);
  min-height: 100vh;
  overflow-x: hidden;
  -webkit-font-smoothing: antialiased;
}

.docs-root *, .docs-root *::before, .docs-root *::after {
  box-sizing: border-box;
}

/* ========== NAV ========== */
.docs-nav {
  position: sticky;
  top: 0;
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 32px;
  height: 64px;
  background: var(--docs-bg);
  border-bottom: 3px solid var(--docs-border);
}

.docs-nav-left {
  display: flex;
  align-items: center;
  gap: 12px;
  text-decoration: none;
  color: inherit;
}

.docs-logo-box {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  background: var(--docs-green);
  border: 3px solid var(--docs-border);
  font-family: var(--docs-font-mono);
  font-weight: 700;
  font-size: 16px;
  color: #000;
}

.docs-logo-text {
  font-family: var(--docs-font-mono);
  font-weight: 700;
  font-size: 16px;
  letter-spacing: -0.02em;
}

.docs-nav-right {
  display: flex;
  align-items: center;
  gap: 16px;
}

.docs-theme-toggle {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border: 3px solid var(--docs-border);
  background: var(--docs-bg);
  color: var(--docs-text);
  font-size: 18px;
  cursor: pointer;
  transition: transform 0.15s ease, box-shadow 0.15s ease;
}

.docs-theme-toggle:hover {
  transform: translate(-2px, -2px);
  box-shadow: var(--docs-shadow);
}

.docs-nav-link {
  font-family: var(--docs-font-mono);
  font-size: 14px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--docs-text);
  text-decoration: none;
  padding: 8px 12px;
  border: 3px solid transparent;
  transition: border-color 0.15s ease;
}

.docs-nav-link:hover {
  border-color: var(--docs-border);
}

/* ========== LAYOUT ========== */
.docs-layout {
  display: flex;
  max-width: 1280px;
  margin: 0 auto;
  min-height: calc(100vh - 64px);
}

/* ========== SIDEBAR ========== */
.docs-sidebar {
  width: var(--docs-sidebar-width);
  min-width: var(--docs-sidebar-width);
  padding: 32px 0 32px 32px;
  position: sticky;
  top: 64px;
  height: calc(100vh - 64px);
  overflow-y: auto;
  border-right: 3px solid var(--docs-border-light);
}

.docs-sidebar-label {
  font-family: var(--docs-font-mono);
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.15em;
  color: var(--docs-green);
  margin: 0 0 16px;
  padding: 0 12px;
}

.docs-sidebar-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.docs-sidebar-link {
  display: block;
  padding: 8px 12px;
  font-family: var(--docs-font-mono);
  font-size: 13px;
  font-weight: 500;
  color: var(--docs-text-secondary);
  text-decoration: none;
  border-left: 3px solid transparent;
  transition: color 0.15s ease, border-color 0.15s ease, background 0.15s ease;
}

.docs-sidebar-link:hover {
  color: var(--docs-text);
  background: var(--docs-green-dim);
}

.docs-sidebar-link.docs-active {
  color: var(--docs-text);
  font-weight: 700;
  border-left-color: var(--docs-green);
  background: var(--docs-green-dim);
}

/* ========== MOBILE NAV TOGGLE ========== */
.docs-mobile-nav-toggle {
  display: none;
  position: fixed;
  bottom: 24px;
  right: 24px;
  z-index: 200;
  width: 56px;
  height: 56px;
  background: var(--docs-green);
  border: 3px solid var(--docs-border);
  color: #000;
  font-size: 24px;
  font-weight: 700;
  cursor: pointer;
  box-shadow: var(--docs-shadow);
  align-items: center;
  justify-content: center;
  font-family: var(--docs-font-mono);
}

/* ========== MOBILE SIDEBAR OVERLAY ========== */
.docs-mobile-sidebar {
  display: none;
}

/* ========== MAIN CONTENT ========== */
.docs-content {
  flex: 1;
  min-width: 0;
  padding: 48px 48px 96px;
  max-width: 860px;
}

/* ========== SECTIONS ========== */
.docs-section {
  margin-bottom: 64px;
  scroll-margin-top: 80px;
}

.docs-section:last-child {
  margin-bottom: 0;
}

.docs-section-title {
  font-family: var(--docs-font-mono);
  font-size: 28px;
  font-weight: 700;
  line-height: 1.15;
  letter-spacing: -0.03em;
  margin: 0 0 8px;
  padding-bottom: 12px;
  border-bottom: 3px solid var(--docs-border);
}

.docs-h3 {
  font-family: var(--docs-font-mono);
  font-size: 18px;
  font-weight: 700;
  line-height: 1.3;
  letter-spacing: -0.02em;
  margin: 40px 0 12px;
  color: var(--docs-text);
}

.docs-h4 {
  font-family: var(--docs-font-mono);
  font-size: 14px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin: 28px 0 8px;
  color: var(--docs-green);
}

.docs-p {
  font-size: 15px;
  line-height: 1.75;
  color: var(--docs-text-secondary);
  margin: 0 0 16px;
  max-width: 640px;
}

.docs-p strong {
  color: var(--docs-text);
  font-weight: 700;
}

.docs-ul {
  margin: 0 0 16px;
  padding: 0 0 0 20px;
  list-style: none;
}

.docs-ul li {
  position: relative;
  padding: 4px 0 4px 0;
  font-size: 15px;
  line-height: 1.65;
  color: var(--docs-text-secondary);
}

.docs-ul li::before {
  content: '>';
  position: absolute;
  left: -18px;
  color: var(--docs-green);
  font-family: var(--docs-font-mono);
  font-weight: 700;
  font-size: 14px;
}

.docs-ul li strong {
  color: var(--docs-text);
}

.docs-ol {
  margin: 0 0 16px;
  padding: 0 0 0 24px;
}

.docs-ol li {
  padding: 4px 0;
  font-size: 15px;
  line-height: 1.65;
  color: var(--docs-text-secondary);
}

.docs-ol li strong {
  color: var(--docs-text);
}

/* ========== INLINE CODE ========== */
.docs-code {
  font-family: var(--docs-font-mono);
  font-size: 13px;
  background: var(--docs-green-dim);
  color: var(--docs-green);
  padding: 2px 6px;
  border: 1px solid var(--docs-border-light);
  font-weight: 700;
}

/* ========== TERMINAL ========== */
.docs-terminal {
  background: var(--docs-terminal-bg);
  border: 3px solid var(--docs-border);
  box-shadow: var(--docs-shadow);
  overflow: hidden;
  margin: 16px 0 24px;
}

.docs-terminal-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  background: #1a1a1a;
  border-bottom: 2px solid #333;
}

.docs-terminal-dot {
  width: 12px;
  height: 12px;
  border: 2px solid #555;
}

.docs-terminal-dot:nth-child(1) { background: #ff5f57; border-color: #cc4c40; }
.docs-terminal-dot:nth-child(2) { background: #febc2e; border-color: #cb9625; }
.docs-terminal-dot:nth-child(3) { background: #28c840; border-color: #20a033; }

.docs-terminal-title {
  flex: 1;
  text-align: center;
  font-family: var(--docs-font-mono);
  font-size: 12px;
  color: #666;
}

.docs-terminal-body {
  padding: 20px;
  font-family: var(--docs-font-mono);
  font-size: 13px;
  line-height: 1.7;
  color: var(--docs-terminal-text);
  overflow-x: auto;
}

.docs-green { color: var(--docs-terminal-green); }
.docs-yellow { color: var(--docs-terminal-yellow); }
.docs-blue { color: var(--docs-terminal-blue); }
.docs-red { color: var(--docs-terminal-red); }
.docs-dim { color: var(--docs-terminal-dim); }
.docs-white { color: #ffffff; }
.docs-bold { font-weight: 700; }

/* ========== INFO BLOCK ========== */
.docs-info {
  border: 3px solid var(--docs-green);
  background: var(--docs-green-dim);
  padding: 16px 20px;
  margin: 16px 0 24px;
}

.docs-info-label {
  font-family: var(--docs-font-mono);
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--docs-green);
  margin: 0 0 6px;
}

.docs-info p {
  font-size: 14px;
  line-height: 1.6;
  color: var(--docs-text-secondary);
  margin: 0;
}

.docs-info p strong {
  color: var(--docs-text);
}

/* ========== WARN BLOCK ========== */
.docs-warn {
  border: 3px solid var(--docs-terminal-yellow);
  background: rgba(251, 191, 36, 0.08);
  padding: 16px 20px;
  margin: 16px 0 24px;
}

.docs-warn-label {
  font-family: var(--docs-font-mono);
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--docs-terminal-yellow);
  margin: 0 0 6px;
}

.docs-warn p {
  font-size: 14px;
  line-height: 1.6;
  color: var(--docs-text-secondary);
  margin: 0;
}

.docs-warn p strong {
  color: var(--docs-text);
}

/* ========== TABLE ========== */
.docs-table-wrap {
  overflow-x: auto;
  margin: 16px 0 24px;
  border: 3px solid var(--docs-border);
}

.docs-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 14px;
}

.docs-table th {
  text-align: left;
  padding: 10px 16px;
  font-family: var(--docs-font-mono);
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--docs-green);
  background: var(--docs-bg-alt);
  border-bottom: 3px solid var(--docs-border);
}

.docs-table td {
  padding: 10px 16px;
  border-bottom: 1px solid var(--docs-border-light);
  color: var(--docs-text-secondary);
  vertical-align: top;
}

.docs-table tr:last-child td {
  border-bottom: none;
}

.docs-table td:first-child {
  font-family: var(--docs-font-mono);
  font-size: 13px;
  font-weight: 700;
  color: var(--docs-text);
  white-space: nowrap;
}

/* ========== STEPS ========== */
.docs-steps {
  margin: 16px 0 24px;
  display: flex;
  flex-direction: column;
  gap: 0;
}

.docs-step {
  display: flex;
  gap: 16px;
  padding: 16px 0;
  border-bottom: 1px solid var(--docs-border-light);
}

.docs-step:last-child {
  border-bottom: none;
}

.docs-step-num {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  min-width: 36px;
  background: var(--docs-green);
  border: 3px solid var(--docs-border);
  font-family: var(--docs-font-mono);
  font-weight: 700;
  font-size: 14px;
  color: #000;
}

.docs-step-content {
  flex: 1;
  min-width: 0;
}

.docs-step-title {
  font-family: var(--docs-font-mono);
  font-size: 14px;
  font-weight: 700;
  color: var(--docs-text);
  margin: 0 0 4px;
}

.docs-step-desc {
  font-size: 14px;
  line-height: 1.6;
  color: var(--docs-text-secondary);
  margin: 0;
}

/* ========== COMMAND BLOCK ========== */
.docs-cmd-block {
  margin: 24px 0 32px;
  border: 3px solid var(--docs-border);
  background: var(--docs-surface);
}

.docs-cmd-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  border-bottom: 3px solid var(--docs-border);
  background: var(--docs-bg-alt);
}

.docs-cmd-name {
  font-family: var(--docs-font-mono);
  font-size: 14px;
  font-weight: 700;
  color: var(--docs-green);
}

.docs-cmd-usage {
  font-family: var(--docs-font-mono);
  font-size: 12px;
  color: var(--docs-text-secondary);
}

.docs-cmd-body {
  padding: 16px;
}

.docs-cmd-desc {
  font-size: 14px;
  line-height: 1.6;
  color: var(--docs-text-secondary);
  margin: 0 0 12px;
}

/* ========== JSON BLOCK ========== */
.docs-json {
  background: var(--docs-terminal-bg);
  border: 3px solid var(--docs-border);
  padding: 20px;
  font-family: var(--docs-font-mono);
  font-size: 13px;
  line-height: 1.7;
  color: var(--docs-terminal-text);
  overflow-x: auto;
  margin: 16px 0 24px;
  white-space: pre;
}

.docs-json .docs-json-key { color: var(--docs-terminal-blue); }
.docs-json .docs-json-str { color: var(--docs-terminal-green); }
.docs-json .docs-json-brace { color: var(--docs-terminal-dim); }

/* ========== FOOTER ========== */
.docs-footer {
  border-top: 3px solid var(--docs-border);
  padding: 32px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-family: var(--docs-font-mono);
  font-size: 12px;
  color: var(--docs-text-secondary);
  background: var(--docs-bg);
  flex-wrap: wrap;
  gap: 16px;
}

.docs-footer-links {
  display: flex;
  gap: 24px;
}

.docs-footer-links a {
  color: var(--docs-text-secondary);
  text-decoration: none;
  transition: color 0.15s ease;
}

.docs-footer-links a:hover {
  color: var(--docs-green);
}

/* ========== RESPONSIVE ========== */
@media (max-width: 900px) {
  .docs-sidebar {
    display: none;
  }

  .docs-mobile-nav-toggle {
    display: flex;
  }

  .docs-mobile-sidebar {
    display: block;
    position: fixed;
    inset: 0;
    z-index: 150;
    background: rgba(0, 0, 0, 0.6);
  }

  .docs-mobile-sidebar-inner {
    position: absolute;
    left: 0;
    top: 0;
    bottom: 0;
    width: 280px;
    background: var(--docs-bg);
    border-right: 3px solid var(--docs-border);
    padding: 24px 0;
    overflow-y: auto;
  }

  .docs-content {
    padding: 32px 24px 96px;
  }

  .docs-nav {
    padding: 0 16px;
  }

  .docs-section-title {
    font-size: 22px;
  }

  .docs-h3 {
    font-size: 16px;
  }

  .docs-terminal-body {
    font-size: 11px;
    padding: 16px;
  }
}

@media (max-width: 480px) {
  .docs-content {
    padding: 24px 16px 96px;
  }

  .docs-nav-link {
    display: none;
  }

  .docs-section-title {
    font-size: 20px;
  }

  .docs-cmd-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 4px;
  }
}

/* ========== SCROLL BEHAVIOR ========== */
html {
  scroll-behavior: smooth;
}

@media (prefers-reduced-motion: reduce) {
  html {
    scroll-behavior: auto;
  }
}
`,
        }}
      />

      {/* ===== NAV ===== */}
      <nav className="docs-nav">
        <Link href="/" className="docs-nav-left">
          <div className="docs-logo-box">TG</div>
          <span className="docs-logo-text">tokengate.dev</span>
        </Link>
        <div className="docs-nav-right">
          <button
            className="docs-theme-toggle"
            onClick={() => setDark(!dark)}
            aria-label="Toggle dark mode"
          >
            {dark ? "\u2600" : "\u263E"}
          </button>
          <Link href="/" className="docs-nav-link">
            Home
          </Link>
        </div>
      </nav>

      {/* ===== LAYOUT ===== */}
      <div className="docs-layout">
        {/* SIDEBAR */}
        <aside className="docs-sidebar">
          <p className="docs-sidebar-label">Documentation</p>
          <ul className="docs-sidebar-list">
            {sections.map((s) => (
              <li key={s.id}>
                <a
                  href={`#${s.id}`}
                  className={`docs-sidebar-link${activeSection === s.id ? " docs-active" : ""}`}
                >
                  {s.label}
                </a>
              </li>
            ))}
          </ul>
        </aside>

        {/* MAIN */}
        <main className="docs-content">
          {/* ===================================================
              GETTING STARTED
              =================================================== */}
          <section id="getting-started" className="docs-section">
            <h2 className="docs-section-title">Getting Started</h2>

            <h3 className="docs-h3">What is Tokengate?</h3>
            <p className="docs-p">
              Tokengate is an <strong>end-to-end encrypted environment variable manager</strong> for
              development teams. It replaces insecure practices like sharing{" "}
              <code className="docs-code">.env</code> files over Slack, email, or password managers
              with a purpose-built CLI and web dashboard.
            </p>
            <p className="docs-p">
              Every environment has its own encryption password. Secrets are encrypted on your machine
              before they ever leave it. The Tokengate server stores only ciphertext and can never
              read your plaintext values. This is true zero-knowledge architecture.
            </p>

            <h3 className="docs-h3">How It Works</h3>
            <p className="docs-p">
              Tokengate uses a layered encryption model built on Web Crypto API standards:
            </p>
            <ul className="docs-ul">
              <li>
                Each workspace has a <strong>workspace key</strong> (AES-256) generated at creation time
              </li>
              <li>
                The workspace key is <strong>wrapped per-device</strong> using RSA-OAEP 2048-bit key pairs
              </li>
              <li>
                Revision data is encrypted with a random <strong>per-revision data key</strong> (AES-256-GCM)
              </li>
              <li>
                Each data key is <strong>wrapped by the workspace key</strong> using AES-KW
              </li>
              <li>
                Content integrity is verified with <strong>SHA-256 content hashes</strong>
              </li>
            </ul>
            <p className="docs-p">
              The result: your secrets are encrypted client-side, transmitted as ciphertext, and stored
              as ciphertext. Only devices with the workspace key can decrypt them.
            </p>

            <h3 className="docs-h3">Quick Start</h3>
            <div className="docs-steps">
              <div className="docs-step">
                <div className="docs-step-num">1</div>
                <div className="docs-step-content">
                  <p className="docs-step-title">Install the CLI</p>
                  <p className="docs-step-desc">
                    Install globally with Bun or npm. The CLI requires the Bun runtime.
                  </p>
                </div>
              </div>
              <div className="docs-step">
                <div className="docs-step-num">2</div>
                <div className="docs-step-content">
                  <p className="docs-step-title">Sign in with your browser</p>
                  <p className="docs-step-desc">
                    Run <code className="docs-code">tokengate login</code> to authenticate via the
                    web dashboard. A device key pair is generated locally and registered with your
                    account.
                  </p>
                </div>
              </div>
              <div className="docs-step">
                <div className="docs-step-num">3</div>
                <div className="docs-step-content">
                  <p className="docs-step-title">Initialize your project</p>
                  <p className="docs-step-desc">
                    Run <code className="docs-code">tokengate init</code> in your project directory.
                    The wizard scans for <code className="docs-code">.env</code> files, lets you
                    select a workspace and project, and maps each file to a remote environment.
                  </p>
                </div>
              </div>
              <div className="docs-step">
                <div className="docs-step-num">4</div>
                <div className="docs-step-content">
                  <p className="docs-step-title">Push and pull</p>
                  <p className="docs-step-desc">
                    Use <code className="docs-code">tokengate push</code> to encrypt and upload
                    your local files, or <code className="docs-code">tokengate pull</code> to
                    download and decrypt the latest revision from your team.
                  </p>
                </div>
              </div>
            </div>

            <Terminal title="quick start">
              <Line prompt cmd>bun add -g @tokengate/cli</Line>
              <Line prompt cmd>tokengate login</Line>
              <div><G>{">"}</G> <W>Opening browser for authentication...</W></div>
              <div><G>{"✔"}</G> <W>Signed in as </W><G>sarah@acme.dev</G></div>
              <br />
              <Line prompt cmd>tokengate init</Line>
              <div><D>{"◆"}</D> <W>Scanning for .env files...</W></div>
              <div><D>{"│"}</D> <D>Found: </D><W>.env</W><D>, </D><W>.env.local</W><D>, </D><W>.env.production</W></div>
              <div><G>{"✔"}</G> <W>Project linked to </W><G>acme-corp / web-app</G></div>
              <br />
              <Line prompt cmd>tokengate push</Line>
              <div><G>{"✔"}</G> <W>.env </W><D>{"→"}</D> <G>rev #1</G></div>
              <div><G>{"✔"}</G> <W>.env.local </W><D>{"→"}</D> <G>rev #1</G></div>
              <div><G>{"✔"}</G> <W>.env.production </W><D>{"→"}</D> <G>rev #1</G></div>
            </Terminal>
          </section>

          {/* ===================================================
              INSTALLATION
              =================================================== */}
          <section id="installation" className="docs-section">
            <h2 className="docs-section-title">Installation</h2>

            <p className="docs-p">
              The Tokengate CLI is distributed as an npm package. Install it globally so the{" "}
              <code className="docs-code">tokengate</code> command is available everywhere.
            </p>

            <h4 className="docs-h4">With Bun (recommended)</h4>
            <Terminal title="install">
              <Line prompt cmd>bun add -g @tokengate/cli</Line>
            </Terminal>

            <h4 className="docs-h4">With npm</h4>
            <Terminal title="install">
              <Line prompt cmd>npm install -g @tokengate/cli</Line>
            </Terminal>

            <div className="docs-warn">
              <p className="docs-warn-label">Bun Required</p>
              <p>
                The Tokengate CLI requires the <strong>Bun runtime</strong> to be installed on your
                system. Bun provides the native crypto APIs and fast startup time the CLI depends on.
                Install Bun at <strong>bun.sh</strong> if you do not already have it.
              </p>
            </div>

            <h4 className="docs-h4">Verify Installation</h4>
            <Terminal title="verify">
              <Line prompt cmd>tokengate help</Line>
              <br />
              <div><G><Bold>tokengate</Bold></G> <D>- encrypted env sync</D></div>
              <br />
              <div><W><Bold>Commands:</Bold></W></div>
              <div>  <G>tokengate</G>          <D>Smart mode (interactive menu)</D></div>
              <div>  <G>login</G> <D>[label]</D>     <D>Authenticate this device</D></div>
              <div>  <G>logout</G>             <D>Clear stored credentials</D></div>
              <div>  <G>init</G>               <D>Initialize project in current directory</D></div>
              <div>  <G>status</G>             <D>Show sync status for mapped files</D></div>
              <div>  <G>push</G>               <D>Encrypt and upload changed files</D></div>
              <div>  <G>pull</G>               <D>Download and decrypt remote changes</D></div>
              <div>  <G>history</G>            <D>Show revision history</D></div>
              <div>  <G>workspaces</G>         <D>List accessible workspaces</D></div>
              <div>  <G>help</G>               <D>Show this help message</D></div>
            </Terminal>
          </section>

          {/* ===================================================
              CLI COMMANDS
              =================================================== */}
          <section id="cli-commands" className="docs-section">
            <h2 className="docs-section-title">CLI Commands</h2>

            {/* tokengate (smart mode) */}
            <div className="docs-cmd-block">
              <div className="docs-cmd-header">
                <span className="docs-cmd-name">tokengate</span>
                <span className="docs-cmd-usage">Smart Mode</span>
              </div>
              <div className="docs-cmd-body">
                <p className="docs-cmd-desc">
                  Running <code className="docs-code">tokengate</code> with no arguments enters
                  smart mode. If you are not signed in or the current directory has no project
                  configuration, it launches the guided setup wizard. If the project is already
                  configured, it presents an interactive menu to push, pull, view history, or check
                  status.
                </p>
                <Terminal title="tokengate">
                  <Line prompt cmd>tokengate</Line>
                  <br />
                  <div><G><Bold> tokengate </Bold></G> <D>web-app</D></div>
                  <br />
                  <div><D>{"?"}</D> <W><Bold>What do you want to do?</Bold></W></div>
                  <div><G>  {">"} Push env files to remote</G></div>
                  <div><D>    Pull env files from remote</D></div>
                  <div><D>    View revision history</D></div>
                  <div><D>    Show status</D></div>
                  <div><D>    Re-initialize / change project</D></div>
                </Terminal>
              </div>
            </div>

            {/* tokengate login */}
            <div className="docs-cmd-block">
              <div className="docs-cmd-header">
                <span className="docs-cmd-name">tokengate login [label]</span>
                <span className="docs-cmd-usage">Authenticate Device</span>
              </div>
              <div className="docs-cmd-body">
                <p className="docs-cmd-desc">
                  Authenticates the current device by opening your browser to the Tokengate web
                  dashboard. A unique RSA-OAEP 2048-bit key pair is generated locally for this
                  device. The public key is registered with your account while the private key stays
                  on your machine. The optional <code className="docs-code">[label]</code> argument
                  sets a human-readable name for the device (defaults to your hostname).
                </p>
                <Terminal title="login">
                  <Line prompt cmd>tokengate login macbook-pro</Line>
                  <br />
                  <div><G><Bold> tokengate </Bold></G> <D>device login</D></div>
                  <br />
                  <div><D>{"◆"}</D> <W>Opening browser for authentication...</W></div>
                  <div><D>{"│"}</D> <D>If the browser does not open, visit:</D></div>
                  <div><D>{"│"}</D> <B>https://tokengate.dev/cli/auth?state=...</B></div>
                  <br />
                  <div><D>{"◆"}</D> <W>Waiting for authorization...</W></div>
                  <br />
                  <div><G>{"✔"}</G> <W>Device registered as </W><G>macbook-pro</G></div>
                  <div><G>{"✔"}</G> <W>Signed in as </W><G>sarah@acme.dev</G></div>
                  <div><D>{"│"}</D></div>
                  <div><D>{"└"}</D> <D>Run </D><W><Bold>tokengate init</Bold></W><D> to set up a project.</D></div>
                </Terminal>
              </div>
            </div>

            {/* tokengate logout */}
            <div className="docs-cmd-block">
              <div className="docs-cmd-header">
                <span className="docs-cmd-name">tokengate logout</span>
                <span className="docs-cmd-usage">Clear Credentials</span>
              </div>
              <div className="docs-cmd-body">
                <p className="docs-cmd-desc">
                  Removes all stored credentials from the current device, including the access token,
                  device key pair, and cached workspace keys. This does not affect your account or
                  other devices. After logging out, run{" "}
                  <code className="docs-code">tokengate login</code> to re-authenticate.
                </p>
                <Terminal title="logout">
                  <Line prompt cmd>tokengate logout</Line>
                  <br />
                  <div><G>{"✔"}</G> <W>Credentials cleared.</W></div>
                  <div><D>{"│"}</D> <D>Run </D><W><Bold>tokengate login</Bold></W><D> to sign in again.</D></div>
                </Terminal>
              </div>
            </div>

            {/* tokengate init */}
            <div className="docs-cmd-block">
              <div className="docs-cmd-header">
                <span className="docs-cmd-name">tokengate init</span>
                <span className="docs-cmd-usage">Initialize Project</span>
              </div>
              <div className="docs-cmd-body">
                <p className="docs-cmd-desc">
                  Initializes the current directory as a Tokengate project. The wizard scans for all{" "}
                  <code className="docs-code">.env</code> files in the working directory, prompts
                  you to select a workspace and project (or create new ones), then maps each
                  discovered file to a remote environment. A{" "}
                  <code className="docs-code">.tokengate.json</code> config file is created to store
                  the mappings.
                </p>
                <Terminal title="init">
                  <Line prompt cmd>tokengate init</Line>
                  <br />
                  <div><G><Bold> tokengate </Bold></G> <D>project setup</D></div>
                  <br />
                  <div><D>{"◆"}</D> <W>Scanning for .env files...</W></div>
                  <div><D>{"│"}</D> <D>Found: </D><W>.env</W><D>, </D><W>.env.local</W><D>, </D><W>.env.production</W></div>
                  <br />
                  <div><D>{"?"}</D> <W><Bold>Select workspace</Bold></W></div>
                  <div><G>  {">"} acme-corp</G></div>
                  <div><D>    personal-projects</D></div>
                  <div><D>    + Create new workspace</D></div>
                  <br />
                  <div><D>{"?"}</D> <W><Bold>Select project</Bold></W></div>
                  <div><G>  {">"} web-app</G></div>
                  <div><D>    api-server</D></div>
                  <div><D>    + Create new project</D></div>
                  <br />
                  <div><D>{"?"}</D> <W><Bold>Map .env to environment</Bold></W></div>
                  <div><G>  {">"} default</G></div>
                  <br />
                  <div><D>{"?"}</D> <W><Bold>Map .env.local to environment</Bold></W></div>
                  <div><G>  {">"} local</G></div>
                  <br />
                  <div><D>{"?"}</D> <W><Bold>Map .env.production to environment</Bold></W></div>
                  <div><G>  {">"} production</G></div>
                  <br />
                  <div><G>{"✔"}</G> <W>Project linked to </W><G>acme-corp / web-app</G></div>
                  <div><G>{"✔"}</G> <W>Config written to </W><G>.tokengate.json</G></div>
                </Terminal>
              </div>
            </div>

            {/* tokengate status */}
            <div className="docs-cmd-block">
              <div className="docs-cmd-header">
                <span className="docs-cmd-name">tokengate status</span>
                <span className="docs-cmd-usage">Sync Status</span>
              </div>
              <div className="docs-cmd-body">
                <p className="docs-cmd-desc">
                  Displays the current sync status for all mapped{" "}
                  <code className="docs-code">.env</code> files. Shows which files are in sync with
                  the remote, which have local changes pending push, and which have remote updates
                  available to pull. Status is determined by comparing SHA-256 content hashes.
                </p>
                <Terminal title="status">
                  <Line prompt cmd>tokengate status</Line>
                  <br />
                  <div><G><Bold> tokengate </Bold></G> <D>web-app</D></div>
                  <br />
                  <div><W><Bold>  File              Environment    Status</Bold></W></div>
                  <div><D>  {"──────────────────────────────────────────"}</D></div>
                  <div>  <G>{"✓"}</G> <W>.env             </W><D>default        </D><G>synced</G></div>
                  <div>  <Y>{"~"}</Y> <W>.env.local       </W><D>local          </D><Y>local changes</Y></div>
                  <div>  <G>{"✓"}</G> <W>.env.production  </W><D>production     </D><G>synced</G></div>
                </Terminal>
              </div>
            </div>

            {/* tokengate push */}
            <div className="docs-cmd-block">
              <div className="docs-cmd-header">
                <span className="docs-cmd-name">tokengate push</span>
                <span className="docs-cmd-usage">Encrypt & Upload</span>
              </div>
              <div className="docs-cmd-body">
                <p className="docs-cmd-desc">
                  Scans all mapped <code className="docs-code">.env</code> files, identifies which
                  have changed since the last sync (via content hash comparison), and uploads the
                  changed files. Each file is encrypted client-side with the workspace key before
                  transmission. A new revision is created for each pushed file.
                </p>
                <Terminal title="push">
                  <Line prompt cmd>tokengate push</Line>
                  <br />
                  <div><D>Scanning .env files...</D></div>
                  <br />
                  <div><W><Bold>  File              Status</Bold></W></div>
                  <div><D>  {"─────────────────────────"}</D></div>
                  <div>  <G>{"✓"}</G> <W>.env            </W><D>synced</D></div>
                  <div>  <Y>{"~"}</Y> <W>.env.local      </W><Y>changed</Y></div>
                  <div>  <B>{"+"}</B> <W>.env.staging    </W><B>new</B></div>
                  <br />
                  <div><D>{"?"}</D> <W>Push 2 files? </W><G>Yes</G></div>
                  <br />
                  <div><D>Encrypting...</D></div>
                  <div><G>{"✔"}</G> <W>.env.local </W><D>{"→"}</D> <G>rev #3</G></div>
                  <div><G>{"✔"}</G> <W>.env.staging </W><D>{"→"}</D> <G>rev #1</G></div>
                </Terminal>
              </div>
            </div>

            {/* tokengate pull */}
            <div className="docs-cmd-block">
              <div className="docs-cmd-header">
                <span className="docs-cmd-name">tokengate pull</span>
                <span className="docs-cmd-usage">Download & Decrypt</span>
              </div>
              <div className="docs-cmd-body">
                <p className="docs-cmd-desc">
                  Checks the remote for each mapped environment, compares content hashes, and
                  downloads any files where the remote has a newer revision. Files are decrypted
                  client-side using the workspace key and written to disk, overwriting the local
                  version.
                </p>
                <Terminal title="pull">
                  <Line prompt cmd>tokengate pull</Line>
                  <br />
                  <div><D>Checking remote...</D></div>
                  <br />
                  <div><W><Bold>  File              Status</Bold></W></div>
                  <div><D>  {"─────────────────────────"}</D></div>
                  <div>  <Y>{"↓"}</Y> <W>.env            </W><Y>remote updated</Y></div>
                  <div>  <G>{"✓"}</G> <W>.env.local      </W><D>synced</D></div>
                  <div>  <Y>{"↓"}</Y> <W>.env.production </W><Y>remote updated</Y></div>
                  <br />
                  <div><D>Decrypting...</D></div>
                  <div><G>{"✔"}</G> <W>.env </W><D>{"←"}</D> <D>rev #5</D></div>
                  <div><G>{"✔"}</G> <W>.env.production </W><D>{"←"}</D> <D>rev #8</D></div>
                  <br />
                  <div><G><Bold>All files up to date.</Bold></G></div>
                </Terminal>
              </div>
            </div>

            {/* tokengate history */}
            <div className="docs-cmd-block">
              <div className="docs-cmd-header">
                <span className="docs-cmd-name">tokengate history</span>
                <span className="docs-cmd-usage">Revision History</span>
              </div>
              <div className="docs-cmd-body">
                <p className="docs-cmd-desc">
                  Shows the revision history for each environment mapped in the current project.
                  Displays the revision number, timestamp, content hash, and which user pushed each
                  revision. Useful for auditing changes and understanding when secrets were last
                  updated.
                </p>
                <Terminal title="history">
                  <Line prompt cmd>tokengate history</Line>
                  <br />
                  <div><W><Bold>  production {"—"} 4 revisions</Bold></W></div>
                  <br />
                  <div>  <G>#4</G> <D>2025-03-10 14:32  </D><W>a3f8c1d  </W><B>sarah</B></div>
                  <div>  <D>#3</D> <D>2025-03-09 11:18  </D><W>b7e2f4a  </W><B>alex</B></div>
                  <div>  <D>#2</D> <D>2025-03-07 16:45  </D><W>c1d9e3b  </W><B>sarah</B></div>
                  <div>  <D>#1</D> <D>2025-03-05 10:00  </D><W>d4a6f8c  </W><B>james</B></div>
                </Terminal>
              </div>
            </div>

            {/* tokengate workspaces */}
            <div className="docs-cmd-block">
              <div className="docs-cmd-header">
                <span className="docs-cmd-name">tokengate workspaces</span>
                <span className="docs-cmd-usage">List Workspaces</span>
              </div>
              <div className="docs-cmd-body">
                <p className="docs-cmd-desc">
                  Lists all workspaces your account has access to, including your role in each
                  workspace (owner or member). Useful for verifying which workspaces are available
                  before running <code className="docs-code">tokengate init</code>.
                </p>
                <Terminal title="workspaces">
                  <Line prompt cmd>tokengate workspaces</Line>
                  <br />
                  <div><W><Bold>  Your workspaces:</Bold></W></div>
                  <br />
                  <div>  <G>{">"}</G> <W>acme-corp       </W><D>owner</D></div>
                  <div>    <W>personal        </W><D>owner</D></div>
                  <div>    <W>freelance-2025  </W><D>member</D></div>
                </Terminal>
              </div>
            </div>
          </section>

          {/* ===================================================
              CONFIGURATION
              =================================================== */}
          <section id="configuration" className="docs-section">
            <h2 className="docs-section-title">Configuration</h2>

            <p className="docs-p">
              Tokengate uses two configuration files: a <strong>project config</strong> in your
              repository and a <strong>global config</strong> on your machine.
            </p>

            <h3 className="docs-h3">.tokengate.json (Project Config)</h3>
            <p className="docs-p">
              Created by <code className="docs-code">tokengate init</code> in the root of your
              project directory. This file should be committed to version control so all team members
              share the same project and environment mappings. It does not contain any secrets.
            </p>

            <div className="docs-json">
              <span className="docs-json-brace">{"{"}</span>{"\n"}
              {"  "}<span className="docs-json-key">"workspaceId"</span>: <span className="docs-json-str">"k57abc123def..."</span>,{"\n"}
              {"  "}<span className="docs-json-key">"workspaceName"</span>: <span className="docs-json-str">"acme-corp"</span>,{"\n"}
              {"  "}<span className="docs-json-key">"projectId"</span>: <span className="docs-json-str">"k57xyz789ghi..."</span>,{"\n"}
              {"  "}<span className="docs-json-key">"projectName"</span>: <span className="docs-json-str">"web-app"</span>,{"\n"}
              {"  "}<span className="docs-json-key">"mappings"</span>: <span className="docs-json-brace">{"{"}</span>{"\n"}
              {"    "}<span className="docs-json-key">".env"</span>: <span className="docs-json-brace">{"{"}</span>{"\n"}
              {"      "}<span className="docs-json-key">"secretSetId"</span>: <span className="docs-json-str">"k57..."</span>,{"\n"}
              {"      "}<span className="docs-json-key">"environmentId"</span>: <span className="docs-json-str">"k57..."</span>,{"\n"}
              {"      "}<span className="docs-json-key">"environmentName"</span>: <span className="docs-json-str">"default"</span>{"\n"}
              {"    "}<span className="docs-json-brace">{"}"}</span>,{"\n"}
              {"    "}<span className="docs-json-key">".env.local"</span>: <span className="docs-json-brace">{"{"}</span>{"\n"}
              {"      "}<span className="docs-json-key">"secretSetId"</span>: <span className="docs-json-str">"k57..."</span>,{"\n"}
              {"      "}<span className="docs-json-key">"environmentId"</span>: <span className="docs-json-str">"k57..."</span>,{"\n"}
              {"      "}<span className="docs-json-key">"environmentName"</span>: <span className="docs-json-str">"local"</span>{"\n"}
              {"    "}<span className="docs-json-brace">{"}"}</span>,{"\n"}
              {"    "}<span className="docs-json-key">".env.production"</span>: <span className="docs-json-brace">{"{"}</span>{"\n"}
              {"      "}<span className="docs-json-key">"secretSetId"</span>: <span className="docs-json-str">"k57..."</span>,{"\n"}
              {"      "}<span className="docs-json-key">"environmentId"</span>: <span className="docs-json-str">"k57..."</span>,{"\n"}
              {"      "}<span className="docs-json-key">"environmentName"</span>: <span className="docs-json-str">"production"</span>{"\n"}
              {"    "}<span className="docs-json-brace">{"}"}</span>{"\n"}
              {"  "}<span className="docs-json-brace">{"}"}</span>{"\n"}
              <span className="docs-json-brace">{"}"}</span>
            </div>

            <div className="docs-table-wrap">
              <table className="docs-table">
                <thead>
                  <tr>
                    <th>Field</th>
                    <th>Description</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>workspaceId</td>
                    <td>The Convex document ID of the workspace this project belongs to</td>
                  </tr>
                  <tr>
                    <td>workspaceName</td>
                    <td>Human-readable workspace name for display in CLI output</td>
                  </tr>
                  <tr>
                    <td>projectId</td>
                    <td>The Convex document ID of the project</td>
                  </tr>
                  <tr>
                    <td>projectName</td>
                    <td>Human-readable project name for display in CLI output</td>
                  </tr>
                  <tr>
                    <td>mappings</td>
                    <td>
                      Object mapping local filenames to their remote environment. Each entry
                      contains secretSetId, environmentId, and environmentName
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <h3 className="docs-h3">Global Config</h3>
            <p className="docs-p">
              Stored at <code className="docs-code">~/.config/tokengate/config.json</code> with
              file permissions <code className="docs-code">0600</code> (owner read/write only). This
              file contains your device credentials and should never be shared or committed to
              version control.
            </p>

            <div className="docs-table-wrap">
              <table className="docs-table">
                <thead>
                  <tr>
                    <th>Field</th>
                    <th>Description</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>version</td>
                    <td>Config schema version (currently 3)</td>
                  </tr>
                  <tr>
                    <td>appUrl</td>
                    <td>The Tokengate web app URL (default: https://tokengate.dev)</td>
                  </tr>
                  <tr>
                    <td>convexUrl</td>
                    <td>The Convex backend URL, obtained during login</td>
                  </tr>
                  <tr>
                    <td>deviceId</td>
                    <td>Unique identifier for this device</td>
                  </tr>
                  <tr>
                    <td>deviceLabel</td>
                    <td>Human-readable device name set during login</td>
                  </tr>
                  <tr>
                    <td>accessToken</td>
                    <td>Authentication token for API requests</td>
                  </tr>
                  <tr>
                    <td>privateKey</td>
                    <td>RSA-OAEP private key (JWK format) for unwrapping workspace keys</td>
                  </tr>
                  <tr>
                    <td>publicKey</td>
                    <td>RSA-OAEP public key (JWK format) registered with the server</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <h3 className="docs-h3">Environment Variables</h3>

            <div className="docs-table-wrap">
              <table className="docs-table">
                <thead>
                  <tr>
                    <th>Variable</th>
                    <th>Description</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>TOKENGATE_APP_URL</td>
                    <td>
                      Override the default Tokengate web app URL. Useful for self-hosted
                      deployments or local development. Defaults to{" "}
                      <code className="docs-code">https://tokengate.dev</code>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          {/* ===================================================
              MULTI-FILE SYNC
              =================================================== */}
          <section id="multi-file-sync" className="docs-section">
            <h2 className="docs-section-title">Multi-file Sync</h2>

            <p className="docs-p">
              Most projects use multiple <code className="docs-code">.env</code> files for different
              purposes: <code className="docs-code">.env</code> for shared defaults,{" "}
              <code className="docs-code">.env.local</code> for developer overrides,{" "}
              <code className="docs-code">.env.production</code> for production secrets. Tokengate
              handles all of them in a single workflow.
            </p>

            <h3 className="docs-h3">File Scanning</h3>
            <p className="docs-p">
              When you run <code className="docs-code">tokengate init</code> or{" "}
              <code className="docs-code">tokengate push</code>, the CLI scans the current
              working directory for files matching the pattern{" "}
              <code className="docs-code">{`.env`}</code> or{" "}
              <code className="docs-code">{`.env.*`}</code>. This includes files like:
            </p>
            <ul className="docs-ul">
              <li><code className="docs-code">.env</code> - default environment variables</li>
              <li><code className="docs-code">.env.local</code> - local developer overrides</li>
              <li><code className="docs-code">.env.development</code> - development-specific variables</li>
              <li><code className="docs-code">.env.staging</code> - staging environment variables</li>
              <li><code className="docs-code">.env.production</code> - production secrets</li>
              <li><code className="docs-code">.env.test</code> - test environment variables</li>
            </ul>
            <p className="docs-p">
              Any file in the working directory that matches the{" "}
              <code className="docs-code">{`/^\\.env(\\..+)?$/`}</code> regex pattern will be
              discovered. The scan is non-recursive and only checks the top-level directory.
            </p>

            <h3 className="docs-h3">Environment Mapping</h3>
            <p className="docs-p">
              During <code className="docs-code">tokengate init</code>, each discovered file is
              mapped to a remote environment within your project. A single environment can only be
              mapped to one local file. These mappings are stored in the{" "}
              <code className="docs-code">.tokengate.json</code> file and persist across push/pull
              operations.
            </p>
            <p className="docs-p">
              If you add a new <code className="docs-code">.env</code> file later, run{" "}
              <code className="docs-code">tokengate init</code> again to add the new mapping. Your
              existing mappings are preserved.
            </p>

            <h3 className="docs-h3">Change Detection</h3>
            <p className="docs-p">
              Tokengate uses <strong>SHA-256 content hashing</strong> to detect changes efficiently.
              When you push, the CLI computes a hash of each local file and compares it to the
              content hash stored on the remote revision. Only files with different hashes are
              uploaded, saving bandwidth and avoiding unnecessary revisions.
            </p>
            <p className="docs-p">
              The same mechanism works in reverse during pull: the CLI compares the remote content
              hash to a hash of your local file and only downloads files where the remote has
              changed.
            </p>

            <h3 className="docs-h3">Push/Pull Workflow</h3>
            <p className="docs-p">
              The typical workflow is straightforward:
            </p>
            <ol className="docs-ol">
              <li>Edit your local <code className="docs-code">.env</code> files as needed</li>
              <li>Run <code className="docs-code">tokengate push</code> to upload changes</li>
              <li>Team members run <code className="docs-code">tokengate pull</code> to get the latest</li>
              <li>Use <code className="docs-code">tokengate status</code> to check sync state at any time</li>
            </ol>

            <div className="docs-info">
              <p className="docs-info-label">File Selection</p>
              <p>
                Both push and pull show you a table of all mapped files with their current status
                before making any changes. Files that are already in sync are skipped automatically.
                Only files with actual changes are transmitted.
              </p>
            </div>
          </section>

          {/* ===================================================
              ENCRYPTION
              =================================================== */}
          <section id="encryption" className="docs-section">
            <h2 className="docs-section-title">Encryption</h2>

            <p className="docs-p">
              Tokengate implements a layered encryption architecture designed so the server
              never has access to plaintext secrets. All cryptographic operations use the{" "}
              <strong>Web Crypto API</strong>, a battle-tested standard available in all modern
              runtimes.
            </p>

            <h3 className="docs-h3">Workspace Key Model</h3>
            <p className="docs-p">
              Each workspace has a <strong>256-bit AES workspace key</strong> generated at
              creation time. This key is the root of the encryption hierarchy and never leaves
              client devices in plaintext. When a new device is registered, the workspace key is
              wrapped (encrypted) using the device's RSA-OAEP 2048-bit public key, and the
              wrapped copy is stored on the server.
            </p>
            <p className="docs-p">
              When the CLI needs the workspace key, it downloads the wrapped copy and unwraps it
              locally using the device's private key (which is stored only in{" "}
              <code className="docs-code">~/.config/tokengate/config.json</code>).
            </p>

            <h3 className="docs-h3">Per-Revision Encryption</h3>
            <p className="docs-p">
              Each time you push a revision, the following process occurs entirely on your machine:
            </p>
            <ol className="docs-ol">
              <li>A random <strong>256-bit data key</strong> is generated for this specific revision</li>
              <li>A random <strong>96-bit IV</strong> (initialization vector) is generated</li>
              <li>Your env file content is encrypted using <strong>AES-256-GCM</strong> with the data key and IV</li>
              <li>The data key is <strong>wrapped</strong> using the workspace key via <strong>AES-KW</strong> (Key Wrap)</li>
              <li>A <strong>SHA-256 content hash</strong> of the plaintext is computed for change detection</li>
              <li>The ciphertext, wrapped data key, and content hash are uploaded to the server</li>
            </ol>

            <div className="docs-info">
              <p className="docs-info-label">Why AES-KW?</p>
              <p>
                AES Key Wrap (RFC 3394) is specifically designed for wrapping cryptographic keys.
                It provides both confidentiality and integrity protection for the wrapped key
                material, ensuring the data key cannot be tampered with in transit or storage.
              </p>
            </div>

            <h3 className="docs-h3">Zero-Knowledge Architecture</h3>
            <p className="docs-p">
              The Tokengate server stores only:
            </p>
            <ul className="docs-ul">
              <li>Encrypted ciphertext (AES-256-GCM output)</li>
              <li>Wrapped data keys (AES-KW output, only useful with the workspace key)</li>
              <li>Content hashes (SHA-256 of plaintext, used for change detection only)</li>
              <li>Wrapped workspace keys (RSA-OAEP output, one per device)</li>
            </ul>
            <p className="docs-p">
              The server <strong>never sees</strong> your plaintext secrets, the workspace key in
              unwrapped form, or any per-revision data keys. Even with full database access, an
              attacker cannot decrypt your secrets without the RSA private key stored on an
              authorized device.
            </p>

            <h3 className="docs-h3">Recovery</h3>
            <p className="docs-p">
              When a workspace is created, a <strong>recovery phrase</strong> is generated from the
              raw workspace key using Base32 encoding. This phrase allows restoring workspace access
              if all devices are lost. Store it securely offline. The recovery phrase is shown once
              during workspace creation and cannot be retrieved again.
            </p>

            <div className="docs-warn">
              <p className="docs-warn-label">Important</p>
              <p>
                If you lose your recovery phrase <strong>and</strong> all authorized devices, your
                encrypted data is permanently unrecoverable. There is no backdoor. This is by design.
              </p>
            </div>
          </section>

          {/* ===================================================
              WEB DASHBOARD
              =================================================== */}
          <section id="web-dashboard" className="docs-section">
            <h2 className="docs-section-title">Web Dashboard</h2>

            <p className="docs-p">
              The Tokengate web dashboard at{" "}
              <strong>tokengate.dev/dashboard</strong> provides a visual interface for managing your
              workspaces, projects, environments, and secrets. It complements the CLI for tasks that
              benefit from a graphical UI.
            </p>

            <h3 className="docs-h3">Workspace / Project / Environment Hierarchy</h3>
            <p className="docs-p">
              Tokengate organizes secrets in a three-level hierarchy:
            </p>
            <ul className="docs-ul">
              <li>
                <strong>Workspace</strong> - the top-level container, typically one per organization
                or team. Each workspace has its own encryption key and member list.
              </li>
              <li>
                <strong>Project</strong> - a logical grouping within a workspace, usually mapping to
                a single code repository or service.
              </li>
              <li>
                <strong>Environment</strong> - a named set of secrets within a project, such as
                "default", "local", "staging", or "production". Each environment maps to one{" "}
                <code className="docs-code">.env</code> file.
              </li>
            </ul>

            <h3 className="docs-h3">Unlocking Environments</h3>
            <p className="docs-p">
              Environments are locked by default in the dashboard. To view or edit secrets, you must
              unlock the environment by providing the workspace credentials. The decryption happens
              entirely in your browser using the Web Crypto API. The plaintext is never sent to the
              server.
            </p>

            <h3 className="docs-h3">Key-Value Editor</h3>
            <p className="docs-p">
              Once unlocked, the dashboard presents a spreadsheet-style key-value editor where you
              can add, edit, or remove individual environment variables. Changes are encrypted and
              saved as a new revision when you click save. The editor highlights which keys have been
              modified since the last revision.
            </p>

            <h3 className="docs-h3">Revision History</h3>
            <p className="docs-p">
              Each environment maintains a complete revision history. You can view past revisions,
              see when they were created, and identify which team member pushed each change. This
              provides a full audit trail for secret changes across your team.
            </p>

            <div className="docs-info">
              <p className="docs-info-label">Browser Encryption</p>
              <p>
                The web dashboard performs all encryption and decryption in the browser using the
                same Web Crypto APIs as the CLI. Your plaintext secrets exist only in browser memory
                and are never transmitted to or stored on the server.
              </p>
            </div>
          </section>

          {/* ===================================================
              TEAM WORKFLOWS
              =================================================== */}
          <section id="team-workflows" className="docs-section">
            <h2 className="docs-section-title">Team Workflows</h2>

            <p className="docs-p">
              Tokengate is designed for teams. Multiple developers can push and pull secrets from the
              same project without stepping on each other's work.
            </p>

            <h3 className="docs-h3">Sharing Environments</h3>
            <p className="docs-p">
              To give a team member access to a project's secrets:
            </p>
            <ol className="docs-ol">
              <li>Add them to the workspace via the web dashboard</li>
              <li>They install the CLI and run <code className="docs-code">tokengate login</code> to register their device</li>
              <li>The workspace key is automatically wrapped for their device's public key</li>
              <li>They clone the repo (which includes <code className="docs-code">.tokengate.json</code>) and run <code className="docs-code">tokengate pull</code></li>
            </ol>
            <p className="docs-p">
              Because <code className="docs-code">.tokengate.json</code> is committed to version
              control, new team members automatically get the correct project and environment
              mappings. They only need to authenticate their device once.
            </p>

            <h3 className="docs-h3">Conflict Detection</h3>
            <p className="docs-p">
              Tokengate uses <strong>revision numbers</strong> to detect conflicts. Each environment
              has a monotonically increasing revision counter. When you push, the CLI sends the
              expected revision number. If another team member pushed in the meantime, the server
              rejects the push and you must pull first to get the latest changes.
            </p>
            <p className="docs-p">
              This optimistic concurrency model prevents accidental overwrites while keeping the
              workflow simple. In practice, environment variable changes are infrequent enough that
              conflicts are rare.
            </p>

            <Terminal title="conflict detection">
              <Line prompt cmd>tokengate push</Line>
              <br />
              <div><D>Scanning .env files...</D></div>
              <br />
              <div>  <Y>{"~"}</Y> <W>.env.production  </W><Y>changed</Y></div>
              <br />
              <div><D>{"?"}</D> <W>Push 1 file? </W><G>Yes</G></div>
              <br />
              <div><span className="docs-red">{"!"}</span> <W>.env.production </W><span className="docs-red">conflict - remote has newer revision</span></div>
              <div><D>{"│"}</D> <D>Run </D><W><Bold>tokengate pull</Bold></W><D> first to get the latest changes.</D></div>
            </Terminal>

            <h3 className="docs-h3">Recommended Team Setup</h3>
            <ol className="docs-ol">
              <li>
                <strong>One person creates the workspace</strong> via the web dashboard and saves the
                recovery phrase securely
              </li>
              <li>
                <strong>Add team members</strong> to the workspace through the dashboard
              </li>
              <li>
                <strong>Initialize the project</strong> with{" "}
                <code className="docs-code">tokengate init</code> and commit{" "}
                <code className="docs-code">.tokengate.json</code> to your repository
              </li>
              <li>
                <strong>Add <code className="docs-code">.env*</code> to .gitignore</strong> to
                prevent accidental commits of secret files
              </li>
              <li>
                <strong>Each developer</strong> runs{" "}
                <code className="docs-code">tokengate login</code> once, then{" "}
                <code className="docs-code">tokengate pull</code> after cloning the repo
              </li>
              <li>
                <strong>Push changes</strong> after updating secrets locally, and communicate
                significant changes to the team
              </li>
            </ol>

            <div className="docs-info">
              <p className="docs-info-label">Git Integration</p>
              <p>
                Make sure <code className="docs-code">.env*</code> patterns are in your{" "}
                <strong>.gitignore</strong> file. The{" "}
                <code className="docs-code">.tokengate.json</code> file should be committed since it
                contains only non-sensitive identifiers and environment mappings.
              </p>
            </div>
          </section>
        </main>
      </div>

      {/* ===== MOBILE NAV BUTTON ===== */}
      <button
        className="docs-mobile-nav-toggle"
        onClick={() => setMobileNavOpen(!mobileNavOpen)}
        aria-label="Toggle navigation"
      >
        {mobileNavOpen ? "\u2715" : "\u2630"}
      </button>

      {/* ===== MOBILE SIDEBAR ===== */}
      {mobileNavOpen && (
        <div
          className="docs-mobile-sidebar"
          onClick={() => setMobileNavOpen(false)}
        >
          <div
            className="docs-mobile-sidebar-inner"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="docs-sidebar-label" style={{ padding: "0 24px" }}>
              Documentation
            </p>
            <ul className="docs-sidebar-list" style={{ padding: "0 12px" }}>
              {sections.map((s) => (
                <li key={s.id}>
                  <a
                    href={`#${s.id}`}
                    className={`docs-sidebar-link${activeSection === s.id ? " docs-active" : ""}`}
                    onClick={() => setMobileNavOpen(false)}
                  >
                    {s.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* ===== FOOTER ===== */}
      <footer className="docs-footer">
        <span>&copy; 2025 tokengate.dev</span>
        <div className="docs-footer-links">
          <Link href="/">Home</Link>
          <a
            href="https://github.com/tokengate"
            target="_blank"
            rel="noopener noreferrer"
          >
            GitHub
          </a>
        </div>
      </footer>
    </div>
  );
}
