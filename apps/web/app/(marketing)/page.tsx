"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { SignedIn, SignedOut, SignInButton } from "@clerk/nextjs";

export const dynamic = "force-dynamic";

export default function MarketingPage() {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
      setDark(true);
    }
  }, []);

  return (
    <div className="tg-root" data-theme={dark ? "dark" : "light"}>
      <style
        dangerouslySetInnerHTML={{
          __html: `
@import url('https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&family=Work+Sans:wght@400;500;600;700;800;900&display=swap');

/* ========== TOKEN GATE VARIABLES ========== */
.tg-root {
  --tg-bg: #ffffff;
  --tg-bg-alt: #f5f5f0;
  --tg-surface: #ffffff;
  --tg-text: #0a0a0a;
  --tg-text-secondary: #555555;
  --tg-green: #00a86b;
  --tg-green-dim: rgba(0, 168, 107, 0.12);
  --tg-border: #0a0a0a;
  --tg-terminal-bg: #0a0a0a;
  --tg-terminal-text: #d4d4d4;
  --tg-terminal-green: #00d68f;
  --tg-terminal-yellow: #fbbf24;
  --tg-terminal-blue: #60a5fa;
  --tg-terminal-red: #f87171;
  --tg-terminal-dim: #666666;
  --tg-font-mono: 'Space Mono', monospace;
  --tg-font-sans: 'Work Sans', sans-serif;
  --tg-shadow: 4px 4px 0 #0a0a0a;
  --tg-shadow-green: 4px 4px 0 #00a86b;
  --tg-hover-shadow: 6px 6px 0 #0a0a0a;
}

.tg-root[data-theme="dark"] {
  --tg-bg: #0a0e0c;
  --tg-bg-alt: #0f1412;
  --tg-surface: #131a17;
  --tg-text: #e8e8e8;
  --tg-text-secondary: #999999;
  --tg-green: #00d68f;
  --tg-green-dim: rgba(0, 214, 143, 0.12);
  --tg-border: #e8e8e8;
  --tg-terminal-bg: #111111;
  --tg-shadow: 4px 4px 0 #00d68f;
  --tg-shadow-green: 4px 4px 0 #00d68f;
  --tg-hover-shadow: 6px 6px 0 #00d68f;
}

/* ========== BASE ========== */
.tg-root {
  background: var(--tg-bg);
  color: var(--tg-text);
  font-family: var(--tg-font-sans);
  min-height: 100vh;
  overflow-x: hidden;
  -webkit-font-smoothing: antialiased;
}

.tg-root *, .tg-root *::before, .tg-root *::after {
  box-sizing: border-box;
}

/* ========== ANIMATIONS ========== */
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

.tg-cursor {
  display: inline-block;
  width: 8px;
  height: 16px;
  background: var(--tg-terminal-green);
  animation: tg-blink 1s step-end infinite;
  vertical-align: middle;
  margin-left: 2px;
}

.tg-fade-in {
  animation: tg-fade-up 0.6s ease both;
}

.tg-fade-in-1 { animation-delay: 0.1s; }
.tg-fade-in-2 { animation-delay: 0.2s; }
.tg-fade-in-3 { animation-delay: 0.3s; }
.tg-fade-in-4 { animation-delay: 0.4s; }
.tg-fade-in-5 { animation-delay: 0.5s; }
.tg-fade-in-6 { animation-delay: 0.6s; }

@media (prefers-reduced-motion: reduce) {
  .tg-cursor { animation: none; opacity: 1; }
  .tg-fade-in { animation: none; opacity: 1; transform: none; }
  .tg-status-dot { animation: none !important; }
  .tg-dot { animation: none !important; }
}

/* 1440p+ */
@media (min-width: 1440px) {
  /* Content sections with margin: auto — constrain width */
  .tg-hero, .tg-section { max-width: 1400px; }
  /* Full-width sections (have bg color) — scale inner content instead */
  .tg-encrypt-section, .tg-cta, .tg-stats { max-width: none; }
  .tg-encrypt-inner { max-width: 1400px; }
  .tg-footer { max-width: none; }
  .tg-nav { max-width: none; padding: 0 clamp(32px, 4vw, 120px); }

  .tg-hero { min-height: calc(100vh - 64px); padding: 100px 40px 80px; gap: 48px; }
  .tg-hero-headline { font-size: 68px; }
  .tg-hero-sub { font-size: 18px; max-width: 500px; }
  .tg-section { padding: 80px 40px; min-height: 70vh; display: flex; flex-direction: column; justify-content: center; }
  .tg-encrypt-section { padding: 80px 40px; min-height: 70vh; display: flex; flex-direction: column; justify-content: center; align-items: center; }
  .tg-section-title { font-size: 30px; }
  .tg-nav { height: 64px; }
  .tg-nav-link { font-size: 15px; }
  .tg-btn { padding: 12px 24px; font-size: 15px; }
  .tg-btn-secondary { padding: 12px 24px; font-size: 15px; }
  .tg-stat-number { font-size: 36px; }
  .tg-stat-label { font-size: 13px; }
  .tg-footer { padding: 32px clamp(32px, 4vw, 120px); font-size: 14px; }
  .tg-showcase-card { padding: 24px; }
  .tg-showcase-card h3 { font-size: 16px; }
  .tg-showcase-card p { font-size: 14px; }
  .tg-terminal-body { font-size: 14px; padding: 24px; }
  .tg-cta { min-height: 60vh; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 80px clamp(32px, 4vw, 120px); }
}

/* 2K (1920px+) */
@media (min-width: 1920px) {
  .tg-hero, .tg-section { max-width: 1600px; }
  .tg-encrypt-inner { max-width: 1600px; }
  .tg-nav { padding: 0 clamp(48px, 5vw, 200px); }

  .tg-hero { padding: 0 48px; min-height: calc(100vh - 72px); }
  .tg-hero-headline { font-size: 84px; }
  .tg-hero-sub { font-size: 21px; max-width: 580px; line-height: 1.7; }
  .tg-section { padding: 0 48px; min-height: 80vh; }
  .tg-encrypt-section { padding: 0 48px; min-height: 80vh; }
  .tg-section-title { font-size: 38px; }
  .tg-section-sub { font-size: 17px; }
  .tg-nav { height: 72px; }
  .tg-logo-text { font-size: 18px; }
  .tg-nav-link { font-size: 16px; }
  .tg-btn { padding: 14px 28px; font-size: 16px; }
  .tg-btn-secondary { padding: 14px 28px; font-size: 16px; }
  .tg-stat-number { font-size: 48px; }
  .tg-stat-label { font-size: 15px; }
  .tg-stat-cell { padding: 36px 28px; }
  .tg-footer { padding: 40px clamp(48px, 5vw, 200px); font-size: 15px; }
  .tg-showcase-grid { gap: 28px; }
  .tg-showcase-card { padding: 28px; }
  .tg-showcase-card h3 { font-size: 18px; }
  .tg-showcase-card p { font-size: 16px; line-height: 1.7; }
  .tg-terminal-body { font-size: 15px; padding: 28px; }
  .tg-sync-panel { font-size: 15px; }
  .tg-encrypt-flow { gap: 24px; }
  .tg-encrypt-panel { padding: 32px; min-height: 280px; font-size: 14px; }
  .tg-encrypt-tagline { font-size: 16px; max-width: 720px; }
  .tg-cta { padding: 0 clamp(48px, 5vw, 200px); }
  .tg-cta-headline { font-size: 52px; }
  .tg-cta-sub { font-size: 19px; max-width: 600px; }
}

/* 4K (2560px+) — aggressive scaling, use vw for proportional sizing */
@media (min-width: 2560px) {
  .tg-hero, .tg-section { max-width: 80vw; }
  .tg-encrypt-inner { max-width: 80vw; }
  .tg-nav { padding: 0 10vw; height: 80px; }

  .tg-hero { padding: 0 0; min-height: calc(100vh - 80px); gap: 5vw; }
  .tg-hero-headline { font-size: clamp(96px, 3.2vw, 160px); }
  .tg-hero-sub { font-size: clamp(22px, 0.7vw, 32px); max-width: 40vw; line-height: 1.7; margin-bottom: 40px; }
  .tg-hero-actions { gap: 20px; }
  .tg-section { padding: 0; min-height: 85vh; }
  .tg-encrypt-section { padding: 6vh 10vw; min-height: 85vh; }
  .tg-section-title { font-size: clamp(40px, 1.4vw, 64px); margin-bottom: 16px; }
  .tg-section-sub { font-size: clamp(16px, 0.55vw, 24px); }

  .tg-logo-box { width: 44px; height: 44px; font-size: 20px; border-width: 3px; }
  .tg-logo-text { font-size: clamp(18px, 0.6vw, 28px); }
  .tg-nav-link { font-size: clamp(16px, 0.5vw, 22px); }
  .tg-theme-toggle { width: 48px; height: 48px; font-size: 22px; }
  .tg-btn { padding: 18px 40px; font-size: clamp(16px, 0.5vw, 22px); border-width: 3px; }
  .tg-btn-secondary { padding: 18px 40px; font-size: clamp(16px, 0.5vw, 22px); border-width: 3px; }
  .tg-btn-outline { padding: 18px 40px; }

  .tg-terminal { border-width: 3px; }
  .tg-terminal-bar { padding: 14px 20px; }
  .tg-terminal-body { font-size: clamp(15px, 0.45vw, 20px); padding: 32px 36px; line-height: 1.7; }
  .tg-terminal-title { font-size: clamp(12px, 0.4vw, 16px); }

  .tg-showcase-grid { gap: 2vw; }
  .tg-showcase-card { padding: 2vw; border-width: 3px; }
  .tg-showcase-card h3 { font-size: clamp(18px, 0.6vw, 28px); }
  .tg-showcase-card p { font-size: clamp(15px, 0.5vw, 22px); line-height: 1.7; }

  .tg-sync-panel { font-size: clamp(14px, 0.45vw, 20px); border-width: 3px; padding: 2vw; }
  .tg-sync-header { font-size: clamp(12px, 0.38vw, 16px); padding: 12px 2vw; }
  .tg-sync-item { padding: 10px 2vw; font-size: clamp(14px, 0.45vw, 20px); }

  .tg-encrypt-flow { gap: 3vw; }
  .tg-encrypt-panel { padding: 2.5vw; min-height: 300px; font-size: clamp(13px, 0.4vw, 18px); border-width: 3px; }
  .tg-encrypt-panel-title { font-size: clamp(12px, 0.4vw, 16px); }
  .tg-encrypt-middle { padding: 24px; }
  .tg-encrypt-tagline { font-size: clamp(16px, 0.5vw, 24px); max-width: 60vw; margin-top: 3vw; }

  .tg-stat-number { font-size: clamp(48px, 1.6vw, 80px); }
  .tg-stat-label { font-size: clamp(14px, 0.45vw, 20px); }
  .tg-stat-cell { padding: 3vw 2vw; }

  .tg-cta { padding: 8vh 10vw; min-height: 60vh; }
  .tg-cta-headline { font-size: clamp(52px, 1.8vw, 96px); }
  .tg-cta-sub { font-size: clamp(18px, 0.6vw, 28px); max-width: 50vw; }

  .tg-footer { padding: 3vw 10vw; font-size: clamp(14px, 0.45vw, 20px); }
}

/* ========== NAV ========== */
.tg-nav {
  position: sticky;
  top: 0;
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 32px;
  height: 64px;
  background: var(--tg-bg);
  border-bottom: 3px solid var(--tg-border);
}

.tg-nav-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.tg-logo-box {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  background: var(--tg-green);
  border: 3px solid var(--tg-border);
  font-family: var(--tg-font-mono);
  font-weight: 700;
  font-size: 16px;
  color: #000;
}

.tg-logo-text {
  font-family: var(--tg-font-mono);
  font-weight: 700;
  font-size: 16px;
  letter-spacing: -0.02em;
}

.tg-nav-right {
  display: flex;
  align-items: center;
  gap: 16px;
}

.tg-theme-toggle {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border: 3px solid var(--tg-border);
  background: var(--tg-bg);
  color: var(--tg-text);
  font-size: 18px;
  cursor: pointer;
  transition: transform 0.15s ease, box-shadow 0.15s ease;
}

.tg-theme-toggle:hover {
  transform: translate(-2px, -2px);
  box-shadow: var(--tg-shadow);
}

.tg-nav-link {
  font-family: var(--tg-font-mono);
  font-size: 14px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--tg-text);
  text-decoration: none;
  padding: 8px 12px;
  border: 3px solid transparent;
  transition: border-color 0.15s ease;
}

.tg-nav-link:hover {
  border-color: var(--tg-border);
}

.tg-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 10px 20px;
  background: var(--tg-green);
  color: #000;
  border: 3px solid var(--tg-border);
  font-family: var(--tg-font-mono);
  font-weight: 700;
  font-size: 14px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  cursor: pointer;
  text-decoration: none;
  transition: transform 0.15s ease, box-shadow 0.15s ease;
}

.tg-btn:hover {
  transform: translate(-2px, -2px);
  box-shadow: var(--tg-shadow);
}

.tg-btn-outline {
  background: var(--tg-bg);
  color: var(--tg-text);
}

/* ========== HERO ========== */
.tg-hero {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 48px;
  max-width: 1280px;
  margin: 0 auto;
  padding: 80px 32px 64px;
  align-items: center;
}

.tg-hero-headline {
  font-family: var(--tg-font-mono);
  font-size: clamp(2.5rem, 5.5vw, 5rem);
  font-weight: 700;
  line-height: 1.05;
  letter-spacing: -0.03em;
  margin: 0 0 24px;
}

.tg-hero-headline span {
  color: var(--tg-green);
}

.tg-hero-sub {
  font-family: var(--tg-font-mono);
  font-size: 14px;
  color: var(--tg-text-secondary);
  line-height: 1.6;
  max-width: 420px;
  margin: 0 0 32px;
}

.tg-hero-actions {
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
}

/* ========== TERMINAL WINDOW ========== */
.tg-terminal {
  background: var(--tg-terminal-bg);
  border: 3px solid var(--tg-border);
  box-shadow: var(--tg-shadow);
  overflow: hidden;
  width: 100%;
}

.tg-terminal-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  background: #1a1a1a;
  border-bottom: 2px solid #333;
}

.tg-root[data-theme="dark"] .tg-terminal-bar {
  background: #1a1a1a;
  border-bottom-color: #2a2a2a;
}

.tg-terminal-dot {
  width: 12px;
  height: 12px;
  border: 2px solid #555;
}

.tg-terminal-dot:nth-child(1) { background: #ff5f57; border-color: #cc4c40; }
.tg-terminal-dot:nth-child(2) { background: #febc2e; border-color: #cb9625; }
.tg-terminal-dot:nth-child(3) { background: #28c840; border-color: #20a033; }

.tg-terminal-title {
  flex: 1;
  text-align: center;
  font-family: var(--tg-font-mono);
  font-size: 12px;
  color: #666;
}

.tg-terminal-body {
  padding: 20px;
  font-family: var(--tg-font-mono);
  font-size: 13px;
  line-height: 1.7;
  color: var(--tg-terminal-text);
  overflow-x: auto;
}

.tg-terminal-body .tg-prompt {
  color: var(--tg-terminal-green);
}

.tg-terminal-body .tg-cmd {
  color: #ffffff;
  font-weight: 700;
}

.tg-terminal-body .tg-dim {
  color: var(--tg-terminal-dim);
}

.tg-terminal-body .tg-green {
  color: var(--tg-terminal-green);
}

.tg-terminal-body .tg-yellow {
  color: var(--tg-terminal-yellow);
}

.tg-terminal-body .tg-blue {
  color: var(--tg-terminal-blue);
}

.tg-terminal-body .tg-red {
  color: var(--tg-terminal-red);
}

.tg-terminal-body .tg-white {
  color: #ffffff;
}

.tg-terminal-body .tg-bold {
  font-weight: 700;
}

/* ========== SECTION SHARED ========== */
.tg-section {
  max-width: 1280px;
  margin: 0 auto;
  padding: 64px 32px;
}

.tg-section-label {
  font-family: var(--tg-font-mono);
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.15em;
  color: var(--tg-green);
  margin: 0 0 16px;
}

.tg-section-title {
  font-family: var(--tg-font-mono);
  font-size: clamp(1.5rem, 3vw, 2.25rem);
  font-weight: 700;
  line-height: 1.15;
  margin: 0 0 48px;
}

/* ========== FILE SYNC VISUAL ========== */
.tg-sync-section {
  background: var(--tg-bg-alt);
  border-top: 3px solid var(--tg-border);
  border-bottom: 3px solid var(--tg-border);
}

.tg-sync-grid {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  gap: 0;
  align-items: stretch;
}

.tg-sync-panel {
  background: var(--tg-surface);
  border: 3px solid var(--tg-border);
  padding: 0;
  min-height: 320px;
}

.tg-sync-panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 20px;
  border-bottom: 3px solid var(--tg-border);
  font-family: var(--tg-font-mono);
  font-weight: 700;
  font-size: 12px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}

.tg-sync-panel-header .tg-panel-icon {
  color: var(--tg-green);
}

.tg-file-list {
  list-style: none;
  margin: 0;
  padding: 0;
}

.tg-file-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 20px;
  border-bottom: 1px solid var(--tg-bg-alt);
  font-family: var(--tg-font-mono);
  font-size: 13px;
  transition: background 0.1s ease;
}

.tg-file-item:last-child {
  border-bottom: none;
}

.tg-file-item:hover {
  background: var(--tg-green-dim);
}

.tg-status-dot {
  width: 8px;
  height: 8px;
  flex-shrink: 0;
}

.tg-status-dot.tg-synced { background: var(--tg-terminal-green); animation: tg-pulse 2s ease-in-out infinite; }
.tg-status-dot.tg-changed { background: var(--tg-terminal-yellow); animation: tg-pulse 1.5s ease-in-out infinite; }
.tg-status-dot.tg-new { background: var(--tg-terminal-blue); animation: tg-pulse 1.8s ease-in-out infinite; }

.tg-file-name {
  flex: 1;
}

.tg-file-meta {
  font-size: 11px;
  color: var(--tg-text-secondary);
}

.tg-sync-arrows {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 20px 24px;
  gap: 12px;
}

.tg-arrow-line {
  width: 48px;
  height: 3px;
  background: var(--tg-green);
  position: relative;
}

.tg-arrow-line::after {
  content: '';
  position: absolute;
  right: -2px;
  top: -5px;
  width: 0;
  height: 0;
  border-left: 8px solid var(--tg-green);
  border-top: 6px solid transparent;
  border-bottom: 6px solid transparent;
}

.tg-arrow-label {
  font-family: var(--tg-font-mono);
  font-size: 10px;
  font-weight: 700;
  color: var(--tg-green);
  text-transform: uppercase;
  letter-spacing: 0.1em;
  writing-mode: vertical-lr;
  text-orientation: mixed;
}

/* ========== TERMINAL SHOWCASE ========== */
.tg-showcase-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 24px;
}

/* ========== ENCRYPTION VISUAL ========== */
.tg-encrypt-section {
  background: var(--tg-terminal-bg);
  border-top: 3px solid var(--tg-border);
  border-bottom: 3px solid var(--tg-border);
  padding: 64px 32px;
}

.tg-encrypt-inner {
  max-width: 1280px;
  margin: 0 auto;
}

.tg-encrypt-flow {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  gap: 0;
  align-items: stretch;
}

.tg-encrypt-panel {
  border: 3px solid #333;
  padding: 24px;
  min-height: 220px;
}

.tg-encrypt-panel-label {
  font-family: var(--tg-font-mono);
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--tg-terminal-green);
  margin: 0 0 16px;
}

.tg-encrypt-panel pre {
  font-family: var(--tg-font-mono);
  font-size: 12px;
  line-height: 1.7;
  color: var(--tg-terminal-text);
  margin: 0;
  white-space: pre-wrap;
  word-break: break-all;
}

.tg-encrypt-middle {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 24px 32px;
  gap: 16px;
}

.tg-lock-icon {
  font-size: 48px;
  line-height: 1;
}

.tg-encrypt-algo {
  font-family: var(--tg-font-mono);
  font-size: 11px;
  font-weight: 700;
  color: var(--tg-terminal-green);
  text-align: center;
  letter-spacing: 0.05em;
}

.tg-encrypt-dots {
  display: flex;
  gap: 6px;
}

.tg-dot {
  width: 6px;
  height: 6px;
  background: var(--tg-terminal-green);
  animation: tg-dot-flow 1.5s ease-in-out infinite;
}

.tg-dot:nth-child(2) { animation-delay: 0.2s; }
.tg-dot:nth-child(3) { animation-delay: 0.4s; }
.tg-dot:nth-child(4) { animation-delay: 0.6s; }
.tg-dot:nth-child(5) { animation-delay: 0.8s; }

.tg-encrypt-tagline {
  font-family: var(--tg-font-mono);
  font-size: 14px;
  color: var(--tg-terminal-text);
  text-align: center;
  max-width: 600px;
  margin: 40px auto 0;
  line-height: 1.6;
}

.tg-encrypt-tagline strong {
  color: var(--tg-terminal-green);
}

/* ========== STATS STRIP ========== */
.tg-stats {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  border-top: 4px solid var(--tg-border);
  border-bottom: 4px solid var(--tg-border);
}

.tg-stat-cell {
  padding: 32px 24px;
  text-align: center;
  border-right: 3px solid var(--tg-border);
  background: var(--tg-bg);
}

.tg-stat-cell:last-child {
  border-right: none;
}

.tg-stat-value {
  font-family: var(--tg-font-mono);
  font-size: clamp(1.1rem, 2vw, 1.5rem);
  font-weight: 700;
  color: var(--tg-text);
  margin: 0 0 4px;
  letter-spacing: -0.02em;
}

.tg-stat-label {
  font-family: var(--tg-font-mono);
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.15em;
  color: var(--tg-green);
}

/* ========== CTA ========== */
.tg-cta {
  background: var(--tg-green);
  border-top: 4px solid var(--tg-border);
  border-bottom: 4px solid var(--tg-border);
  padding: 80px 32px;
  text-align: center;
}

.tg-cta-headline {
  font-family: var(--tg-font-mono);
  font-size: clamp(2rem, 5vw, 4rem);
  font-weight: 700;
  color: #000;
  margin: 0 0 32px;
  letter-spacing: -0.03em;
}

.tg-cta-actions {
  display: flex;
  justify-content: center;
  gap: 16px;
  margin-bottom: 48px;
  flex-wrap: wrap;
}

.tg-cta .tg-btn {
  background: #000;
  color: var(--tg-green);
  border-color: #000;
}

.tg-cta .tg-btn:hover {
  box-shadow: 6px 6px 0 rgba(0,0,0,0.3);
}

.tg-cta .tg-terminal {
  max-width: 540px;
  margin: 0 auto;
  border-color: #000;
  box-shadow: 4px 4px 0 rgba(0,0,0,0.3);
}

/* ========== FOOTER ========== */
.tg-footer {
  border-top: 3px solid var(--tg-border);
  padding: 32px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-family: var(--tg-font-mono);
  font-size: 12px;
  color: var(--tg-text-secondary);
  background: var(--tg-bg);
  flex-wrap: wrap;
  gap: 16px;
}

.tg-footer-links {
  display: flex;
  gap: 24px;
}

.tg-footer-links a {
  color: var(--tg-text-secondary);
  text-decoration: none;
  transition: color 0.15s ease;
}

.tg-footer-links a:hover {
  color: var(--tg-green);
}

/* ========== RESPONSIVE ========== */
@media (max-width: 900px) {
  .tg-hero {
    grid-template-columns: 1fr;
    padding: 48px 24px 40px;
    gap: 32px;
  }

  .tg-showcase-grid {
    grid-template-columns: 1fr;
    gap: 20px;
  }

  .tg-sync-grid {
    grid-template-columns: 1fr;
    gap: 0;
  }

  .tg-sync-arrows {
    flex-direction: row;
    padding: 16px 24px;
    writing-mode: initial;
  }

  .tg-arrow-line {
    width: 3px;
    height: 32px;
  }

  .tg-arrow-line::after {
    right: auto;
    left: -5px;
    top: auto;
    bottom: -2px;
    border-left: 6px solid transparent;
    border-right: 6px solid transparent;
    border-top: 8px solid var(--tg-green);
  }

  .tg-arrow-label {
    writing-mode: initial;
  }

  .tg-encrypt-flow {
    grid-template-columns: 1fr;
  }

  .tg-encrypt-middle {
    flex-direction: row;
    padding: 16px 24px;
  }

  .tg-encrypt-dots {
    flex-direction: column;
  }

  .tg-stats {
    grid-template-columns: repeat(2, 1fr);
  }

  .tg-stat-cell:nth-child(2) {
    border-right: none;
  }

  .tg-stat-cell:nth-child(1),
  .tg-stat-cell:nth-child(2) {
    border-bottom: 3px solid var(--tg-border);
  }

  .tg-section {
    padding: 48px 24px;
  }

  .tg-encrypt-section {
    padding: 48px 24px;
  }
}

@media (max-width: 480px) {
  .tg-nav {
    padding: 0 16px;
  }

  .tg-nav-link {
    display: none;
  }

  .tg-hero {
    padding: 32px 16px;
  }

  .tg-section {
    padding: 32px 16px;
  }

  .tg-encrypt-section {
    padding: 32px 16px;
  }

  .tg-stats {
    grid-template-columns: 1fr 1fr;
  }

  .tg-cta {
    padding: 48px 16px;
  }

  .tg-terminal-body {
    padding: 16px;
    font-size: 11px;
  }

  .tg-footer {
    padding: 24px 16px;
    flex-direction: column;
    text-align: center;
  }
}
`,
        }}
      />

      {/* ===== NAV ===== */}
      <nav className="tg-nav">
        <div className="tg-nav-left">
          <div className="tg-logo-box">TG</div>
          <span className="tg-logo-text">tokengate.dev</span>
        </div>
        <div className="tg-nav-right">
          <button
            className="tg-theme-toggle"
            onClick={() => setDark(!dark)}
            aria-label="Toggle dark mode"
          >
            {dark ? "☀" : "☾"}
          </button>
          <Link href="/docs" className="tg-nav-link">
            Docs
          </Link>
          <SignedOut>
            <SignInButton mode="modal">
              <button className="tg-btn">Sign In</button>
            </SignInButton>
          </SignedOut>
          <SignedIn>
            <Link className="tg-btn" href="/dashboard">
              Dashboard
            </Link>
          </SignedIn>
        </div>
      </nav>

      {/* ===== HERO ===== */}
      <section className="tg-hero">
        <div className="tg-fade-in">
          <h1 className="tg-hero-headline">
            <span>ENCRYPT.</span>
            <br />
            <span>SYNC.</span>
            <br />
            SHIP.
          </h1>
          <p className="tg-hero-sub">
            Zero-knowledge encrypted environment variables.
            <br />
            CLI + web dashboard. Per-environment passwords.
          </p>
          <div className="tg-hero-actions">
            <SignedOut>
              <SignInButton mode="modal">
                <button className="tg-btn">Get Started</button>
              </SignInButton>
            </SignedOut>
            <SignedIn>
              <Link className="tg-btn" href="/dashboard">
                Open Dashboard
              </Link>
            </SignedIn>
            <Link href="/docs" className="tg-btn tg-btn-outline">
              Read Docs
            </Link>
          </div>
        </div>
        <div className="tg-fade-in tg-fade-in-2">
          <div className="tg-terminal">
            <div className="tg-terminal-bar">
              <div className="tg-terminal-dot" />
              <div className="tg-terminal-dot" />
              <div className="tg-terminal-dot" />
              <span className="tg-terminal-title">tokengate init</span>
            </div>
            <div className="tg-terminal-body">
              <div>
                <span className="tg-prompt">$ </span>
                <span className="tg-cmd">npx tokengate init</span>
              </div>
              <br />
              <div>
                <span className="tg-green tg-bold">
                  ▲ Tokengate
                </span>
                <span className="tg-dim"> v1.2.0</span>
              </div>
              <br />
              <div>
                <span className="tg-dim">? </span>
                <span className="tg-white tg-bold">Select workspace</span>
              </div>
              <div>
                <span className="tg-green">  ❯ acme-corp</span>
              </div>
              <div>
                <span className="tg-dim">    personal-projects</span>
              </div>
              <div>
                <span className="tg-dim">    freelance-2024</span>
              </div>
              <br />
              <div>
                <span className="tg-dim">? </span>
                <span className="tg-white tg-bold">Environment name </span>
                <span className="tg-green">production</span>
              </div>
              <br />
              <div>
                <span className="tg-dim">? </span>
                <span className="tg-white tg-bold">Encryption password </span>
                <span className="tg-dim">••••••••••••</span>
              </div>
              <br />
              <div>
                <span className="tg-green">✔</span>
                <span className="tg-white">
                  {" "}
                  Workspace linked to{" "}
                </span>
                <span className="tg-green tg-bold">acme-corp</span>
              </div>
              <div>
                <span className="tg-green">✔</span>
                <span className="tg-white">
                  {" "}
                  Environment{" "}
                </span>
                <span className="tg-green tg-bold">production</span>
                <span className="tg-white"> ready</span>
              </div>
              <div>
                <span className="tg-green">✔</span>
                <span className="tg-white"> Encryption configured</span>
              </div>
              <br />
              <div>
                <span className="tg-dim">
                  Run{" "}
                </span>
                <span className="tg-white tg-bold">tokengate push</span>
                <span className="tg-dim"> to sync your .env files</span>
              </div>
              <div>
                <span className="tg-prompt">$ </span>
                <span className="tg-cursor" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== FILE SYNC VISUAL ===== */}
      <section className="tg-sync-section">
        <div className="tg-section" style={{ paddingTop: 48, paddingBottom: 48 }}>
          <p className="tg-section-label tg-fade-in tg-fade-in-1">Multi-file Sync</p>
          <div className="tg-sync-grid tg-fade-in tg-fade-in-2">
            {/* LOCAL */}
            <div className="tg-sync-panel">
              <div className="tg-sync-panel-header">
                <span>Local</span>
                <span className="tg-panel-icon">~/project</span>
              </div>
              <ul className="tg-file-list">
                <li className="tg-file-item">
                  <span className="tg-status-dot tg-synced" />
                  <span className="tg-file-name">.env</span>
                  <span className="tg-file-meta">12 vars</span>
                </li>
                <li className="tg-file-item">
                  <span className="tg-status-dot tg-changed" />
                  <span className="tg-file-name">.env.local</span>
                  <span className="tg-file-meta">8 vars</span>
                </li>
                <li className="tg-file-item">
                  <span className="tg-status-dot tg-synced" />
                  <span className="tg-file-name">.env.production</span>
                  <span className="tg-file-meta">15 vars</span>
                </li>
                <li className="tg-file-item">
                  <span className="tg-status-dot tg-new" />
                  <span className="tg-file-name">.env.staging</span>
                  <span className="tg-file-meta">14 vars</span>
                </li>
              </ul>
            </div>

            {/* ARROWS */}
            <div className="tg-sync-arrows">
              <div className="tg-arrow-line" />
              <span className="tg-arrow-label">SYNC</span>
              <div className="tg-arrow-line" />
              <div className="tg-arrow-line" />
              <div className="tg-arrow-line" />
            </div>

            {/* REMOTE */}
            <div className="tg-sync-panel">
              <div className="tg-sync-panel-header">
                <span>Remote</span>
                <span className="tg-panel-icon">acme-corp</span>
              </div>
              <ul className="tg-file-list">
                <li className="tg-file-item">
                  <span className="tg-status-dot tg-synced" />
                  <span className="tg-file-name">default</span>
                  <span className="tg-file-meta">rev #4</span>
                </li>
                <li className="tg-file-item">
                  <span className="tg-status-dot tg-changed" />
                  <span className="tg-file-name">local</span>
                  <span className="tg-file-meta">rev #2</span>
                </li>
                <li className="tg-file-item">
                  <span className="tg-status-dot tg-synced" />
                  <span className="tg-file-name">production</span>
                  <span className="tg-file-meta">rev #7</span>
                </li>
                <li className="tg-file-item">
                  <span className="tg-status-dot tg-new" />
                  <span className="tg-file-name">staging</span>
                  <span className="tg-file-meta">new</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ===== TERMINAL SHOWCASE ===== */}
      <section className="tg-section">
        <p className="tg-section-label tg-fade-in tg-fade-in-1">CLI Workflow</p>
        <h2 className="tg-section-title tg-fade-in tg-fade-in-2">
          Push. Pull. History.
        </h2>
        <div className="tg-showcase-grid">
          {/* PUSH */}
          <div className="tg-terminal tg-fade-in tg-fade-in-3">
            <div className="tg-terminal-bar">
              <div className="tg-terminal-dot" />
              <div className="tg-terminal-dot" />
              <div className="tg-terminal-dot" />
              <span className="tg-terminal-title">push</span>
            </div>
            <div className="tg-terminal-body">
              <div>
                <span className="tg-prompt">$ </span>
                <span className="tg-cmd">tokengate push</span>
              </div>
              <br />
              <div><span className="tg-dim">Scanning .env files...</span></div>
              <br />
              <div><span className="tg-white tg-bold">  File              Status</span></div>
              <div><span className="tg-dim">  ─────────────────────────</span></div>
              <div>
                <span className="tg-green">  ✓ </span>
                <span className="tg-white">.env            </span>
                <span className="tg-dim">synced</span>
              </div>
              <div>
                <span className="tg-yellow">  ~ </span>
                <span className="tg-white">.env.local      </span>
                <span className="tg-yellow">changed</span>
              </div>
              <div>
                <span className="tg-blue">  + </span>
                <span className="tg-white">.env.staging    </span>
                <span className="tg-blue">new</span>
              </div>
              <br />
              <div>
                <span className="tg-dim">? </span>
                <span className="tg-white">Push changes? </span>
                <span className="tg-green">Yes</span>
              </div>
              <br />
              <div>
                <span className="tg-dim">Encrypting...</span>
              </div>
              <div>
                <span className="tg-green">✔</span>
                <span className="tg-white"> .env.local → </span>
                <span className="tg-green">rev #3</span>
              </div>
              <div>
                <span className="tg-green">✔</span>
                <span className="tg-white"> .env.staging → </span>
                <span className="tg-green">rev #1</span>
              </div>
            </div>
          </div>

          {/* PULL */}
          <div className="tg-terminal tg-fade-in tg-fade-in-4">
            <div className="tg-terminal-bar">
              <div className="tg-terminal-dot" />
              <div className="tg-terminal-dot" />
              <div className="tg-terminal-dot" />
              <span className="tg-terminal-title">pull</span>
            </div>
            <div className="tg-terminal-body">
              <div>
                <span className="tg-prompt">$ </span>
                <span className="tg-cmd">tokengate pull</span>
              </div>
              <br />
              <div><span className="tg-dim">Checking remote...</span></div>
              <br />
              <div><span className="tg-white tg-bold">  File              Status</span></div>
              <div><span className="tg-dim">  ─────────────────────────</span></div>
              <div>
                <span className="tg-yellow">  ↓ </span>
                <span className="tg-white">.env            </span>
                <span className="tg-yellow">remote differs</span>
              </div>
              <div>
                <span className="tg-green">  ✓ </span>
                <span className="tg-white">.env.local      </span>
                <span className="tg-dim">synced</span>
              </div>
              <div>
                <span className="tg-yellow">  ↓ </span>
                <span className="tg-white">.env.production </span>
                <span className="tg-yellow">remote differs</span>
              </div>
              <br />
              <div><span className="tg-dim">Decrypting...</span></div>
              <div>
                <span className="tg-green">✔</span>
                <span className="tg-white"> .env            </span>
                <span className="tg-dim">← rev #5</span>
              </div>
              <div>
                <span className="tg-green">✔</span>
                <span className="tg-white"> .env.production </span>
                <span className="tg-dim">← rev #8</span>
              </div>
              <br />
              <div>
                <span className="tg-green tg-bold">All files up to date.</span>
              </div>
            </div>
          </div>

          {/* HISTORY */}
          <div className="tg-terminal tg-fade-in tg-fade-in-5">
            <div className="tg-terminal-bar">
              <div className="tg-terminal-dot" />
              <div className="tg-terminal-dot" />
              <div className="tg-terminal-dot" />
              <span className="tg-terminal-title">history</span>
            </div>
            <div className="tg-terminal-body">
              <div>
                <span className="tg-prompt">$ </span>
                <span className="tg-cmd">tokengate history production</span>
              </div>
              <br />
              <div><span className="tg-white tg-bold">  production — 7 revisions</span></div>
              <br />
              <div>
                <span className="tg-green">  #7 </span>
                <span className="tg-dim">2024-01-15 14:32 </span>
                <span className="tg-white">a3f8c1d </span>
                <span className="tg-blue">sarah</span>
              </div>
              <div>
                <span className="tg-dim">  #6 </span>
                <span className="tg-dim">2024-01-14 09:18 </span>
                <span className="tg-white">b7e2f4a </span>
                <span className="tg-blue">alex</span>
              </div>
              <div>
                <span className="tg-dim">  #5 </span>
                <span className="tg-dim">2024-01-12 16:45 </span>
                <span className="tg-white">c1d9e3b </span>
                <span className="tg-blue">sarah</span>
              </div>
              <div>
                <span className="tg-dim">  #4 </span>
                <span className="tg-dim">2024-01-10 11:22 </span>
                <span className="tg-white">d4a6f8c </span>
                <span className="tg-blue">james</span>
              </div>
              <div>
                <span className="tg-dim">  #3 </span>
                <span className="tg-dim">2024-01-08 08:55 </span>
                <span className="tg-white">e9b2c7d </span>
                <span className="tg-blue">alex</span>
              </div>
              <div>
                <span className="tg-dim">  #2 </span>
                <span className="tg-dim">2024-01-05 13:10 </span>
                <span className="tg-white">f3e8a1b </span>
                <span className="tg-blue">sarah</span>
              </div>
              <div>
                <span className="tg-dim">  #1 </span>
                <span className="tg-dim">2024-01-03 10:00 </span>
                <span className="tg-white">a1c4d7e </span>
                <span className="tg-blue">james</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== ENCRYPTION VISUAL ===== */}
      <section className="tg-encrypt-section">
        <div className="tg-encrypt-inner">
          <p
            className="tg-section-label tg-fade-in tg-fade-in-1"
            style={{ color: "#00d68f" }}
          >
            End-to-End Encryption
          </p>
          <div className="tg-encrypt-flow tg-fade-in tg-fade-in-2">
            {/* PLAINTEXT */}
            <div className="tg-encrypt-panel">
              <p className="tg-encrypt-panel-label">Plaintext .env</p>
              <pre>{`DATABASE_URL=postgres://prod:s3cr3t@db.internal:5432/app
API_KEY=sk-live-a8f3b2c1d4e5f6a7b8c9
STRIPE_SECRET=sk_live_51HG3j2eZvKYlo2C0
REDIS_URL=redis://default:p4ssw0rd@cache:6379
JWT_SECRET=xK9#mP2$vL5nQ8wR3tY6
SENDGRID_KEY=SG.abc123.xyz789def`}</pre>
            </div>

            {/* MIDDLE */}
            <div className="tg-encrypt-middle">
              <div className="tg-lock-icon">🔒</div>
              <div className="tg-encrypt-algo">
                PBKDF2
                <br />
                ↓
                <br />
                AES-256-GCM
              </div>
              <div className="tg-encrypt-dots">
                <div className="tg-dot" />
                <div className="tg-dot" />
                <div className="tg-dot" />
                <div className="tg-dot" />
                <div className="tg-dot" />
              </div>
            </div>

            {/* CIPHERTEXT */}
            <div className="tg-encrypt-panel">
              <p className="tg-encrypt-panel-label">Encrypted Blob</p>
              <pre style={{ color: "#555", fontSize: 11 }}>{`jA0ECQMCkF3w8J+E7Gj/0sAB
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
          <p className="tg-encrypt-tagline tg-fade-in tg-fade-in-3">
            Your password <strong>never leaves your machine</strong>. We
            literally cannot read your secrets.
          </p>
        </div>
      </section>

      {/* ===== STATS STRIP ===== */}
      <div className="tg-stats">
        {[
          { value: "AES-256-GCM", label: "Cipher" },
          { value: "300K", label: "PBKDF2 Iterations" },
          { value: "E2E", label: "Encrypted" },
          { value: "ZERO", label: "Knowledge" },
        ].map((stat) => (
          <div key={stat.label} className="tg-stat-cell">
            <p className="tg-stat-value">{stat.value}</p>
            <p className="tg-stat-label">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* ===== CTA ===== */}
      <section className="tg-cta">
        <h2 className="tg-cta-headline">GET STARTED</h2>
        <div className="tg-cta-actions">
          <SignedOut>
            <SignInButton mode="modal">
              <button className="tg-btn">Create Account</button>
            </SignInButton>
          </SignedOut>
          <SignedIn>
            <Link className="tg-btn" href="/dashboard">
              Open Dashboard
            </Link>
          </SignedIn>
        </div>
        <div className="tg-terminal">
          <div className="tg-terminal-bar">
            <div className="tg-terminal-dot" />
            <div className="tg-terminal-dot" />
            <div className="tg-terminal-dot" />
            <span className="tg-terminal-title">terminal</span>
          </div>
          <div className="tg-terminal-body">
            <div>
              <span className="tg-prompt">$ </span>
              <span className="tg-cmd">npx tokengate init</span>
              <span className="tg-cursor" />
            </div>
          </div>
        </div>
      </section>

      {/* ===== FOOTER ===== */}
      <footer className="tg-footer">
        <span>&copy; 2024 tokengate.dev</span>
        <div className="tg-footer-links">
          <Link href="/docs">Docs</Link>
          <a
            href="https://github.com/tokengate"
            target="_blank"
            rel="noopener noreferrer"
          >
            GitHub
          </a>
          <Link href="/privacy">Privacy</Link>
        </div>
      </footer>
    </div>
  );
}
