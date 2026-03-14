"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { SignedIn, SignedOut, SignInButton } from "@clerk/nextjs";
import {
  Sun,
  Moon,
  Lock,
  Shield,
  ChevronRight,
} from "lucide-react";

export const dynamic = "force-dynamic";

/* ------------------------------------------------------------------ */
/*  CSS custom properties injected once via a tiny <style> block       */
/*  This is NOT inline styling — it sets theme tokens for Tailwind     */
/* ------------------------------------------------------------------ */
const THEME_VARS = `
.tg-root {
  --tg-green: #00a86b;
  --tg-green-dim: rgba(0, 168, 107, 0.10);
  --tg-bg: #faf9f6;
  --tg-bg-alt: #f0efeb;
  --tg-surface: #faf9f6;
  --tg-text: #1a1a1a;
  --tg-text-secondary: #5a5a5a;
  --tg-border: #2a2a2a;
  --tg-terminal-bg: #1a1f1c;
  --tg-terminal-text: #d4d4d4;
  --tg-terminal-green: #00d68f;
  --tg-terminal-yellow: #fbbf24;
  --tg-terminal-blue: #60a5fa;
  --tg-terminal-red: #f87171;
  --tg-terminal-dim: #666666;
  --tg-shadow: 4px 4px 0 #2a2a2a;
  --tg-hover-shadow: 6px 6px 0 #2a2a2a;
}
html[data-theme="dark"] .tg-root {
  --tg-green: #00d68f;
  --tg-green-dim: rgba(0, 214, 143, 0.10);
  --tg-bg: #0f1412;
  --tg-bg-alt: #141a17;
  --tg-surface: #182019;
  --tg-text: #e8e8e8;
  --tg-text-secondary: #999999;
  --tg-border: #00d68f;
  --tg-terminal-bg: #0d100e;
  --tg-shadow: 4px 4px 0 rgba(0, 214, 143, 0.4);
  --tg-hover-shadow: 6px 6px 0 rgba(0, 214, 143, 0.5);
}

@keyframes tg-blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0; }
}
@keyframes tg-fade-up {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}
@keyframes tg-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}
@keyframes tg-dot-flow {
  0% { opacity: 0.2; }
  50% { opacity: 1; }
  100% { opacity: 0.2; }
}

/* Brutalist button hover — CSS only, no JS needed */
.tg-brutal-btn {
  transition: transform 150ms ease, box-shadow 150ms ease;
  box-shadow: none;
}
.tg-brutal-btn:hover {
  transform: translate(-2px, -2px);
  box-shadow: var(--tg-shadow);
}
.tg-brutal-btn:active {
  transform: translate(0, 0);
  box-shadow: none;
}

/* Brutalist link hover */
.tg-brutal-link {
  transition: border-color 150ms ease, transform 150ms ease, box-shadow 150ms ease;
}
.tg-brutal-link:hover {
  transform: translate(-1px, -1px);
  box-shadow: 3px 3px 0 var(--tg-border);
}

@media (prefers-reduced-motion: reduce) {
  .tg-cursor, .tg-fade-in, .tg-status-dot, .tg-dot {
    animation: none !important;
    opacity: 1 !important;
    transform: none !important;
  }
  .tg-brutal-btn, .tg-brutal-link {
    transition: none !important;
  }
}
`;

/* ------------------------------------------------------------------ */
/*  Shared sub-components                                              */
/* ------------------------------------------------------------------ */

function TerminalDots() {
  return (
    <>
      <span className="inline-block w-3 h-3 border-2 bg-[#ff5f57] border-[#cc4c40]" />
      <span className="inline-block w-3 h-3 border-2 bg-[#febc2e] border-[#cb9625]" />
      <span className="inline-block w-3 h-3 border-2 bg-[#28c840] border-[#20a033]" />
    </>
  );
}

function TerminalWindow({
  title,
  children,
  className = "",
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`border-3 border-[var(--tg-border)] overflow-hidden ${className}`}
      style={{
        background: "var(--tg-terminal-bg)",
        boxShadow: "var(--tg-shadow)",
      }}
    >
      <div className="flex items-center gap-2 px-4 py-2.5 border-b-2 border-[rgba(0,168,107,0.2)] bg-[#1a201d] [.tg-root[data-theme=dark]_&]:bg-[#131a17] [.tg-root[data-theme=dark]_&]:border-b-[rgba(0,214,143,0.15)]">
        <TerminalDots />
        <span
          className="flex-1 text-center text-xs text-[#666]"
          style={{ fontFamily: "'Space Mono', monospace" }}
        >
          {title}
        </span>
      </div>
      <div
        className="p-[clamp(16px,1.5vw,40px)] text-[clamp(12px,0.5vw,20px)] leading-[1.7] overflow-x-auto text-[var(--tg-terminal-text)]"
        style={{ fontFamily: "'Space Mono', monospace" }}
      >
        {children}
      </div>
    </div>
  );
}

function Cursor() {
  return (
    <span
      className="tg-cursor inline-block w-2 h-4 bg-[var(--tg-terminal-green)] align-middle ml-0.5"
      style={{ animation: "tg-blink 1s step-end infinite" }}
    />
  );
}

/* Terminal text helpers */
const P = ({ children }: { children: React.ReactNode }) => (
  <span className="text-[var(--tg-terminal-green)]">{children}</span>
);
const C = ({ children }: { children: React.ReactNode }) => (
  <span className="text-white font-bold">{children}</span>
);
const D = ({ children }: { children: React.ReactNode }) => (
  <span className="text-[var(--tg-terminal-dim)]">{children}</span>
);
const G = ({ children }: { children: React.ReactNode }) => (
  <span className="text-[var(--tg-terminal-green)]">{children}</span>
);
const GB = ({ children }: { children: React.ReactNode }) => (
  <span className="text-[var(--tg-terminal-green)] font-bold">{children}</span>
);
const Y = ({ children }: { children: React.ReactNode }) => (
  <span className="text-[var(--tg-terminal-yellow)]">{children}</span>
);
const B = ({ children }: { children: React.ReactNode }) => (
  <span className="text-[var(--tg-terminal-blue)]">{children}</span>
);
const W = ({ children }: { children: React.ReactNode }) => (
  <span className="text-white">{children}</span>
);
const WB = ({ children }: { children: React.ReactNode }) => (
  <span className="text-white font-bold">{children}</span>
);

/* Status dot for sync visual */
function StatusDot({ status }: { status: "synced" | "changed" | "new" }) {
  const colors = {
    synced: "bg-[var(--tg-terminal-green)]",
    changed: "bg-[var(--tg-terminal-yellow)]",
    new: "bg-[var(--tg-terminal-blue)]",
  };
  const delays = { synced: "2s", changed: "1.5s", new: "1.8s" };
  return (
    <span
      className={`tg-status-dot inline-block w-2 h-2 shrink-0 ${colors[status]}`}
      style={{ animation: `tg-pulse ${delays[status]} ease-in-out infinite` }}
    />
  );
}

/* ------------------------------------------------------------------ */
/*  Main page                                                          */
/* ------------------------------------------------------------------ */

export default function MarketingPage() {
  const [dark, setDark] = useState(true);
  const [mounted, setMounted] = useState(false);

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

  const mono = { fontFamily: "'Space Mono', monospace" } as const;
  const sans = { fontFamily: "'Work Sans', sans-serif" } as const;

  return (
    <div
      className="tg-root min-h-screen overflow-x-hidden antialiased"
      style={{ background: "var(--tg-bg)", color: "var(--tg-text)", ...sans }}
    >
      {/* Theme tokens — not inline styles, just CSS custom properties */}
      <style dangerouslySetInnerHTML={{ __html: THEME_VARS }} />

      {/* ===== NAV ===== */}
      <nav className="sticky top-0 z-50 flex items-center justify-between h-[clamp(56px,3.5vw,96px)] px-[clamp(24px,3vw,200px)] border-b-3 border-[var(--tg-border)]" style={{ background: "var(--tg-bg)" }}>
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 bg-[var(--tg-green)] border-3 border-[var(--tg-border)] text-black">
            <Shield size={20} />
          </div>
          <span className="font-bold text-base tracking-tight" style={mono}>
            tokengate.dev
          </span>
        </div>
        <div className="flex items-center gap-4">
          <button
            className="tg-brutal-btn flex items-center justify-center w-10 h-10 border-3 border-[var(--tg-border)] cursor-pointer"
            style={{ background: "var(--tg-bg)", color: "var(--tg-text)" }}
            onClick={toggleTheme}
            aria-label="Toggle dark mode"
          >
            {mounted ? (dark ? <Sun size={18} /> : <Moon size={18} />) : <span className="w-[18px] h-[18px]" />}
          </button>
          <Link
            href="/docs"
            className="tg-brutal-link hidden md:inline-block text-[clamp(12px,0.5vw,22px)] font-bold uppercase tracking-wider py-2 px-3 border-3 border-transparent no-underline hover:border-[var(--tg-border)]"
            style={{ ...mono, color: "var(--tg-text)" }}
          >
            Docs
          </Link>
          <SignedOut>
            <SignInButton mode="modal">
              <button
                className="tg-brutal-btn inline-flex items-center justify-center py-[clamp(8px,0.6vw,20px)] px-[clamp(16px,1.2vw,44px)] bg-[var(--tg-green)] text-black border-3 border-[var(--tg-border)] font-bold text-[clamp(12px,0.5vw,22px)] uppercase tracking-wider cursor-pointer no-underline"
                style={mono}
              >
                Sign In
              </button>
            </SignInButton>
          </SignedOut>
          <SignedIn>
            <Link
              className="tg-brutal-btn inline-flex items-center justify-center py-[clamp(8px,0.6vw,20px)] px-[clamp(16px,1.2vw,44px)] bg-[var(--tg-green)] text-black border-3 border-[var(--tg-border)] font-bold text-[clamp(12px,0.5vw,22px)] uppercase tracking-wider cursor-pointer no-underline"
              style={mono}
              href="/dashboard"
            >
              Dashboard
            </Link>
          </SignedIn>
        </div>
      </nav>

      {/* ===== HERO ===== */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-[clamp(32px,3vw,80px)] max-w-[clamp(320px,80vw,3200px)] mx-auto px-[clamp(24px,3vw,80px)] py-[clamp(48px,5vh,140px)] items-center min-h-[calc(100vh-64px)]">
        <div className="tg-fade-in" style={{ animation: "tg-fade-up 0.6s ease both" }}>
          <h1
            className="text-[clamp(2.5rem,3.5vw,10rem)] font-bold leading-[1.05] tracking-tight mb-[clamp(16px,1.5vw,40px)]"
            style={{ ...mono, letterSpacing: "-0.03em" }}
          >
            <span className="text-[var(--tg-green)]">ENCRYPT.</span>
            <br />
            <span className="text-[var(--tg-green)]">SYNC.</span>
            <br />
            SHIP.
          </h1>
          <p
            className="text-[clamp(13px,0.8vw,26px)] leading-relaxed max-w-[clamp(320px,28vw,720px)] mb-[clamp(24px,2vw,48px)]"
            style={{ ...mono, color: "var(--tg-text-secondary)" }}
          >
            Zero-knowledge encrypted environment variables.
            <br />
            CLI + web dashboard. Per-environment passwords.
          </p>
          <div className="flex gap-[clamp(12px,1vw,24px)] flex-wrap">
            <SignedOut>
              <SignInButton mode="modal">
                <button
                  className="inline-flex items-center justify-center py-[clamp(8px,0.6vw,20px)] px-[clamp(16px,1.2vw,44px)] bg-[var(--tg-green)] text-black border-3 border-[var(--tg-border)] font-bold text-[clamp(12px,0.5vw,22px)] uppercase tracking-wider cursor-pointer no-underline tg-brutal-btn"
                  style={mono}
                >
                  Get Started
                </button>
              </SignInButton>
            </SignedOut>
            <SignedIn>
              <Link
                className="inline-flex items-center justify-center py-[clamp(8px,0.6vw,20px)] px-[clamp(16px,1.2vw,44px)] bg-[var(--tg-green)] text-black border-3 border-[var(--tg-border)] font-bold text-[clamp(12px,0.5vw,22px)] uppercase tracking-wider cursor-pointer no-underline tg-brutal-btn"
                style={mono}
                href="/dashboard"
              >
                Open Dashboard
              </Link>
            </SignedIn>
            <Link
              href="/docs"
              className="inline-flex items-center justify-center py-[clamp(8px,0.6vw,20px)] px-[clamp(16px,1.2vw,44px)] border-3 border-[var(--tg-border)] font-bold text-[clamp(12px,0.5vw,22px)] uppercase tracking-wider cursor-pointer no-underline tg-brutal-btn"
              style={{ ...mono, background: "var(--tg-bg)", color: "var(--tg-text)" }}
            >
              Read Docs
            </Link>
          </div>
        </div>

        <div className="tg-fade-in" style={{ animation: "tg-fade-up 0.6s ease both", animationDelay: "0.2s" }}>
          <TerminalWindow title="tokengate init">
            <div>
              <P>$ </P>
              <C>npx tokengate init</C>
            </div>
            <br />
            <div>
              <GB>{"▲ Tokengate"}</GB>
              <D> v1.2.0</D>
            </div>
            <br />
            <div>
              <D>? </D>
              <WB>Select workspace</WB>
            </div>
            <div>
              <G>{"  \u276F acme-corp"}</G>
            </div>
            <div>
              <D>{"    personal-projects"}</D>
            </div>
            <div>
              <D>{"    freelance-2024"}</D>
            </div>
            <br />
            <div>
              <D>? </D>
              <WB>Environment name </WB>
              <G>production</G>
            </div>
            <br />
            <div>
              <D>? </D>
              <WB>Encryption password </WB>
              <D>{"••••••••••••"}</D>
            </div>
            <br />
            <div>
              <G>{"✔"}</G>
              <W> Workspace linked to </W>
              <GB>acme-corp</GB>
            </div>
            <div>
              <G>{"✔"}</G>
              <W> Environment </W>
              <GB>production</GB>
              <W> ready</W>
            </div>
            <div>
              <G>{"✔"}</G>
              <W> Encryption configured</W>
            </div>
            <br />
            <div>
              <D>Run </D>
              <WB>tokengate push</WB>
              <D> to sync your .env files</D>
            </div>
            <div>
              <P>$ </P>
              <Cursor />
            </div>
          </TerminalWindow>
        </div>
      </section>

      {/* ===== FILE SYNC VISUAL ===== */}
      <section
        className="border-y-3 border-[var(--tg-border)]"
        style={{ background: "var(--tg-bg-alt)" }}
      >
        <div className="max-w-[clamp(320px,80vw,3200px)] mx-auto px-[clamp(24px,3vw,80px)] py-12 flex flex-col justify-center min-h-[60vh]">
          <p
            className="tg-fade-in text-[clamp(11px,0.4vw,18px)] font-bold uppercase tracking-[0.15em] text-[var(--tg-green)] mb-[clamp(12px,1vw,24px)]"
            style={{ ...mono, animation: "tg-fade-up 0.6s ease both", animationDelay: "0.1s" }}
          >
            Multi-file Sync
          </p>
          <div
            className="tg-fade-in grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] items-stretch"
            style={{ animation: "tg-fade-up 0.6s ease both", animationDelay: "0.2s" }}
          >
            {/* LOCAL */}
            <div
              className="border-3 border-[var(--tg-border)] min-h-[clamp(260px,20vw,500px)]"
              style={{ background: "var(--tg-surface)" }}
            >
              <div
                className="flex items-center justify-between px-5 py-3 border-b-3 border-[var(--tg-border)] text-xs font-bold uppercase tracking-widest"
                style={mono}
              >
                <span>Local</span>
                <span className="text-[var(--tg-green)]">~/project</span>
              </div>
              <ul className="list-none m-0 p-0">
                {[
                  { dot: "synced" as const, name: ".env", meta: "12 vars" },
                  { dot: "changed" as const, name: ".env.local", meta: "8 vars" },
                  { dot: "synced" as const, name: ".env.production", meta: "15 vars" },
                  { dot: "new" as const, name: ".env.staging", meta: "14 vars" },
                ].map((f) => (
                  <li
                    key={f.name}
                    className="flex items-center gap-3 px-5 py-3 border-b border-[var(--tg-bg-alt)] last:border-b-0 text-[13px] transition-colors duration-100 hover:bg-[var(--tg-green-dim)]"
                    style={mono}
                  >
                    <StatusDot status={f.dot} />
                    <span className="flex-1">{f.name}</span>
                    <span className="text-[11px] text-[var(--tg-text-secondary)]">{f.meta}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* ARROWS */}
            <div className="flex flex-row md:flex-col items-center justify-center px-6 py-4 md:py-0 gap-3">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="relative">
                  <div className="w-12 h-[3px] md:w-12 bg-[var(--tg-green)]" />
                  <ChevronRight
                    size={14}
                    className="absolute -right-1 -top-[5px] text-[var(--tg-green)]"
                    strokeWidth={3}
                  />
                </div>
              ))}
              <span
                className="text-[10px] font-bold text-[var(--tg-green)] uppercase tracking-widest md:[writing-mode:vertical-lr]"
                style={mono}
              >
                SYNC
              </span>
            </div>

            {/* REMOTE */}
            <div
              className="border-3 border-[var(--tg-border)] min-h-[clamp(260px,20vw,500px)]"
              style={{ background: "var(--tg-surface)" }}
            >
              <div
                className="flex items-center justify-between px-5 py-3 border-b-3 border-[var(--tg-border)] text-xs font-bold uppercase tracking-widest"
                style={mono}
              >
                <span>Remote</span>
                <span className="text-[var(--tg-green)]">acme-corp</span>
              </div>
              <ul className="list-none m-0 p-0">
                {[
                  { dot: "synced" as const, name: "default", meta: "rev #4" },
                  { dot: "changed" as const, name: "local", meta: "rev #2" },
                  { dot: "synced" as const, name: "production", meta: "rev #7" },
                  { dot: "new" as const, name: "staging", meta: "new" },
                ].map((f) => (
                  <li
                    key={f.name}
                    className="flex items-center gap-3 px-5 py-3 border-b border-[var(--tg-bg-alt)] last:border-b-0 text-[13px] transition-colors duration-100 hover:bg-[var(--tg-green-dim)]"
                    style={mono}
                  >
                    <StatusDot status={f.dot} />
                    <span className="flex-1">{f.name}</span>
                    <span className="text-[11px] text-[var(--tg-text-secondary)]">{f.meta}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ===== TERMINAL SHOWCASE ===== */}
      <section className="max-w-[clamp(320px,80vw,3200px)] mx-auto px-[clamp(24px,3vw,80px)] py-[clamp(48px,5vh,120px)] min-h-[60vh] flex flex-col justify-center">
        <p
          className="tg-fade-in text-[clamp(11px,0.4vw,18px)] font-bold uppercase tracking-[0.15em] text-[var(--tg-green)] mb-[clamp(12px,1vw,24px)]"
          style={{ ...mono, animation: "tg-fade-up 0.6s ease both", animationDelay: "0.1s" }}
        >
          CLI Workflow
        </p>
        <h2
          className="tg-fade-in text-[clamp(1.5rem,1.8vw,4rem)] font-bold leading-[1.15] mb-[clamp(32px,2.5vw,64px)]"
          style={{ ...mono, animation: "tg-fade-up 0.6s ease both", animationDelay: "0.2s" }}
        >
          Push. Pull. History.
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* PUSH */}
          <TerminalWindow title="push" className="tg-fade-in" >
            <div>
              <P>$ </P>
              <C>tokengate push</C>
            </div>
            <br />
            <div><D>Scanning .env files...</D></div>
            <br />
            <div><WB>{"  File              Status"}</WB></div>
            <div><D>{"  \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500"}</D></div>
            <div>
              <G>{"  \u2713 "}</G>
              <W>.env            </W>
              <D>synced</D>
            </div>
            <div>
              <Y>{"  ~ "}</Y>
              <W>.env.local      </W>
              <Y>changed</Y>
            </div>
            <div>
              <B>{"  + "}</B>
              <W>.env.staging    </W>
              <B>new</B>
            </div>
            <br />
            <div>
              <D>? </D>
              <W>Push changes? </W>
              <G>Yes</G>
            </div>
            <br />
            <div><D>Encrypting...</D></div>
            <div>
              <G>{"✔"}</G>
              <W> .env.local {"→"} </W>
              <G>rev #3</G>
            </div>
            <div>
              <G>{"✔"}</G>
              <W> .env.staging {"→"} </W>
              <G>rev #1</G>
            </div>
          </TerminalWindow>

          {/* PULL */}
          <TerminalWindow title="pull" className="tg-fade-in">
            <div>
              <P>$ </P>
              <C>tokengate pull</C>
            </div>
            <br />
            <div><D>Checking remote...</D></div>
            <br />
            <div><WB>{"  File              Status"}</WB></div>
            <div><D>{"  \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500"}</D></div>
            <div>
              <Y>{"  \u2193 "}</Y>
              <W>.env            </W>
              <Y>remote differs</Y>
            </div>
            <div>
              <G>{"  \u2713 "}</G>
              <W>.env.local      </W>
              <D>synced</D>
            </div>
            <div>
              <Y>{"  \u2193 "}</Y>
              <W>.env.production </W>
              <Y>remote differs</Y>
            </div>
            <br />
            <div><D>Decrypting...</D></div>
            <div>
              <G>{"✔"}</G>
              <W> .env            </W>
              <D>{"← rev #5"}</D>
            </div>
            <div>
              <G>{"✔"}</G>
              <W> .env.production </W>
              <D>{"← rev #8"}</D>
            </div>
            <br />
            <div>
              <GB>All files up to date.</GB>
            </div>
          </TerminalWindow>

          {/* HISTORY */}
          <TerminalWindow title="history" className="tg-fade-in">
            <div>
              <P>$ </P>
              <C>tokengate history production</C>
            </div>
            <br />
            <div><WB>{"  production \u2014 7 revisions"}</WB></div>
            <br />
            {[
              { rev: "#7", date: "2024-01-15 14:32", hash: "a3f8c1d", user: "sarah", current: true },
              { rev: "#6", date: "2024-01-14 09:18", hash: "b7e2f4a", user: "alex", current: false },
              { rev: "#5", date: "2024-01-12 16:45", hash: "c1d9e3b", user: "sarah", current: false },
              { rev: "#4", date: "2024-01-10 11:22", hash: "d4a6f8c", user: "james", current: false },
              { rev: "#3", date: "2024-01-08 08:55", hash: "e9b2c7d", user: "alex", current: false },
              { rev: "#2", date: "2024-01-05 13:10", hash: "f3e8a1b", user: "sarah", current: false },
              { rev: "#1", date: "2024-01-03 10:00", hash: "a1c4d7e", user: "james", current: false },
            ].map((h) => (
              <div key={h.rev}>
                {h.current ? <G>{"  "}{h.rev} </G> : <D>{"  "}{h.rev} </D>}
                <D>{h.date} </D>
                <W>{h.hash} </W>
                <B>{h.user}</B>
              </div>
            ))}
          </TerminalWindow>
        </div>
      </section>

      {/* ===== ENCRYPTION VISUAL ===== */}
      <section
        className="border-y-3 border-[var(--tg-border)] px-[clamp(24px,3vw,80px)] py-[clamp(48px,5vh,120px)] min-h-[60vh] flex flex-col justify-center items-center"
        style={{ background: "var(--tg-terminal-bg)" }}
      >
        <div className="max-w-[clamp(320px,80vw,3200px)] mx-auto w-full">
          <p
            className="tg-fade-in text-[clamp(11px,0.4vw,18px)] font-bold uppercase tracking-[0.15em] text-[#00d68f] mb-[clamp(12px,1vw,24px)]"
            style={{ ...mono, animation: "tg-fade-up 0.6s ease both", animationDelay: "0.1s" }}
          >
            End-to-End Encryption
          </p>
          <div
            className="tg-fade-in grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] items-stretch"
            style={{ animation: "tg-fade-up 0.6s ease both", animationDelay: "0.2s" }}
          >
            {/* PLAINTEXT */}
            <div className="border-3 border-[#333] p-[clamp(16px,1.5vw,44px)] min-h-[clamp(180px,14vw,400px)] text-[clamp(12px,0.45vw,18px)]">
              <p
                className="text-[11px] font-bold uppercase tracking-widest text-[var(--tg-terminal-green)] mb-4"
                style={mono}
              >
                Plaintext .env
              </p>
              <pre
                className="text-[12px] leading-[1.7] text-[var(--tg-terminal-text)] m-0 whitespace-pre-wrap break-all"
                style={mono}
              >{`DATABASE_URL=postgres://prod:s3cr3t@db.internal:5432/app
API_KEY=sk-live-a8f3b2c1d4e5f6a7b8c9
STRIPE_SECRET=sk_live_51HG3j2eZvKYlo2C0
REDIS_URL=redis://default:p4ssw0rd@cache:6379
JWT_SECRET=xK9#mP2$vL5nQ8wR3tY6
SENDGRID_KEY=SG.abc123.xyz789def`}</pre>
            </div>

            {/* MIDDLE */}
            <div className="flex flex-row md:flex-col items-center justify-center px-8 py-4 md:py-0 gap-4">
              <Lock size={48} className="text-[var(--tg-terminal-green)]" />
              <div
                className="text-[11px] font-bold text-[var(--tg-terminal-green)] text-center tracking-wider"
                style={mono}
              >
                PBKDF2
                <br />
                {"↓"}
                <br />
                AES-256-GCM
              </div>
              <div className="flex md:flex-col gap-1.5">
                {[0, 1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    className="tg-dot w-1.5 h-1.5 bg-[var(--tg-terminal-green)]"
                    style={{ animation: `tg-dot-flow 1.5s ease-in-out infinite`, animationDelay: `${i * 0.2}s` }}
                  />
                ))}
              </div>
            </div>

            {/* CIPHERTEXT */}
            <div className="border-3 border-[#333] p-[clamp(16px,1.5vw,44px)] min-h-[clamp(180px,14vw,400px)] text-[clamp(12px,0.45vw,18px)]">
              <p
                className="text-[11px] font-bold uppercase tracking-widest text-[var(--tg-terminal-green)] mb-4"
                style={mono}
              >
                Encrypted Blob
              </p>
              <pre
                className="text-[11px] leading-[1.7] text-[#555] m-0 whitespace-pre-wrap break-all"
                style={mono}
              >{`jA0ECQMCkF3w8J+E7Gj/0sAB
AcP2xL+VHQO4mFqR9KzN3bTe
x7YpW1uJdG8vM5nC0aHi6kSf
QwRlXjU2yD4oBtZcEgAm3rKhP
9VnI7wLs1FpYxCzJ5uMdN8qTb
A6WvO0eHiRk3jG2lSfQwXcU4y
D7oBtZaEgM1rKhP5VnI9wLs3F
pYxCzJ7uMdN0qTbA8WvO2eHiR
k5jG4lSfQwXcU6yD9oBtZaEgM
3rKhP7VnI1wLs5FpYxCzJ9uMd
N2qTbA0WvO4eHiRk7jG6lSfQw`}</pre>
            </div>
          </div>
          <p
            className="tg-fade-in text-[clamp(13px,0.5vw,24px)] text-[var(--tg-terminal-text)] text-center max-w-[clamp(400px,40vw,900px)] mx-auto mt-[clamp(24px,2vw,56px)] leading-relaxed"
            style={{ ...mono, animation: "tg-fade-up 0.6s ease both", animationDelay: "0.3s" }}
          >
            Your password <strong className="text-[var(--tg-terminal-green)]">never leaves your machine</strong>. We
            literally cannot read your secrets.
          </p>
        </div>
      </section>

      {/* ===== STATS STRIP ===== */}
      <div className="grid grid-cols-2 md:grid-cols-4 border-y-4 border-[var(--tg-border)]">
        {[
          { value: "AES-256-GCM", label: "Cipher" },
          { value: "300K", label: "PBKDF2 Iterations" },
          { value: "E2E", label: "Encrypted" },
          { value: "ZERO", label: "Knowledge" },
        ].map((stat, i) => (
          <div
            key={stat.label}
            className={`p-[clamp(24px,2vw,56px)] text-center border-[var(--tg-border)] ${
              i < 3 ? "md:border-r-3" : ""
            } ${i < 2 ? "border-b-3 md:border-b-0" : ""} ${i === 1 ? "border-r-0 md:border-r-3" : ""} ${i === 0 || i === 2 ? "border-r-3" : ""}`}
            style={{ background: "var(--tg-bg)" }}
          >
            <p
              className="text-[clamp(1.1rem,1.5vw,4rem)] font-bold tracking-tight m-0 mb-1"
              style={mono}
            >
              {stat.value}
            </p>
            <p
              className="text-[clamp(9px,0.4vw,18px)] font-bold uppercase tracking-[0.15em] text-[var(--tg-green)] m-0"
              style={mono}
            >
              {stat.label}
            </p>
          </div>
        ))}
      </div>

      {/* ===== CTA ===== */}
      <section className="bg-[var(--tg-green)] border-y-4 border-[var(--tg-border)] px-[clamp(24px,3vw,200px)] py-[clamp(60px,6vh,160px)] text-center min-h-[50vh] flex flex-col items-center justify-center">
        <h2
          className="text-[clamp(2rem,2.2vw,6rem)] font-bold text-black mb-[clamp(24px,2vw,48px)]"
          style={{ ...mono, letterSpacing: "-0.03em" }}
        >
          GET STARTED
        </h2>
        <div className="flex justify-center gap-[clamp(12px,1vw,24px)] mb-[clamp(32px,3vw,64px)] flex-wrap">
          <SignedOut>
            <SignInButton mode="modal">
              <button
                className="inline-flex items-center justify-center py-[clamp(8px,0.6vw,20px)] px-[clamp(16px,1.2vw,44px)] bg-black text-[var(--tg-green)] border-3 border-black font-bold text-[clamp(12px,0.5vw,22px)] uppercase tracking-wider cursor-pointer no-underline tg-brutal-btn"
                style={mono}
              >
                Create Account
              </button>
            </SignInButton>
          </SignedOut>
          <SignedIn>
            <Link
              className="inline-flex items-center justify-center py-[clamp(8px,0.6vw,20px)] px-[clamp(16px,1.2vw,44px)] bg-black text-[var(--tg-green)] border-3 border-black font-bold text-[clamp(12px,0.5vw,22px)] uppercase tracking-wider cursor-pointer no-underline tg-brutal-btn"
              style={mono}
              href="/dashboard"
            >
              Open Dashboard
            </Link>
          </SignedIn>
        </div>
        <div
          className="max-w-[540px] mx-auto border-3 border-black overflow-hidden"
          style={{ background: "var(--tg-terminal-bg)", boxShadow: "4px 4px 0 rgba(0,0,0,0.3)" }}
        >
          <div className="flex items-center gap-2 px-4 py-2.5 border-b-2 border-[rgba(0,0,0,0.2)] bg-[#1a201d]">
            <TerminalDots />
            <span
              className="flex-1 text-center text-xs text-[#666]"
              style={mono}
            >
              terminal
            </span>
          </div>
          <div
            className="p-[clamp(16px,1.5vw,40px)] text-[clamp(12px,0.5vw,20px)] leading-[1.7] text-[var(--tg-terminal-text)]"
            style={mono}
          >
            <div>
              <P>$ </P>
              <C>npx tokengate init</C>
              <Cursor />
            </div>
          </div>
        </div>
      </section>

      {/* ===== FOOTER ===== */}
      <footer
        className="border-t-3 border-[var(--tg-border)] px-[clamp(24px,3vw,200px)] py-[clamp(24px,2vw,56px)] flex items-center justify-between text-xs flex-wrap gap-4 max-md:flex-col max-md:text-center"
        style={{ ...mono, background: "var(--tg-bg)", color: "var(--tg-text-secondary)" }}
      >
        <span>&copy; {new Date().getFullYear()} tokengate.dev</span>
        <div className="flex gap-6">
          <Link
            href="/docs"
            className="no-underline transition-colors duration-150 hover:text-[var(--tg-green)]"
            style={{ color: "var(--tg-text-secondary)" }}
          >
            Docs
          </Link>
          <a
            href="https://github.com/tokengate"
            target="_blank"
            rel="noopener noreferrer"
            className="no-underline transition-colors duration-150 hover:text-[var(--tg-green)]"
            style={{ color: "var(--tg-text-secondary)" }}
          >
            GitHub
          </a>
          <Link
            href="/privacy"
            className="no-underline transition-colors duration-150 hover:text-[var(--tg-green)]"
            style={{ color: "var(--tg-text-secondary)" }}
          >
            Privacy
          </Link>
        </div>
      </footer>
    </div>
  );
}
