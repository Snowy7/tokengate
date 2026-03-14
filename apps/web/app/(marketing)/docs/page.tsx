"use client";

import { useState, useEffect, useCallback } from "react";
import { Sun, Moon, Menu, X, Shield } from "lucide-react";
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
  { id: "sdk", label: "SDK (@tokengate/env)" },
  { id: "nextjs", label: "Next.js Integration" },
  { id: "vite", label: "Vite Integration" },
  { id: "scan", label: "Secret Scanning" },
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
  const [dark, setDark] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [activeSection, setActiveSection] = useState("getting-started");
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  useEffect(() => {
    const theme = document.documentElement.getAttribute("data-theme");
    setDark(theme !== "light");
    setMounted(true);
  }, []);

  const toggleTheme = () => {
    const next = !dark;
    setDark(next);
    localStorage.setItem("tg-theme", next ? "dark" : "light");
    document.documentElement.setAttribute("data-theme", next ? "dark" : "light");
  };

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
    <div className="docs-root">
      {/* All docs styles are in globals.css */}

      {/* ===== NAV ===== */}
      <nav className="docs-nav">
        <Link href="/" className="docs-nav-left">
          <div className="docs-logo-box"><Shield size={20} /></div>
          <span className="docs-logo-text">tokengate.dev</span>
        </Link>
        <div className="docs-nav-right">
          <button
            className="docs-theme-toggle"
            onClick={toggleTheme}
            aria-label="Toggle dark mode"
          >
            {mounted ? (dark ? <Sun size={18} /> : <Moon size={18} />) : <span style={{ width: 18, height: 18 }} />}
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

          {/* ===== SDK ===== */}
          <section id="sdk" className="docs-section">
            <h2 className="docs-section-title">SDK (@tokengate/env)</h2>

            <p className="docs-p">
              The <code className="docs-code">@tokengate/env</code> SDK gives you type-safe,
              validated environment variables with zero-knowledge encryption. Define a schema,
              and the SDK fetches, decrypts, validates, and types your variables automatically.
            </p>

            <Terminal title="install">
              <Line prompt cmd>npm install @tokengate/env</Line>
            </Terminal>

            <h3 className="docs-h3">Define a Schema</h3>
            <p className="docs-p">
              Create <code className="docs-code">tokengate.config.ts</code> in your project root:
            </p>
            <Terminal title="tokengate.config.ts">
              <div><G>import</G> {"{"} defineConfig {"}"} <G>from</G> <Y>'@tokengate/env'</Y></div>
              <br />
              <div><G>export default</G> defineConfig({"{"}</div>
              <div>  project: <Y>'web'</Y>,</div>
              <div>  environment: <Y>'production'</Y>,</div>
              <div>  schema: {"{"}</div>
              <div>    DATABASE_URL:    {"{"} type: <Y>'string'</Y>, required: <G>true</G>, sensitive: <G>true</G> {"}"},</div>
              <div>    API_KEY:         {"{"} type: <Y>'string'</Y>, required: <G>true</G>, sensitive: <G>true</G> {"}"},</div>
              <div>    PORT:            {"{"} type: <Y>'port'</Y>, default: <W>3000</W> {"}"},</div>
              <div>    DEBUG:           {"{"} type: <Y>'boolean'</Y>, default: <G>false</G> {"}"},</div>
              <div>    ALLOWED_ORIGINS: {"{"} type: <Y>'string[]'</Y>, separator: <Y>','</Y> {"}"},</div>
              <div>    LOG_LEVEL:       {"{"} type: <Y>'enum'</Y>, values: [<Y>'debug'</Y>, <Y>'info'</Y>, <Y>'warn'</Y>, <Y>'error'</Y>], default: <Y>'info'</Y> {"}"},</div>
              <div>  {"}"}</div>
              <div>{"}"})</div>
            </Terminal>

            <h3 className="docs-h3">Use in Your App</h3>
            <Terminal title="app.ts">
              <div><G>import</G> {"{"} createEnv {"}"} <G>from</G> <Y>'@tokengate/env'</Y></div>
              <br />
              <div><G>const</G> env = <G>await</G> createEnv({"{"} schema: {"{"} <D>/* ... */</D> {"}"} {"}"})</div>
              <br />
              <div>env.DATABASE_URL  <D>// string — guaranteed present</D></div>
              <div>env.PORT          <D>// number — parsed from string</D></div>
              <div>env.DEBUG         <D>// boolean — parsed from "true"/"1"</D></div>
              <div>env.LOG_LEVEL     <D>// "debug" | "info" | "warn" | "error"</D></div>
            </Terminal>

            <h3 className="docs-h3">Schema Types</h3>
            <div className="docs-table-wrap">
              <table className="docs-table">
                <thead><tr><th>Type</th><th>Parses to</th><th>Example</th></tr></thead>
                <tbody>
                  <tr><td><code className="docs-code">string</code></td><td>string</td><td><code className="docs-code">"hello"</code></td></tr>
                  <tr><td><code className="docs-code">number</code></td><td>number</td><td><code className="docs-code">"42"</code> → 42</td></tr>
                  <tr><td><code className="docs-code">boolean</code></td><td>boolean</td><td><code className="docs-code">"true"</code> / <code className="docs-code">"1"</code> / <code className="docs-code">"yes"</code></td></tr>
                  <tr><td><code className="docs-code">string[]</code></td><td>string[]</td><td><code className="docs-code">"a,b,c"</code> → ["a","b","c"]</td></tr>
                  <tr><td><code className="docs-code">number[]</code></td><td>number[]</td><td><code className="docs-code">"1,2,3"</code> → [1,2,3]</td></tr>
                  <tr><td><code className="docs-code">url</code></td><td>string</td><td>Validated URL</td></tr>
                  <tr><td><code className="docs-code">email</code></td><td>string</td><td>Validated email</td></tr>
                  <tr><td><code className="docs-code">port</code></td><td>number</td><td>0–65535</td></tr>
                  <tr><td><code className="docs-code">enum</code></td><td>string</td><td>One of <code className="docs-code">values</code></td></tr>
                </tbody>
              </table>
            </div>

            <h3 className="docs-h3">Sources Priority</h3>
            <p className="docs-p">
              Variables load from these sources in order (first match wins):
            </p>
            <ol className="docs-ol">
              <li><strong>Cloud</strong> — Tokengate API (E2E encrypted, decrypted locally via <code className="docs-code">TOKENGATE_PASSWORD</code>)</li>
              <li><strong>File</strong> — Local <code className="docs-code">.env</code> file</li>
              <li><strong>Process</strong> — <code className="docs-code">process.env</code></li>
            </ol>

            <h3 className="docs-h3">Generate Types</h3>
            <Terminal title="terminal">
              <Line prompt cmd>tokengate generate-types</Line>
              <br />
              <div><G>{"✔"}</G> <W>env.d.ts</W> — 6 typed variables</div>
              <div><G>{"✔"}</G> <W>.env.example</W> — template with defaults</div>
            </Terminal>
          </section>

          {/* ===== NEXT.JS ===== */}
          <section id="nextjs" className="docs-section">
            <h2 className="docs-section-title">Next.js Integration</h2>

            <Terminal title="install">
              <Line prompt cmd>npm install @tokengate/env-next @tokengate/env</Line>
            </Terminal>

            <h3 className="docs-h3">Wrap Your Config</h3>
            <Terminal title="next.config.ts">
              <div><G>import</G> {"{"} withTokengate {"}"} <G>from</G> <Y>'@tokengate/env-next'</Y></div>
              <br />
              <div><G>export default</G> withTokengate({"{"}</div>
              <div>  schema: {"{"}</div>
              <div>    DATABASE_URL: {"{"} type: <Y>'string'</Y>, required: <G>true</G>, sensitive: <G>true</G> {"}"},</div>
              <div>    NEXT_PUBLIC_API_URL: {"{"} type: <Y>'url'</Y>, required: <G>true</G> {"}"},</div>
              <div>    PORT: {"{"} type: <Y>'port'</Y>, default: <W>3000</W> {"}"},</div>
              <div>  {"}"}</div>
              <div>{"}"})</div>
            </Terminal>

            <p className="docs-p">
              Variables prefixed with <code className="docs-code">NEXT_PUBLIC_</code> are
              automatically exposed to client-side code. All others are server-only.
            </p>

            <h3 className="docs-h3">Server Components / API Routes</h3>
            <Terminal title="app/api/route.ts">
              <div><G>import</G> {"{"} getEnv {"}"} <G>from</G> <Y>'@tokengate/env-next'</Y></div>
              <br />
              <div><G>export async function</G> GET() {"{"}</div>
              <div>  <G>const</G> env = <G>await</G> getEnv({"{"} schema: {"{"} <D>/* ... */</D> {"}"} {"}"})</div>
              <div>  <D>// env.DATABASE_URL — fully typed</D></div>
              <div>{"}"}</div>
            </Terminal>
          </section>

          {/* ===== VITE ===== */}
          <section id="vite" className="docs-section">
            <h2 className="docs-section-title">Vite Integration</h2>

            <Terminal title="install">
              <Line prompt cmd>npm install @tokengate/env-vite @tokengate/env</Line>
            </Terminal>

            <h3 className="docs-h3">Add the Plugin</h3>
            <Terminal title="vite.config.ts">
              <div><G>import</G> {"{"} defineConfig {"}"} <G>from</G> <Y>'vite'</Y></div>
              <div><G>import</G> {"{"} tokengate {"}"} <G>from</G> <Y>'@tokengate/env-vite'</Y></div>
              <br />
              <div><G>export default</G> defineConfig({"{"}</div>
              <div>  plugins: [</div>
              <div>    tokengate({"{"}</div>
              <div>      schema: {"{"}</div>
              <div>        VITE_API_URL: {"{"} type: <Y>'url'</Y>, required: <G>true</G> {"}"},</div>
              <div>        DATABASE_URL: {"{"} type: <Y>'string'</Y>, required: <G>true</G>, sensitive: <G>true</G> {"}"},</div>
              <div>      {"}"}</div>
              <div>    {"}"})</div>
              <div>  ]</div>
              <div>{"}"})</div>
            </Terminal>

            <p className="docs-p">
              Variables prefixed with <code className="docs-code">VITE_</code> are exposed to
              client code via <code className="docs-code">import.meta.env</code>. All variables
              are available in <code className="docs-code">process.env</code> during SSR/build.
            </p>
          </section>

          {/* ===== SCANNING ===== */}
          <section id="scan" className="docs-section">
            <h2 className="docs-section-title">Secret Scanning</h2>

            <p className="docs-p">
              Tokengate can scan your codebase for accidentally hardcoded secret values.
              It reads your mapped <code className="docs-code">.env</code> files, extracts
              the values, and searches all source files for matches.
            </p>

            <Terminal title="terminal">
              <Line prompt cmd>tokengate scan</Line>
              <br />
              <div><G>{"✔"}</G> Found <W>12</W> secret values to scan for.</div>
              <div><D>Scanning codebase...</D></div>
              <br />
              <div><span className="docs-red">{"✗"}</span> Found <span className="docs-red">3 potential leaks</span>:</div>
              <br />
              <div>  <W>src/config.ts</W></div>
              <div>    <D>L42:15</D> <span className="docs-red">DATABASE_URL</span> leaked: <D>const db = "postgres://user:pass@prod..."</D></div>
              <br />
              <div>  <W>deploy.sh</W></div>
              <div>    <D>L12:20</D> <span className="docs-red">STRIPE_SECRET</span> leaked: <D>export STRIPE_KEY="sk_live_..."</D></div>
            </Terminal>

            <div className="docs-info">
              <p className="docs-info-label">CI Integration</p>
              <p>
                <code className="docs-code">tokengate scan</code> exits with code 1 if leaks are found,
                making it easy to add to your CI pipeline as a pre-merge check.
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
        {mobileNavOpen ? <X size={20} /> : <Menu size={20} />}
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
        <span>&copy; {new Date().getFullYear()} tokengate.dev</span>
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
