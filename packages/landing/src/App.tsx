import { useEffect, useRef, useState, Fragment } from "react";
import { motion, AnimatePresence } from "framer-motion";
import LoadingScreen from "./LoadingScreen";
import { SplineScene } from "./SplineScene";

/* ── Typography constants ────────────────────────────────── */
const FS = { fontFamily: "var(--font-sans)" } as const;
const HEADING = { ...FS, fontWeight: 800, lineHeight: 0.92, letterSpacing: "-0.04em" } as const;
const HERO_H  = { ...FS, fontWeight: 800, lineHeight: 0.88, letterSpacing: "-0.05em" } as const;
const BODY    = { ...FS, fontWeight: 400, fontSize: 17, lineHeight: 1.65, letterSpacing: "-0.01em", color: "#555555" } as const;

/* ── Hooks ───────────────────────────────────────────────── */
function useInView(threshold = 0.1): [React.RefObject<HTMLDivElement>, boolean] {
  const ref = useRef<HTMLDivElement>(null!);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setVisible(true); obs.disconnect(); } },
      { threshold, rootMargin: "0px 0px -50px 0px" }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return [ref, visible];
}

function useCounter(target: number, duration: number, active: boolean): number {
  const [n, setN] = useState(0);
  useEffect(() => {
    if (!active) return;
    let start: number | null = null;
    const step = (ts: number) => {
      if (!start) start = ts;
      const p = Math.min((ts - start) / duration, 1);
      setN(Math.round((1 - Math.pow(1 - p, 3)) * target));
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [active, target, duration]);
  return n;
}

/* ── Shared UI helpers ───────────────────────────────────── */
function SLabel({ children, light }: { children: string; light?: boolean }) {
  return (
    <div className={light ? "section-label-light" : "section-label"}>
      <span style={{ color: light ? "#555555" : "#444444" }}>—</span>
      <span>{children}</span>
    </div>
  );
}

function H2({
  line1, line2, size = "clamp(40px,5.5vw,60px)", light = false, mb = 52,
}: { line1: string; line2: string; size?: string; light?: boolean; mb?: number }) {
  return (
    <div style={{ marginBottom: mb }}>
      <div style={{ ...HEADING, fontSize: size, color: light ? "#ffffff" : "#0a0a0a", display: "block" }}>{line1}</div>
      <div style={{ ...HEADING, fontSize: size, color: light ? "#555555" : "#aaaaaa", display: "block" }}>{line2}</div>
    </div>
  );
}

const W = ({ maxWidth = 1200, pad = "0 48px" }: { maxWidth?: number; pad?: string } = {}) => ({
  maxWidth, margin: "0 auto", padding: pad, width: "100%",
} as React.CSSProperties);

/* ── Custom Cursor ───────────────────────────────────────── */
function CustomCursor() {
  const ref = useRef<HTMLDivElement>(null);
  const [expanded, setExpanded] = useState(false);
  useEffect(() => {
    const move = (e: MouseEvent) => {
      if (ref.current)
        ref.current.style.transform = `translate(calc(${e.clientX}px - 50%), calc(${e.clientY}px - 50%))`;
    };
    const over = (e: MouseEvent) => setExpanded(!!(e.target as HTMLElement).closest("a,button,[data-hover]"));
    document.addEventListener("mousemove", move, { passive: true });
    document.addEventListener("mouseover", over, { passive: true });
    return () => { document.removeEventListener("mousemove", move); document.removeEventListener("mouseover", over); };
  }, []);
  return <div ref={ref} className={`custom-cursor${expanded ? " expanded" : ""}`} />;
}


/* ── Syntax highlighter ──────────────────────────────────── */
function renderCode(code: string): string {
  return code
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/(\/\/.+)|(#.+)/g, '<span style="color:#4a4a48;font-style:italic">$1$2</span>')
    .replace(/("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`(?:[^`\\]|\\.)*`)/g, '<span style="color:#86efac">$1</span>')
    .replace(/\b(import|export|const|let|var|function|async|await|return|new|from|if|else|type|interface)\b/g, '<span style="color:#93c5fd">$1</span>')
    .replace(/\b(\d+(\.\d+)?)\b/g, '<span style="color:#fcd34d">$1</span>');
}

/* ── Nav ─────────────────────────────────────────────────── */
function Nav() {
  const [floating, setFloating] = useState(false);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const fn = () => setFloating(window.scrollY > 80);
    window.addEventListener("scroll", fn, { passive: true });
    return () => window.removeEventListener("scroll", fn);
  }, []);
  const links = ["Compliance", "Process", "Developer"];
  // Both floating and transparent: dark text on silver/light bg
  const linkColor  = "#555555";
  const linkHover  = "#000000";
  const logoText   = "#000000";
  const logoBg     = "#000000";
  const logoStroke = "#ffffff";
  return (
    <nav className={`nav-base${floating ? " nav-floating" : ""}`}>
      <div style={{ ...W(), height: 60, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <a href="#" style={{ display: "flex", alignItems: "center", gap: 9, textDecoration: "none" }}>
          <div className="logo-mark" style={{ width: 28, height: 28, borderRadius: 7, background: logoBg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, transition: "background 0.3s" }}>
            <svg width="12" height="12" viewBox="0 0 14 14" fill="none">
              <path d="M2 7L5.5 10.5L12 3.5" stroke={logoStroke} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <span style={{ ...FS, fontWeight: 700, fontSize: 17, color: logoText, letterSpacing: "-0.02em", transition: "color 0.3s" }}>ClearAgent</span>
        </a>
        <div className="hidden md:flex" style={{ gap: 32, alignItems: "center" }}>
          {links.map((l) => (
            <a key={l} href={`#${l.toLowerCase()}`}
              style={{ ...FS, fontSize: 15, fontWeight: 400, letterSpacing: "-0.01em", color: linkColor, textDecoration: "none", transition: "color 0.15s" }}
              onMouseEnter={(e) => (e.currentTarget.style.color = linkHover)}
              onMouseLeave={(e) => (e.currentTarget.style.color = linkColor)}>{l}</a>
          ))}
        </div>
        <div className="hidden md:flex" style={{ gap: 10, alignItems: "center" }}>
          <a href="https://github.com/clearagent"
            style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "9px 18px", borderRadius: 9999, border: "1px solid rgba(0,0,0,0.18)", color: "#333333", fontSize: 14, fontFamily: "var(--font-sans)", textDecoration: "none", transition: "border-color 0.15s, color 0.15s" }}>
            <svg width="13" height="13" viewBox="0 0 16 16" fill="currentColor"><path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/></svg>
            GitHub
          </a>
          <a href="#developer" className="btn-black btn-sm">Get API Key</a>
        </div>
        <button onClick={() => setOpen(!open)} style={{ background: "none", border: "none", color: "#555555", cursor: "pointer", display: "flex", alignItems: "center" }} className="md:hidden">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            {open ? <path d="M4 4L16 16M16 4L4 16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/> : <path d="M3 6h14M3 10h14M3 14h14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>}
          </svg>
        </button>
      </div>
      {open && (
        <div style={{ borderTop: "1px solid rgba(0,0,0,0.08)", background: "rgba(255,255,255,0.96)", padding: "16px 48px 20px", display: "flex", flexDirection: "column", gap: 14 }}>
          {links.map((l) => <a key={l} href={`#${l.toLowerCase()}`} onClick={() => setOpen(false)} style={{ ...FS, fontSize: 15, color: "#555555", textDecoration: "none" }}>{l}</a>)}
          <div style={{ display: "flex", gap: 10, paddingTop: 4 }}>
            <a href="https://github.com/clearagent" style={{ flex: 1, justifyContent: "center", display: "inline-flex", alignItems: "center", padding: "9px 18px", borderRadius: 9999, border: "1px solid rgba(0,0,0,0.18)", color: "#333333", fontSize: 14, fontFamily: "var(--font-sans)", textDecoration: "none" }}>GitHub</a>
            <a href="#developer" className="btn-black btn-sm" style={{ flex: 1, justifyContent: "center" }} onClick={() => setOpen(false)}>Get API Key</a>
          </div>
        </div>
      )}
    </nav>
  );
}

/* ── Hero ────────────────────────────────────────────────── */
function Hero() {
  return (
    <section id="hero" style={{ minHeight: "100vh", display: "flex", alignItems: "center", paddingTop: 80, background: "transparent", position: "relative", overflow: "hidden" }}>
      {/* Spline Scene — full bleed, silver bg matches page bg, monochrome */}
      <div className="hero-spline-container" style={{ position: "absolute", inset: 0, zIndex: 0, pointerEvents: "none", filter: "grayscale(1)" }}>
        <SplineScene scene="https://prod.spline.design/d-QmlC-bFVNAgTfF/scene.splinecode" />
      </div>
      {/* Subtle left veil so text sits cleanly on silver */}
      <div style={{ position: "absolute", inset: 0, zIndex: 1, background: "linear-gradient(to right, rgba(227,227,227,0.85) 0%, rgba(227,227,227,0.55) 45%, transparent 70%)", pointerEvents: "none" }} />
      {/* Hero content */}
      <div style={{ ...W(), position: "relative", zIndex: 2 }}>
        <div style={{ maxWidth: 560 }}>
          <SLabel>AI Verification Infrastructure</SLabel>
          <h1 style={{ ...HERO_H, fontSize: "clamp(56px, 7vw, 88px)", marginBottom: 28, overflow: "visible" }}>
            <span className="hero-gradient-text" style={{ display: "block" }}>Verification</span>
            <span className="hero-gradient-text" style={{ display: "block" }}>infrastructure.</span>
          </h1>
          <p style={{ ...BODY, maxWidth: 420, marginBottom: 36 }}>
            Append-only audit trails, human oversight enforcement, and hash-verified
            decision logs built to satisfy EU AI Act Articles 12, 14, and 19.
          </p>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 44 }}>
            <a href="#developer" className="btn-black">Get started free <span className="arrow">→</span></a>
            <a href="https://github.com/clearagent" className="btn-outline">Read the docs</a>
          </div>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 13, color: "#888888", letterSpacing: "0.02em" }}>
            80 events verified &nbsp;&nbsp;·&nbsp;&nbsp; 100% chain integrity &nbsp;&nbsp;·&nbsp;&nbsp; 10 human reviews
          </div>
        </div>
      </div>
    </section>
  );
}

/* ══ WOW FACTOR — Hash Chain Tamper Demo ════════════════════ */

type TamperState = "idle" | "injecting" | "broken" | "detected" | "restoring" | "restored";

const CHAIN_BLOCKS = [
  { id: "001", agent: "risk-agent",    event: "evaluate",       hash: "a3f4b2c1" },
  { id: "002", agent: "payment-agent", event: "transfer $9,500", hash: "9e1b7a3d" },
  { id: "003", agent: "audit-agent",   event: "log record",     hash: "7c2d8f5e" },
  { id: "004", agent: "comp-agent",    event: "export audit",   hash: "3b9a1c6f" },
] as const;

function HashChainDemo() {
  const [state, setState] = useState<TamperState>("idle");
  const [detectedMs, setDetectedMs] = useState(0);

  const runTamper = () => {
    if (state !== "idle") return;
    const start = Date.now();
    setState("injecting");
    setTimeout(() => setState("broken"), 450);
    setTimeout(() => { setDetectedMs(Date.now() - start); setState("detected"); }, 900);
    setTimeout(() => setState("restoring"), 2800);
    setTimeout(() => setState("restored"), 3600);
    setTimeout(() => setState("idle"), 5000);
  };

  const blockClass = (i: number) => {
    if ((state === "injecting" || state === "broken" || state === "detected") && i === 1) return "chain-block tampered";
    if ((state === "broken" || state === "detected") && i >= 2) return "chain-block broken";
    if (state === "restoring" || state === "restored") return "chain-block restoring";
    return "chain-block";
  };

  const hashOf = (i: number, h: string) =>
    (state === "injecting" || state === "broken" || state === "detected") && i === 1 ? "FFFFFFFF" : h;

  const statusOf = (i: number) => {
    if ((state === "injecting" || state === "broken" || state === "detected") && i === 1) return { label: "⚠ tampered", color: "#f59e0b" };
    if ((state === "broken" || state === "detected") && i >= 2) return { label: "⚠ mismatch", color: "#f59e0b" };
    if (state === "restoring") return { label: "↺ restoring", color: "#3b82f6" };
    return { label: "● verified", color: "#22c55e" };
  };

  const arrowColor = (i: number) =>
    (state === "broken" || state === "detected") && i >= 2 ? "#ef4444" :
    state === "restoring" || state === "restored" ? "#22c55e" : "#555555";

  const btnLabel = () => ({
    idle: "Simulate tamper attack →", injecting: "Injecting corrupt hash...",
    broken: "Chain breaking...", detected: `Detected in ${detectedMs}ms ✓`,
    restoring: "Restoring chain...", restored: "Chain restored ✓",
  }[state]);

  const btnBg = () => ({
    idle: "#ffffff", injecting: "#555555", broken: "#555555",
    detected: "#dc2626", restoring: "#3b82f6", restored: "#16a34a",
  }[state]);

  const btnColor = () => state === "idle" ? "#000000" : "#ffffff";

  return (
    <section style={{ background: "transparent", padding: "64px 0", overflow: "hidden" }}>
      <div style={W()}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", flexWrap: "wrap", gap: 24, marginBottom: 40 }}>
          <div>
            <SLabel>Integrity Demo</SLabel>
            <div style={{ ...HEADING, fontSize: "clamp(28px, 3.5vw, 40px)", color: "#0a0a0a" }}>Hash chain tamper detection.</div>
            <div style={{ ...HEADING, fontSize: "clamp(28px, 3.5vw, 40px)", color: "#aaaaaa" }}>Live. Interactive.</div>
          </div>
          <div style={{ minHeight: 36, display: "flex", alignItems: "center" }}>
            {state === "detected" && (
              <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "#fef2f2", border: "1px solid rgba(239,68,68,0.25)", borderRadius: 9999, padding: "8px 16px" }}>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "#dc2626" }}>⚠ Chain breach · {detectedMs}ms</span>
              </div>
            )}
            {(state === "restoring" || state === "restored") && (
              <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "#f0fdf4", border: "1px solid rgba(34,197,94,0.25)", borderRadius: 9999, padding: "8px 16px" }}>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "#16a34a" }}>
                  {state === "restored" ? "✓ Chain restored · Art. 12 enforced" : "↺ Restoring integrity..."}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Chain */}
        <div style={{ display: "flex", alignItems: "center", overflowX: "auto", paddingBottom: 8, gap: 0 }}>
          {CHAIN_BLOCKS.map((block, i) => (
            <Fragment key={block.id}>
              {i > 0 && (
                <div className="chain-arrow">
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "#555555", whiteSpace: "nowrap" }}>prev:{CHAIN_BLOCKS[i - 1].hash}</span>
                  <span style={{ color: arrowColor(i), fontSize: 16, transition: "color 0.3s" }}>→</span>
                </div>
              )}
              <div className={blockClass(i)}>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "#555555", marginBottom: 10 }}>#{block.id}</div>
                <div style={{ ...FS, fontWeight: 600, fontSize: 14, color: "#0a0a0a", letterSpacing: "-0.01em", marginBottom: 3 }}>{block.agent}</div>
                <div style={{ ...FS, fontSize: 13, color: "#666666", marginBottom: 12 }}>{block.event}</div>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: (state !== "idle" && state !== "restoring" && state !== "restored") && i === 1 ? "#dc2626" : "#555555", marginBottom: 10, transition: "color 0.3s" }}>
                  sha:{hashOf(i, block.hash)}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: statusOf(i).color, transition: "color 0.3s" }}>{statusOf(i).label}</span>
                </div>
              </div>
            </Fragment>
          ))}
          {/* Pending block */}
          <div className="chain-arrow">
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "#555555", whiteSpace: "nowrap" }}>prev:{CHAIN_BLOCKS[3].hash}</span>
            <span style={{ color: "#555555", fontSize: 16 }}>→</span>
          </div>
          <div style={{ background: "transparent", border: "1px dashed rgba(255,255,255,0.07)", borderRadius: 12, padding: "20px", minWidth: 140, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "#555555" }}>next event...</span>
          </div>
        </div>

        {/* Action */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 28, flexWrap: "wrap", gap: 16 }}>
          <p style={{ ...FS, fontSize: 13, color: "#555555" }}>
            {state === "idle" ? "Click to simulate a SHA-256 hash tampering attack on block #002" : ""}
          </p>
          <button onClick={runTamper} disabled={state !== "idle"}
            style={{ ...FS, fontWeight: 500, fontSize: 14, letterSpacing: "-0.01em", background: btnBg(), color: btnColor(), border: "none", borderRadius: 9999, padding: "11px 22px", cursor: state === "idle" ? "pointer" : "not-allowed", transition: "background 0.4s ease, color 0.4s ease" }}>
            {btnLabel()}
          </button>
        </div>
      </div>
    </section>
  );
}

/* ── Capabilities — NUMBERED LIST (not cards) ────────────── */

const ChainSVG = () => (
  <svg width="120" height="72" viewBox="0 0 120 72" fill="none">
    <rect x="4" y="20" width="32" height="24" rx="3" stroke="rgba(255,255,255,0.35)" strokeWidth="1"/>
    <text x="9" y="34" fontFamily="JetBrains Mono" fontSize="7" fill="rgba(255,255,255,0.7)">#a3f4</text>
    <text x="9" y="43" fontFamily="JetBrains Mono" fontSize="6" fill="#555555">evt_001</text>
    <path d="M36 32 L47 32" stroke="#555555" strokeWidth="1"/>
    <text x="40" y="29" fontFamily="JetBrains Mono" fontSize="9" fill="#555555">→</text>
    <rect x="47" y="20" width="32" height="24" rx="3" stroke="rgba(255,255,255,0.35)" strokeWidth="1"/>
    <text x="52" y="34" fontFamily="JetBrains Mono" fontSize="7" fill="rgba(255,255,255,0.7)">#9e1b</text>
    <text x="52" y="43" fontFamily="JetBrains Mono" fontSize="6" fill="#555555">evt_002</text>
    <path d="M79 32 L90 32" stroke="#555555" strokeWidth="1"/>
    <text x="83" y="29" fontFamily="JetBrains Mono" fontSize="9" fill="#555555">→</text>
    <rect x="90" y="20" width="26" height="24" rx="3" stroke="#333333" strokeWidth="1" strokeDasharray="2 2"/>
    <text x="96" y="34" fontFamily="JetBrains Mono" fontSize="8" fill="#555555">···</text>
  </svg>
);

const OversightSVG = () => (
  <svg width="80" height="80" viewBox="0 0 80 80" fill="none">
    <circle cx="28" cy="24" r="11" stroke="rgba(255,255,255,0.35)" strokeWidth="1"/>
    <path d="M10 64 C10 48 46 48 46 64" stroke="rgba(255,255,255,0.35)" strokeWidth="1" fill="none"/>
    <circle cx="54" cy="18" r="10" fill="#1c1c19" stroke="rgba(255,255,255,0.35)" strokeWidth="1"/>
    <path d="M50 18 L53 21 L59 15" stroke="rgba(255,255,255,0.7)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const ExportSVG = () => (
  <svg width="72" height="80" viewBox="0 0 72 80" fill="none">
    <path d="M36 8 L60 18 L60 44 C60 60 36 72 36 72 C36 72 12 60 12 44 L12 18 Z" stroke="rgba(255,255,255,0.35)" strokeWidth="1" fill="none"/>
    <path d="M26 40 L32 46 L48 32" stroke="rgba(255,255,255,0.7)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

function Capabilities() {
  const [ref, visible] = useInView();
  const features = [
    { num: "01", title: "Append-Only Audit Trail", body: "Every agent action hashed and chained with SHA-256. Tamper-evident by design — satisfying EU AI Act Art. 12.", illus: <ChainSVG /> },
    { num: "02", title: "Human Oversight Enforcement", body: "Flag high-risk agent decisions for mandatory human review before execution. Stop button included — Art. 14.", illus: <OversightSVG /> },
    { num: "03", title: "Compliance Export", body: "One-click JSONL export with Merkle root for regulatory submission. Authority-ready format — Art. 19.", illus: <ExportSVG /> },
  ];
  return (
    <section id="capabilities" className="section" style={{ background: "transparent" }}>
      <div style={W()}>
        <div ref={ref} className={`reveal${visible ? " in" : ""}`}>
          <SLabel>Capabilities</SLabel>
          <H2 line1="Everything you need." line2="Nothing you don't." size="clamp(48px, 6.5vw, 80px)" mb={0} />
        </div>
        {/* Numbered list */}
        <div style={{ borderTop: "1px solid rgba(0,0,0,0.08)", marginTop: 4 }}>
          {features.map((f, i) => (
            <div key={f.num}
              className={`reveal${visible ? " in" : ""} reveal-delay-${i + 1}`}
              style={{ display: "grid", gridTemplateColumns: "56px 1fr 150px", alignItems: "flex-start", padding: "52px 0", borderBottom: "1px solid rgba(0,0,0,0.08)", gap: 0 }}
            >
              {/* Mono number */}
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "#333333", letterSpacing: "0.05em", paddingTop: 4, lineHeight: 1 }}>{f.num}</span>
              {/* Content */}
              <div style={{ paddingRight: 48 }}>
                <h3 style={{ ...FS, fontWeight: 700, fontSize: 22, letterSpacing: "-0.02em", color: "#0a0a0a", lineHeight: 1.2, marginBottom: 12 }}>{f.title}</h3>
                <p style={{ ...BODY, fontSize: 16, maxWidth: 480 }}>{f.body}</p>
              </div>
              {/* SVG illustration */}
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "flex-end", paddingTop: 4 }}>{f.illus}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ── Process ─────────────────────────────────────────────── */
const PROCESS_STEPS = [
  {
    roman: "I", title: "Submit Event", desc: "Agent calls POST /v1/events/verify with input payload and event type.", file: "submit.ts",
    code: `// Agent submits verification event
const response = await fetch('/v1/events/verify', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer ca_live_...',
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    eventType: 'financial_transfer',
    agentId: 'agent_prod_001',
    input: { amount: 9500, currency: 'USD', recipient: 'vendor_abc' },
  }),
});
const { jobId } = await response.json();
// → { jobId: "job_abc123" }`,
  },
  {
    roman: "II", title: "Policy Evaluation", desc: "Confidence scored, SHA-256 hash computed, hash chain appended.", file: "evaluate.ts",
    code: `// Worker evaluates oversight policies
const result = await evaluateOversightPolicies({
  agentId: data.agentId,
  eventType: data.eventType,
  inputPayload: data.inputPayload,
});
const contentHash = computeContentHash({
  agentId, eventType, inputPayload,
  confidence: result.confidence,
});
const prevHash = await getLastHash(orgId);
// confidence < 0.85 → requiresReview: true`,
  },
  {
    roman: "III", title: "Human Review", desc: "Flagged events routed to reviewer. Justification required by Art. 14.", file: "review.ts",
    code: `// Reviewer approves flagged event
const review = await fetch('/v1/reviews', {
  method: 'POST',
  body: JSON.stringify({
    eventId: 'evt_xyz789',
    action: 'approve',
    justification: 'Manually verified vendor identity.',
    reviewerId: 'reviewer_01',
    reviewerEmail: 'compliance@acme.com',
    reviewerRole: 'compliance_officer',
  }),
});
// → 201 { id, contentHash, createdAt }`,
  },
  {
    roman: "IV", title: "Audit Export", desc: "GET /v1/audit/export returns signed JSONL with Merkle root for regulators.", file: "export.ts",
    code: `// Export audit trail for regulators
const audit = await fetch('/v1/audit/export', {
  headers: { 'Authorization': 'Bearer ca_live_...' },
});
const data = await audit.json();
// → {
//   exportedAt: "2026-04-03T10:00:00Z",
//   totalRecords: 80,
//   merkleRoot: "sha256:7f4a...",
//   fileHash: "sha256:3b9c...",
//   events: [...]
// }`,
  },
];

function Process() {
  const [active, setActive] = useState(0);
  const [ref, visible] = useInView();
  return (
    <section id="process" className="section-dark crosshatch">
      <div style={{ ...W(), position: "relative", zIndex: 1 }}>
        <div ref={ref} className={`reveal${visible ? " in" : ""}`}>
          <SLabel light>Process</SLabel>
          <H2 line1="How ClearAgent" line2="works." light />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "5fr 7fr", gap: 40, alignItems: "start" }}>
          {/* Steps */}
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {PROCESS_STEPS.map((s, i) => (
              <div key={i} className={`process-step${active === i ? " active" : ""}`} onClick={() => setActive(i)}>
                <div style={{ display: "flex", alignItems: "flex-start", gap: 16 }}>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: active === i ? "rgba(255,255,255,0.35)" : "rgba(255,255,255,0.18)", lineHeight: 1, paddingTop: 4, minWidth: 18 }}>{s.roman}</span>
                  <div>
                    <div style={{
                      ...FS, fontWeight: active === i ? 700 : 400, fontSize: 20, letterSpacing: "-0.02em",
                      color: active === i ? "#ffffff" : "#444444",
                      lineHeight: 1.2,
                      textDecoration: active === i ? "underline" : "none",
                      textUnderlineOffset: 8,
                      textDecorationColor: active === i ? "rgba(245,242,235,0.25)" : "transparent",
                      textDecorationThickness: 1,
                      transition: "color 0.2s, font-weight 0.1s",
                    }}>{s.title}</div>
                    {active === i && (
                      <div className="fade-in-up" style={{ ...FS, fontSize: 15, color: "#888888", lineHeight: 1.6, letterSpacing: "-0.01em", maxWidth: 340, marginTop: 10 }}>{s.desc}</div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
          {/* Terminal */}
          <div className="terminal">
            <div className="terminal-header">
              <div className="terminal-dot" style={{ background: "#ff5f57" }} />
              <div className="terminal-dot" style={{ background: "#febc2e" }} />
              <div className="terminal-dot" style={{ background: "#28c840" }} />
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "#444440", marginLeft: 8 }}>{PROCESS_STEPS[active].file}</span>
              <span style={{ marginLeft: "auto", fontFamily: "var(--font-mono)", fontSize: 12, color: "#333330" }}>● Ready</span>
            </div>
            <div className="terminal-body" dangerouslySetInnerHTML={{ __html: renderCode(PROCESS_STEPS[active].code) }} />
          </div>
        </div>
      </div>
    </section>
  );
}

/* ── Compliance Stats ────────────────────────────────────── */
function ComplianceStats() {
  const [ref, visible] = useInView();
  const deadline = new Date("2026-08-01T00:00:00Z");
  const daysLeft = Math.max(0, Math.ceil((deadline.getTime() - Date.now()) / 86400000));
  const stats = [
    { dot: "#22c55e", value: "80", label: "Events Verified", sub: "All append-only, hash-chained" },
    { dot: "#22c55e", value: "100%", label: "Chain Integrity", sub: "Zero tampering detected" },
    { dot: "#f59e0b", value: String(daysLeft), label: "Days Remaining", sub: "To EU AI Act enforcement" },
  ];
  return (
    <section id="compliance" className="section" style={{ background: "transparent" }}>
      <div style={W()}>
        <div style={{ display: "grid", gridTemplateColumns: "2fr 3fr", gap: 80, alignItems: "center" }}>
          <div ref={ref} className={`reveal${visible ? " in" : ""}`}>
            <SLabel>Compliance</SLabel>
            <H2 line1="Built for" line2="EU AI Act." size="clamp(48px,5.5vw,72px)" />
            <p style={{ ...BODY, marginTop: -24 }}>
              Articles 12, 14, and 19 mandate logging, human oversight, and
              record-keeping. Enforcement begins August 2026.
            </p>
          </div>
          {/* Status panel */}
          <div className={`reveal${visible ? " in" : ""} reveal-delay-2`}
            style={{ background: "rgba(0,0,0,0.04)", border: "1px solid rgba(0,0,0,0.08)", borderRadius: 16, overflow: "hidden" }}>
            {stats.map((s, i) => (
              <div key={i} style={{ padding: "20px 24px", borderBottom: "1px solid rgba(0,0,0,0.06)", display: "flex", alignItems: "flex-start", gap: 14 }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: s.dot, marginTop: 6, flexShrink: 0 }} />
                <div>
                  <div>
                    <span style={{ ...FS, fontWeight: 700, fontSize: 17, color: "#0a0a0a" }}>{s.value} </span>
                    <span style={{ ...FS, fontWeight: 600, fontSize: 17, color: "#0a0a0a" }}>{s.label}</span>
                  </div>
                  <div style={{ ...FS, fontSize: 14, color: "#888888", marginTop: 2 }}>{s.sub}</div>
                </div>
              </div>
            ))}
            <div style={{ padding: "16px 24px", display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#22c55e", flexShrink: 0 }} />
              <span style={{ ...FS, fontWeight: 500, fontSize: 14, color: "#22c55e" }}>System operational</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ── Live Metrics ────────────────────────────────────────── */
function LiveMetrics() {
  const [ref, visible] = useInView();
  const events = useCounter(80, 1400, visible);
  const [time, setTime] = useState(() => new Date().toTimeString().slice(0, 8));
  useEffect(() => {
    const id = setInterval(() => setTime(new Date().toTimeString().slice(0, 8)), 1000);
    return () => clearInterval(id);
  }, []);
  const cells = [
    { value: String(events), label: "Events Verified", mono: false },
    { value: "100%",         label: "Chain Integrity", mono: false },
    { value: "128ms",        label: "Avg Verification", mono: false },
    { value: time,           label: "Current Time (UTC)", mono: true },
  ];
  return (
    <section id="metrics" className="section" style={{ background: "transparent" }}>
      <div style={W()}>
        <div ref={ref} className={`reveal${visible ? " in" : ""}`} style={{ marginBottom: 52 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 20 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#22c55e" }} />
              <span style={{ ...FS, fontSize: 14, color: "#888888" }}>Live</span>
            </div>
            <span style={{ color: "#333333" }}>|</span>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 13, color: "#888888" }}>{time}</span>
          </div>
          <SLabel>Live Metrics</SLabel>
          <H2 line1="Real-time" line2="verification data." size="clamp(48px, 6vw, 72px)" mb={0} />
        </div>
        <div className="metrics-grid">
          {cells.map((c, i) => (
            <div key={i} className="metric-cell">
              <div style={{ fontFamily: c.mono ? "var(--font-mono)" : "var(--font-sans)", fontWeight: 800, fontSize: c.mono ? "clamp(36px,4vw,52px)" : "clamp(60px,8vw,96px)", color: "#0a0a0a", letterSpacing: c.mono ? "0.02em" : "-0.03em", lineHeight: 0.88, marginBottom: 14 }}>
                {c.value}
              </div>
              <div style={{ ...FS, fontSize: 16, color: "#888888", letterSpacing: "-0.01em" }}>{c.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ── Integrations — individual tiles ─────────────────────── */
const ROW1 = [
  { name: "Express",    cat: "Framework" },{ name: "PostgreSQL", cat: "Database" },
  { name: "Redis",      cat: "Cache"     },{ name: "BullMQ",     cat: "Queue"    },
  { name: "OpenAI",     cat: "AI / LLM"  },{ name: "Anthropic",  cat: "AI / LLM" },
  { name: "LangChain",  cat: "AI SDK"    },{ name: "AutoGPT",    cat: "AI Agent" },
  { name: "CrewAI",     cat: "AI Agent"  },{ name: "Vercel",     cat: "Platform" },
];
const ROW2 = [
  { name: "Slack",      cat: "Messaging" },{ name: "Linear",     cat: "PM"           },
  { name: "GitHub",     cat: "VCS"       },{ name: "Datadog",    cat: "Observability" },
  { name: "Grafana",    cat: "Monitoring"},{ name: "PagerDuty",  cat: "Alerts"       },
  { name: "Stripe",     cat: "Payments"  },{ name: "AWS",        cat: "Cloud"        },
  { name: "GCP",        cat: "Cloud"     },{ name: "Sentry",     cat: "Errors"       },
];

function Tile({ name, cat }: { name: string; cat: string }) {
  return (
    <div className="integration-tile">
      <div style={{ ...FS, fontWeight: 600, fontSize: 14, color: "#0a0a0a", letterSpacing: "-0.01em", lineHeight: 1.2 }}>{name}</div>
      <div style={{ ...FS, fontSize: 12, color: "#666666", lineHeight: 1 }}>{cat}</div>
    </div>
  );
}

function Integrations() {
  const [ref, visible] = useInView();
  return (
    <section id="integrations" className="section" style={{ background: "transparent", overflow: "hidden" }}>
      <div style={W()}>
        <div ref={ref} className={`reveal${visible ? " in" : ""}`} style={{ marginBottom: 52 }}>
          <SLabel>Integrations</SLabel>
          <H2 line1="Works with" line2="your entire stack." size="clamp(48px, 6.5vw, 80px)" mb={0} />
        </div>
      </div>
      {/* Full-width marquees */}
      <div style={{ marginTop: 56, overflow: "hidden" }}>
        <div className="marquee-track">
          {[...ROW1, ...ROW1].map((t, i) => <Tile key={i} name={t.name} cat={t.cat} />)}
        </div>
        <div style={{ marginTop: 10 }}>
          <div className="marquee-track-rev">
            {[...ROW2, ...ROW2].map((t, i) => <Tile key={i} name={t.name} cat={t.cat} />)}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ── EU AI Act ───────────────────────────────────────────── */
const ARTICLES: Record<string, { title: string; items: string[] }> = {
  "Art.12": { title: "Logging & Traceability", items: ["Append-only event log with timestamp", "SHA-256 content hash per event", "Merkle root computation across all events", "Input payload hashing", "Full hash chain audit trail"] },
  "Art.14": { title: "Human Oversight",        items: ["Automatic flagging of low-confidence decisions", "Human review API with approval workflow", "Agent suspension endpoint (stop button)", "Mandatory justification for all reviews", "Reviewer identity and role logging"] },
  "Art.19": { title: "Record Keeping",         items: ["JSONL export with full event history", "Merkle root signing for tamper-evidence", "Export hash logged to audit_exports table", "Regulatory-ready format", "Cursor-based pagination for large datasets"] },
};

function EUAIAct() {
  const [ref, visible] = useInView();
  const [active, setActive] = useState("Art.12");
  return (
    <section id="regulation" className="section" style={{ background: "transparent" }}>
      <div style={W()}>
        <div ref={ref} className={`reveal${visible ? " in" : ""}`} style={{ marginBottom: 52 }}>
          <SLabel>Regulation</SLabel>
          <H2 line1="Built for" line2="EU AI Act compliance." size="clamp(48px, 6vw, 72px)" mb={0} />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "2fr 3fr", gap: 64, alignItems: "start" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {Object.entries(ARTICLES).map(([key, val]) => (
              <button key={key} className={`article-pill${active === key ? " active" : ""}`} onClick={() => setActive(key)}>
                <div style={{ fontWeight: 600, marginBottom: 3, letterSpacing: "0.02em" }}>{key}</div>
                <div style={{ fontSize: 12, opacity: 0.65 }}>{val.title}</div>
              </button>
            ))}
          </div>
          <div>
            <h3 style={{ ...FS, fontWeight: 700, fontSize: 22, color: "#0a0a0a", marginBottom: 24, letterSpacing: "-0.02em" }}>{ARTICLES[active].title}</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {ARTICLES[active].items.map((item, i) => (
                <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                  <div style={{ width: 20, height: 20, borderRadius: "50%", background: "#0a0a0a", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 2 }}>
                    <svg width="9" height="9" viewBox="0 0 10 10" fill="none"><path d="M2 5l2 2 4-4" stroke="#ffffff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  </div>
                  <span style={{ ...BODY, fontSize: 15, maxWidth: "none" }}>{item}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ── Developer ───────────────────────────────────────────── */
const DEV_TABS: Record<string, string> = {
  Install: `# Install the SDK
npm install @clearagent/sdk

# Configure environment
export CLEARAGENT_API_KEY="ca_live_..."
export CLEARAGENT_ORG_ID="org_..."`,
  Initialize: `import { ClearAgent } from '@clearagent/sdk';

const agent = new ClearAgent({
  apiKey: process.env.CLEARAGENT_API_KEY,
  orgId: process.env.CLEARAGENT_ORG_ID,
});

const { agentId } = await agent.register({
  name: 'payment-processor',
  externalId: 'agent_prod_001',
  modelProvider: 'openai',
  modelId: 'gpt-4o',
});`,
  Verify: `// Verify an agent decision
const { jobId } = await agent.verify({
  agentId,
  eventType: 'financial_transfer',
  input: { amount: 9500, currency: 'USD', recipient: 'vendor_abc' },
});

const result = await agent.poll(jobId);
// → {
//   status: 'completed',
//   requiresReview: true,
//   contentHash: 'sha256:a3f4...',
//   prevHash: 'sha256:9e1b...',
// }`,
};

function Developer() {
  const [ref, visible] = useInView();
  const [tab, setTab] = useState("Install");
  return (
    <section id="developer" className="section" style={{ background: "transparent" }}>
      <div style={W()}>
        <div ref={ref} className={`reveal${visible ? " in" : ""}`} style={{ marginBottom: 44 }}>
          <SLabel>Developer</SLabel>
          <H2 line1="Simple API." line2="Powerful compliance." size="clamp(48px, 6.5vw, 80px)" mb={0} />
        </div>
        <div className={`reveal${visible ? " in" : ""} reveal-delay-1`} style={{ marginTop: 52 }}>
          <div style={{ display: "flex", borderBottom: "1px solid rgba(0,0,0,0.08)" }}>
            {Object.keys(DEV_TABS).map((t) => <button key={t} className={`dev-tab${tab === t ? " active" : ""}`} onClick={() => setTab(t)}>{t}</button>)}
          </div>
          <div className="terminal" style={{ borderTopLeftRadius: 0, borderTopRightRadius: 0 }}>
            <div className="terminal-header">
              <div className="terminal-dot" style={{ background: "#ff5f57" }} />
              <div className="terminal-dot" style={{ background: "#febc2e" }} />
              <div className="terminal-dot" style={{ background: "#28c840" }} />
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "#444440", marginLeft: 8 }}>
                {tab === "Install" ? "shell" : tab === "Initialize" ? "index.ts" : "verify.ts"}
              </span>
            </div>
            <div className="terminal-body" style={{ minHeight: 200 }} dangerouslySetInnerHTML={{ __html: renderCode(DEV_TABS[tab]) }} />
          </div>
        </div>
        <div className={`reveal${visible ? " in" : ""} reveal-delay-2`} style={{ marginTop: 28, display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 16 }}>
          <p style={{ ...FS, fontSize: 14, color: "#888888", letterSpacing: "-0.01em" }}>Available in TypeScript, Python, and REST. MIT licensed.</p>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <a href="https://github.com/clearagent" className="btn-black btn-sm">View full docs</a>
            <span style={{ color: "#333333", userSelect: "none" }}>|</span>
            <a href="https://github.com/clearagent" style={{ ...FS, fontSize: 14, color: "#888888", textDecoration: "none", letterSpacing: "-0.01em" }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "#0a0a0a")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "#888888")}>View on GitHub</a>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ── Footer ──────────────────────────────────────────────── */
function Footer() {
  return (
    <footer style={{ background: "transparent", borderTop: "1px solid rgba(0,0,0,0.08)", padding: "28px 48px" }}>
      <div style={{ maxWidth: 1200, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
          <div style={{ width: 22, height: 22, borderRadius: 6, background: "#0a0a0a", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg width="10" height="10" viewBox="0 0 14 14" fill="none"><path d="M2 7L5.5 10.5L12 3.5" stroke="#ffffff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </div>
          <span style={{ ...FS, fontSize: 13, color: "#666666", fontWeight: 500 }}>© 2026 ClearAgent, Inc.</span>
        </div>
        <div style={{ display: "flex", gap: 24 }}>
          {["Privacy", "Terms", "GitHub", "Status"].map((l) => (
            <a key={l} href="#" style={{ ...FS, fontSize: 13, color: "#666666", textDecoration: "none", transition: "color 0.15s" }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "#aaaaaa")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "#666666")}>{l}</a>
          ))}
        </div>
      </div>
    </footer>
  );
}

/* ── Live Verification Feed ──────────────────────────────── */
const VERIFY_EVENTS = [
  { agent: "payment-agent", event: "transfer $9,500",   conf: 97, hash: "a3f4b2c1", status: "verified" },
  { agent: "risk-agent",    event: "risk evaluation",   conf: 72, hash: "9e1b7a3d", status: "review"   },
  { agent: "audit-agent",   event: "log record",        conf: 99, hash: "7c2d8f5e", status: "verified" },
  { agent: "comp-agent",    event: "export audit",      conf: 88, hash: "3b9a1c6f", status: "verified" },
  { agent: "trade-agent",   event: "execute order",     conf: 61, hash: "f2e8d4a0", status: "review"   },
  { agent: "hr-agent",      event: "access PII data",   conf: 43, hash: "c1b5e9d7", status: "flagged"  },
] as const;

function LiveVerificationFeed() {
  const [ref, visible] = useInView();
  const [activeIdx, setActiveIdx] = useState(0);
  const [eventCount, setEventCount] = useState(0);

  useEffect(() => {
    if (!visible) return;
    const id = setInterval(() => {
      setActiveIdx((i) => (i + 1) % VERIFY_EVENTS.length);
      setEventCount((n) => n + 1);
    }, 1800);
    return () => clearInterval(id);
  }, [visible]);

  return (
    <section className="section" style={{ background: "transparent" }}>
      <div style={W()}>
        <div ref={ref} className={`reveal${visible ? " in" : ""}`}>
          <SLabel>Interactive Demo</SLabel>
          <H2 line1="Touch the future" line2="of AI verification." mb={48} />
        </div>
        <div className="verify-feed-grid">
          {VERIFY_EVENTS.map((ev, i) => {
            const isActive = i === activeIdx;
            const statusColor =
              ev.status === "verified" ? "#22c55e" :
              ev.status === "review"   ? "#f59e0b" : "#ef4444";
            return (
              <div key={i} className={`verify-card${isActive ? " active" : ""}`}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "#888888" }}>
                    evt_{String(eventCount * VERIFY_EVENTS.length + i + 1).padStart(3, "0")}
                  </span>
                  <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <div style={{ width: 6, height: 6, borderRadius: "50%", background: statusColor, opacity: isActive ? 1 : 0.5 }} />
                    <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: statusColor }}>{ev.status}</span>
                  </div>
                </div>
                <div style={{ marginTop: 10, marginBottom: 4 }}>
                  <div style={{ ...FS, fontWeight: 600, fontSize: 14, color: "#0a0a0a", letterSpacing: "-0.01em" }}>{ev.agent}</div>
                  <div style={{ ...FS, fontSize: 12, color: "#888888", marginTop: 2 }}>{ev.event}</div>
                </div>
                <div className="verify-bar-bg">
                  <div className="verify-bar-fill" style={{ width: isActive ? `${ev.conf}%` : "0%", background: statusColor }} />
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "#888888" }}>sha:{ev.hash}</span>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "#888888" }}>{ev.conf}%</span>
                </div>
              </div>
            );
          })}
        </div>
        <p style={{ fontFamily: "var(--font-mono)", fontSize: 13, color: "#888888", letterSpacing: "0.02em", marginTop: 28 }}>
          Live verification stream &nbsp;·&nbsp; {VERIFY_EVENTS.length} agents monitored &nbsp;·&nbsp; Real-time confidence scoring
        </p>
      </div>
    </section>
  );
}

/* ── App ─────────────────────────────────────────────────── */
export default function App() {
  const [isLoading, setIsLoading] = useState(true);
  return (
    <>
      <AnimatePresence>
        {isLoading && <LoadingScreen key="loading" onComplete={() => setIsLoading(false)} />}
      </AnimatePresence>
      {!isLoading && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5, delay: 0.15 }}>
          <CustomCursor />
          <Nav />
          <Hero />
          <HashChainDemo />
          <Capabilities />
          <LiveVerificationFeed />
          <Process />
          <ComplianceStats />
          <LiveMetrics />
          <Integrations />
          <EUAIAct />
          <Developer />
          <Footer />
        </motion.div>
      )}
    </>
  );
}
