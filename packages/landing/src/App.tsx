import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import LoadingScreen from "./LoadingScreen";

/* ── Hooks ─────────────────────────────────────────────────── */

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

/* ── Custom Cursor ──────────────────────────────────────────── */

function CustomCursor() {
  const ref = useRef<HTMLDivElement>(null);
  const [expanded, setExpanded] = useState(false);
  useEffect(() => {
    const move = (e: MouseEvent) => {
      if (ref.current)
        ref.current.style.transform = `translate(calc(${e.clientX}px - 50%), calc(${e.clientY}px - 50%))`;
    };
    const over = (e: MouseEvent) => {
      setExpanded(!!(e.target as HTMLElement).closest("a,button,[data-hover]"));
    };
    document.addEventListener("mousemove", move, { passive: true });
    document.addEventListener("mouseover", over, { passive: true });
    return () => {
      document.removeEventListener("mousemove", move);
      document.removeEventListener("mouseover", over);
    };
  }, []);
  return <div ref={ref} className={`custom-cursor${expanded ? " expanded" : ""}`} />;
}

/* ── Globe Canvas ───────────────────────────────────────────── */

function GlobeCanvas({ size = 480 }: { size?: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    canvas.style.width = size + "px";
    canvas.style.height = size + "px";
    ctx.scale(dpr, dpr);

    const N = 280;
    const golden = Math.PI * (3 - Math.sqrt(5));
    const chars = ["#", "✓", "→", "|", "─", "{", "}", "[", "]", "0", "1"];
    type Point = { ox: number; oy: number; oz: number; char: string };
    const pts: Point[] = [];
    for (let i = 0; i < N; i++) {
      const y = 1 - (i / (N - 1)) * 2;
      const r = Math.sqrt(Math.max(0, 1 - y * y));
      const theta = golden * i;
      pts.push({ ox: r * Math.cos(theta), oy: y, oz: r * Math.sin(theta), char: chars[i % chars.length] });
    }

    let angle = 0;
    let raf: number;

    const draw = () => {
      if (document.hidden) { raf = requestAnimationFrame(draw); return; }
      ctx.clearRect(0, 0, size, size);
      const cx = size / 2, cy = size / 2;
      const scale = size * 0.42;
      const cos = Math.cos(angle), sin = Math.sin(angle);

      const projected = pts.map((p) => {
        const rx = p.ox * cos - p.oz * sin;
        const rz = p.ox * sin + p.oz * cos;
        return { x: cx + rx * scale, y: cy + p.oy * scale, z: rz, char: p.char };
      });
      projected.sort((a, b) => a.z - b.z);

      for (const p of projected) {
        if (p.z < -0.05) continue;
        const alpha = 0.12 + ((p.z + 1) / 2) * 0.68;
        const fs = Math.round(9 + p.z * 4);
        ctx.font = `${fs}px "JetBrains Mono", monospace`;
        ctx.fillStyle = `rgba(10,10,10,${alpha.toFixed(2)})`;
        ctx.fillText(p.char, p.x, p.y);
      }

      angle += 0.004;
      raf = requestAnimationFrame(draw);
    };
    draw();
    return () => cancelAnimationFrame(raf);
  }, [size]);

  return (
    <canvas
      ref={canvasRef}
      style={{ display: "block", pointerEvents: "none" }}
    />
  );
}

/* ── Syntax Highlighter ─────────────────────────────────────── */

function renderCode(code: string): string {
  return code
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/(\/\/.+)/g, '<span style="color:#6b7280;font-style:italic">$1</span>')
    .replace(/("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`(?:[^`\\]|\\.)*`)/g, '<span style="color:#86efac">$1</span>')
    .replace(/\b(import|export|const|let|var|function|async|await|return|new|from|if|else|type|interface)\b/g, '<span style="color:#93c5fd">$1</span>')
    .replace(/\b(\d+(\.\d+)?)\b/g, '<span style="color:#fcd34d">$1</span>');
}

/* ── Nav ────────────────────────────────────────────────────── */

function Nav() {
  const [floating, setFloating] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const fn = () => setFloating(window.scrollY > 60);
    window.addEventListener("scroll", fn, { passive: true });
    return () => window.removeEventListener("scroll", fn);
  }, []);

  const links = ["Compliance", "Process", "Developer"];

  return (
    <nav className={`nav-base${floating ? " nav-floating" : ""}`}>
      <div
        style={{
          maxWidth: floating ? "none" : "1200px",
          margin: "0 auto",
          padding: floating ? "0 24px" : "0 32px",
          height: 60,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        {/* Logo */}
        <a href="#" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none" }}>
          <div style={{
            width: 28, height: 28, borderRadius: 7,
            background: "var(--text)", display: "flex",
            alignItems: "center", justifyContent: "center",
            flexShrink: 0,
          }}>
            <svg width="12" height="12" viewBox="0 0 14 14" fill="none">
              <path d="M2 7L5.5 10.5L12 3.5" stroke="#f0ede6" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <span style={{ fontFamily: "var(--font-sans)", fontWeight: 600, fontSize: "0.9rem", color: "var(--text)", letterSpacing: "-0.02em" }}>
            ClearAgent
          </span>
        </a>

        {/* Desktop links */}
        <div className="hidden md:flex" style={{ gap: 32, alignItems: "center" }}>
          {links.map((l) => (
            <a
              key={l}
              href={`#${l.toLowerCase()}`}
              style={{ fontFamily: "var(--font-sans)", fontSize: "0.875rem", fontWeight: 500, color: "var(--text-muted)", textDecoration: "none", transition: "color 0.15s" }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "var(--text)")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-muted)")}
            >
              {l}
            </a>
          ))}
        </div>

        {/* CTA */}
        <div className="hidden md:flex" style={{ gap: 10, alignItems: "center" }}>
          <a
            href="https://github.com/clearagent"
            className="btn-outline btn-sm"
            style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
          >
            <svg width="13" height="13" viewBox="0 0 16 16" fill="currentColor">
              <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
            </svg>
            GitHub
          </a>
          <a href="#developer" className="btn-black btn-sm">Get API Key</a>
        </div>

        {/* Mobile hamburger */}
        <button
          onClick={() => setOpen(!open)}
          style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", display: "flex", alignItems: "center" }}
          className="md:hidden"
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            {open
              ? <path d="M4 4L16 16M16 4L4 16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              : <path d="M3 6h14M3 10h14M3 14h14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />}
          </svg>
        </button>
      </div>

      {/* Mobile menu */}
      {open && (
        <div style={{ borderTop: "1px solid var(--border)", background: "rgba(248,246,240,0.97)", padding: "16px 24px 20px", display: "flex", flexDirection: "column", gap: 14 }}>
          {links.map((l) => (
            <a key={l} href={`#${l.toLowerCase()}`} onClick={() => setOpen(false)}
              style={{ fontFamily: "var(--font-sans)", color: "var(--text-muted)", textDecoration: "none", fontWeight: 500 }}>{l}</a>
          ))}
          <div style={{ display: "flex", gap: 10, paddingTop: 4 }}>
            <a href="https://github.com/clearagent" className="btn-outline btn-sm" style={{ flex: 1, justifyContent: "center" }}>GitHub</a>
            <a href="#developer" className="btn-black btn-sm" style={{ flex: 1, justifyContent: "center" }} onClick={() => setOpen(false)}>Get API Key</a>
          </div>
        </div>
      )}
    </nav>
  );
}

/* ── Hero ───────────────────────────────────────────────────── */

function Hero() {
  return (
    <section id="hero" style={{
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      paddingTop: 80,
      background: "var(--bg)",
      position: "relative",
    }}>
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 32px", width: "100%" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 64, alignItems: "center" }}>
          {/* Left */}
          <div>
            <span className="section-label">— AI Verification Infrastructure</span>
            <h1 style={{
              fontFamily: "var(--font-sans)",
              fontWeight: 900,
              fontSize: "clamp(2.6rem, 5vw, 4.75rem)",
              lineHeight: 1.03,
              letterSpacing: "-0.03em",
              marginBottom: 24,
            }}>
              <span style={{ display: "block", color: "var(--text)" }}>Verification</span>
              <span style={{ display: "block", color: "var(--text)" }}>infrastructure</span>
              <span style={{ display: "block", color: "var(--text-muted)" }}>for autonomous AI.</span>
            </h1>
            <p style={{
              fontFamily: "var(--font-sans)",
              fontSize: "1.0625rem",
              fontWeight: 400,
              color: "var(--text-muted)",
              lineHeight: 1.65,
              maxWidth: 440,
              marginBottom: 36,
            }}>
              Append-only audit trails, human oversight enforcement, and hash-verified
              decision logs built to satisfy EU AI Act Articles 12, 14, and 19.
            </p>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 40 }}>
              <a href="#developer" className="btn-black">Get started free</a>
              <a href="https://github.com/clearagent" className="btn-outline">Read the docs</a>
            </div>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--text-dim)", letterSpacing: "0.02em" }}>
              80 events verified &nbsp;·&nbsp; 100% chain integrity &nbsp;·&nbsp; 10 human reviews
            </div>
          </div>

          {/* Right — Globe */}
          <div style={{ display: "flex", justifyContent: "center", alignItems: "center" }}>
            <GlobeCanvas size={480} />
          </div>
        </div>
      </div>
    </section>
  );
}

/* ── Capabilities ───────────────────────────────────────────── */

function Capabilities() {
  const [ref, visible] = useInView();
  const caps = [
    {
      num: "01",
      title: "Append-Only Audit Trail",
      desc: "Every agent action hashed and chained with SHA-256. Tamper-evident by design — satisfying EU AI Act Art. 12.",
      icon: (
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
          <rect x="3" y="3" width="14" height="14" rx="3" stroke="currentColor" strokeWidth="1.5" />
          <path d="M7 10l2 2 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ),
    },
    {
      num: "02",
      title: "Human Oversight Enforcement",
      desc: "Flag high-risk agent decisions for mandatory human review before execution. Stop button included — Art. 14.",
      icon: (
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
          <circle cx="10" cy="8" r="3.5" stroke="currentColor" strokeWidth="1.5" />
          <path d="M3 17c0-3.866 3.134-7 7-7s7 3.134 7 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      ),
    },
    {
      num: "03",
      title: "Compliance Export",
      desc: "One-click JSONL export with Merkle root for regulatory submission. Authority-ready format — Art. 19.",
      icon: (
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
          <path d="M4 4h12M4 8h8M4 12h10M4 16h6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      ),
    },
  ];

  return (
    <section id="capabilities" className="section" style={{ background: "var(--bg)" }}>
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 32px" }}>
        <div ref={ref} className={`reveal${visible ? " in" : ""}`}>
          <span className="section-label">— Capabilities</span>
          <div style={{ marginBottom: 56 }}>
            <div className="h2-line1" style={{ fontSize: "clamp(2rem, 4vw, 3rem)", letterSpacing: "-0.025em" }}>Everything you need</div>
            <div className="h2-line2" style={{ fontSize: "clamp(2rem, 4vw, 3rem)", letterSpacing: "-0.025em" }}>to stay compliant.</div>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 2 }}>
          {caps.map((c, i) => (
            <div
              key={c.num}
              className={`reveal${visible ? " in" : ""} reveal-delay-${i + 1}`}
              style={{
                padding: "40px 36px",
                border: "1px solid var(--border)",
                borderRadius: i === 0 ? "16px 0 0 16px" : i === 2 ? "0 16px 16px 0" : undefined,
                background: "var(--surface-2, white)",
                position: "relative",
                overflow: "hidden",
              }}
            >
              {/* Ghost number */}
              <div style={{
                position: "absolute", top: 16, right: 20,
                fontFamily: "var(--font-sans)", fontWeight: 900,
                fontSize: 80, color: "var(--border)",
                lineHeight: 1, pointerEvents: "none", userSelect: "none",
              }}>
                {c.num}
              </div>
              <div style={{ color: "var(--text-muted)", marginBottom: 16 }}>{c.icon}</div>
              <h3 style={{ fontFamily: "var(--font-sans)", fontWeight: 700, fontSize: "1.125rem", color: "var(--text)", marginBottom: 12, letterSpacing: "-0.01em" }}>{c.title}</h3>
              <p style={{ fontFamily: "var(--font-sans)", fontSize: "0.9375rem", color: "var(--text-muted)", lineHeight: 1.6 }}>{c.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ── Process ────────────────────────────────────────────────── */

const PROCESS_STEPS = [
  {
    roman: "I",
    title: "Submit Event",
    desc: "Agent calls POST /v1/events/verify with input payload and event type.",
    file: "submit.ts",
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
    input: {
      amount: 9500,
      currency: 'USD',
      recipient: 'vendor_abc',
    },
  }),
});

// Returns job ID for polling
const { jobId } = await response.json();
// → { jobId: "job_abc123", status: 202 }`,
  },
  {
    roman: "II",
    title: "Policy Evaluation",
    desc: "Confidence scored, SHA-256 hash computed, hash chain appended.",
    file: "evaluate.ts",
    code: `// Worker evaluates oversight policies
const result = await evaluateOversightPolicies({
  agentId: data.agentId,
  eventType: data.eventType,
  inputPayload: data.inputPayload,
});

// Compute hash chain
const contentHash = computeContentHash({
  agentId, eventType, inputPayload,
  confidence: result.confidence,
});

const prevHash = await getLastHash(orgId);
// → { contentHash: "sha256:a3f...", prevHash: "sha256:9e1..." }

// confidence < 0.85 → requiresReview: true`,
  },
  {
    roman: "III",
    title: "Human Review",
    desc: "Flagged events routed to reviewer. Justification required by Art. 14.",
    file: "review.ts",
    code: `// Reviewer approves flagged event
const review = await fetch('/v1/reviews', {
  method: 'POST',
  headers: { 'Authorization': 'Bearer ca_live_...' },
  body: JSON.stringify({
    eventId: 'evt_xyz789',
    action: 'approve',
    justification: 'Manually verified vendor identity. Risk acceptable.',
    reviewerId: 'reviewer_01',
    reviewerEmail: 'compliance@acme.com',
    reviewerRole: 'compliance_officer',
  }),
});

// → 201 { id, contentHash, createdAt }
// Empty justification → 400 { code: 'justification_required' }`,
  },
  {
    roman: "IV",
    title: "Audit Export",
    desc: "GET /v1/audit/export returns signed JSONL with Merkle root for regulators.",
    file: "export.ts",
    code: `// Export audit trail for regulators
const audit = await fetch('/v1/audit/export?from=2026-01-01', {
  headers: { 'Authorization': 'Bearer ca_live_...' },
});

const data = await audit.json();
// → {
//   exportedAt: "2026-04-02T10:00:00Z",
//   totalRecords: 80,
//   merkleRoot: "sha256:7f4a...",
//   fileHash: "sha256:3b9c...",
//   events: [
//     { id, contentHash, prevHash, status, ... },
//     ...
//   ]
// }

// fileHash logged to auditExports table (Art. 19)`,
  },
];

function Process() {
  const [active, setActive] = useState(0);
  const [ref, visible] = useInView();

  return (
    <section id="process" className="section-dark crosshatch">
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 32px", position: "relative", zIndex: 1 }}>
        <div ref={ref} className={`reveal${visible ? " in" : ""}`}>
          <span className="section-label-light">— Process</span>
          <div style={{ marginBottom: 56 }}>
            <div className="h2-line1-light" style={{ fontSize: "clamp(2rem, 4vw, 3rem)", letterSpacing: "-0.025em" }}>How ClearAgent</div>
            <div className="h2-line2-light" style={{ fontSize: "clamp(2rem, 4vw, 3rem)", letterSpacing: "-0.025em" }}>works.</div>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "5fr 7fr", gap: 40, alignItems: "start" }}>
          {/* Steps */}
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {PROCESS_STEPS.map((s, i) => (
              <div
                key={i}
                className={`process-step${active === i ? " active" : ""}`}
                onClick={() => setActive(i)}
              >
                <div style={{ display: "flex", alignItems: "flex-start", gap: 16 }}>
                  <span style={{
                    fontFamily: "var(--font-mono)", fontSize: 12,
                    color: active === i ? "rgba(255,255,255,0.5)" : "var(--dark-muted)",
                    lineHeight: 1, paddingTop: 3, minWidth: 20,
                  }}>
                    {s.roman}
                  </span>
                  <div>
                    <div style={{
                      fontFamily: "var(--font-sans)", fontWeight: 600, fontSize: "0.9375rem",
                      color: active === i ? "white" : "rgba(255,255,255,0.45)",
                      marginBottom: 4, transition: "color 0.2s",
                    }}>
                      {s.title}
                    </div>
                    {active === i && (
                      <div style={{
                        fontFamily: "var(--font-sans)", fontSize: "0.875rem",
                        color: "rgba(255,255,255,0.4)", lineHeight: 1.55,
                      }}>
                        {s.desc}
                      </div>
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
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "#555", marginLeft: 8 }}>
                {PROCESS_STEPS[active].file}
              </span>
            </div>
            <div
              className="terminal-body"
              dangerouslySetInnerHTML={{ __html: renderCode(PROCESS_STEPS[active].code) }}
            />
          </div>
        </div>
      </div>
    </section>
  );
}

/* ── Compliance Stats ───────────────────────────────────────── */

function ComplianceStats() {
  const [ref, visible] = useInView();
  const deadline = new Date("2026-08-01T00:00:00Z");
  const daysLeft = Math.max(0, Math.ceil((deadline.getTime() - Date.now()) / 86400000));

  const stats = [
    {
      icon: (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <rect x="2" y="2" width="12" height="12" rx="3" stroke="var(--verified)" strokeWidth="1.5" />
          <path d="M5 8l2 2 4-4" stroke="var(--verified)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ),
      value: "80",
      label: "Events Verified",
      sub: "All append-only, hash-chained",
    },
    {
      icon: (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path d="M8 2l5 2.5v4C13 11.5 10.5 14 8 14S3 11.5 3 8.5v-4L8 2z" stroke="var(--verified)" strokeWidth="1.5" strokeLinejoin="round" />
        </svg>
      ),
      value: "100%",
      label: "Chain Integrity",
      sub: "Zero tampering detected",
    },
    {
      icon: (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <circle cx="8" cy="8" r="6" stroke="#b45309" strokeWidth="1.5" />
          <path d="M8 5v3.5l2 2" stroke="#b45309" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      ),
      value: String(daysLeft),
      label: "Days Remaining",
      sub: "To EU AI Act enforcement",
    },
  ];

  return (
    <section id="compliance" className="section" style={{ background: "var(--bg)" }}>
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 32px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "2fr 3fr", gap: 80, alignItems: "center" }}>
          {/* Left */}
          <div ref={ref} className={`reveal${visible ? " in" : ""}`}>
            <span className="section-label">— Compliance</span>
            <div style={{ marginBottom: 20 }}>
              <div className="h2-line1" style={{ fontSize: "clamp(1.8rem, 3.5vw, 2.75rem)", letterSpacing: "-0.025em" }}>Built for</div>
              <div className="h2-line2" style={{ fontSize: "clamp(1.8rem, 3.5vw, 2.75rem)", letterSpacing: "-0.025em" }}>EU AI Act.</div>
            </div>
            <p style={{ fontFamily: "var(--font-sans)", fontSize: "0.9375rem", color: "var(--text-muted)", lineHeight: 1.65 }}>
              Articles 12, 14, and 19 mandate logging, human oversight, and
              record-keeping. Enforcement begins August 2026.
            </p>
          </div>

          {/* Right — status card */}
          <div className={`reveal${visible ? " in" : ""} reveal-delay-2`} style={{
            background: "white",
            border: "1px solid var(--border)",
            borderRadius: 16,
            padding: 32,
          }}>
            {stats.map((s, i) => (
              <div key={i} style={{
                display: "flex", alignItems: "center", gap: 16,
                paddingBottom: i < stats.length - 1 ? 24 : 0,
                marginBottom: i < stats.length - 1 ? 24 : 0,
                borderBottom: i < stats.length - 1 ? "1px solid var(--border)" : "none",
              }}>
                <div style={{ flexShrink: 0 }}>{s.icon}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: "var(--font-sans)", fontWeight: 700, fontSize: "1.125rem", color: "var(--text)", letterSpacing: "-0.01em" }}>
                    {s.value} <span style={{ fontSize: "0.875rem", fontWeight: 500, color: "var(--text-muted)" }}>{s.label}</span>
                  </div>
                  <div style={{ fontFamily: "var(--font-sans)", fontSize: "0.8125rem", color: "var(--text-dim)", marginTop: 2 }}>{s.sub}</div>
                </div>
              </div>
            ))}
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 24, paddingTop: 24, borderTop: "1px solid var(--border)" }}>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--verified)" }} />
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--text-muted)" }}>System operational</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ── Live Metrics ───────────────────────────────────────────── */

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
    { value: "100%", label: "Chain Integrity", mono: false },
    { value: "128ms", label: "Avg Verification", mono: false },
    { value: time, label: "Current Time (UTC)", mono: true },
  ];

  return (
    <section id="metrics" className="section" style={{ background: "var(--bg)" }}>
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 32px" }}>
        <div ref={ref} className={`reveal${visible ? " in" : ""}`} style={{ marginBottom: 48 }}>
          <span className="section-label">— Live Metrics</span>
          <div>
            <div className="h2-line1" style={{ fontSize: "clamp(2rem, 4vw, 3rem)", letterSpacing: "-0.025em" }}>Real-time</div>
            <div className="h2-line2" style={{ fontSize: "clamp(2rem, 4vw, 3rem)", letterSpacing: "-0.025em" }}>verification data.</div>
          </div>
        </div>

        <div className="metrics-grid">
          {cells.map((c, i) => (
            <div key={i} className="metric-cell">
              <div style={{
                fontFamily: c.mono ? "var(--font-mono)" : "var(--font-sans)",
                fontWeight: 900,
                fontSize: c.mono ? "clamp(1.8rem, 3.5vw, 3rem)" : "clamp(2.5rem, 5vw, 4.5rem)",
                color: "var(--text)",
                letterSpacing: c.mono ? "0.02em" : "-0.03em",
                lineHeight: 1,
                marginBottom: 12,
              }}>
                {c.value}
              </div>
              <div style={{ fontFamily: "var(--font-sans)", fontSize: "0.875rem", color: "var(--text-muted)", fontWeight: 400 }}>
                {c.label}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ── Integrations ───────────────────────────────────────────── */

function Integrations() {
  const [ref, visible] = useInView();
  const row1 = ["Express", "PostgreSQL", "Redis", "BullMQ", "OpenAI", "Anthropic", "LangChain", "AutoGPT", "CrewAI", "Vercel"];
  const row2 = ["Slack", "Linear", "GitHub", "Datadog", "Grafana", "PagerDuty", "Stripe", "AWS", "GCP", "Sentry"];

  const Item = ({ name }: { name: string }) => (
    <span style={{
      display: "inline-flex", alignItems: "center",
      padding: "0 28px", height: 44,
      fontFamily: "var(--font-mono)", fontSize: 12,
      color: "var(--text-muted)", whiteSpace: "nowrap",
      borderRight: "1px solid var(--border)",
    }}>
      {name}
    </span>
  );

  return (
    <section id="integrations" className="section" style={{ background: "var(--bg)", overflow: "hidden" }}>
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 32px" }}>
        <div ref={ref} className={`reveal${visible ? " in" : ""}`} style={{ marginBottom: 48 }}>
          <span className="section-label">— Integrations</span>
          <div>
            <div className="h2-line1" style={{ fontSize: "clamp(2rem, 4vw, 3rem)", letterSpacing: "-0.025em" }}>Works with</div>
            <div className="h2-line2" style={{ fontSize: "clamp(2rem, 4vw, 3rem)", letterSpacing: "-0.025em" }}>your entire stack.</div>
          </div>
        </div>
      </div>

      <div style={{ overflow: "hidden", marginBottom: 8, borderTop: "1px solid var(--border)", borderBottom: "1px solid var(--border)" }}>
        <div className="marquee-track">
          {[...row1, ...row1].map((n, i) => <Item key={i} name={n} />)}
        </div>
      </div>
      <div style={{ overflow: "hidden", borderBottom: "1px solid var(--border)" }}>
        <div className="marquee-track-rev">
          {[...row2, ...row2].map((n, i) => <Item key={i} name={n} />)}
        </div>
      </div>
    </section>
  );
}

/* ── EU AI Act ──────────────────────────────────────────────── */

const ARTICLES: Record<string, { title: string; items: string[] }> = {
  "Art.12": {
    title: "Logging & Traceability",
    items: [
      "Append-only event log with timestamp",
      "SHA-256 content hash per event",
      "Merkle root computation across all events",
      "Input payload hashing",
      "Full hash chain audit trail",
    ],
  },
  "Art.14": {
    title: "Human Oversight",
    items: [
      "Automatic flagging of low-confidence decisions",
      "Human review API with approval workflow",
      "Agent suspension endpoint (stop button)",
      "Mandatory justification for all reviews",
      "Reviewer identity and role logging",
    ],
  },
  "Art.19": {
    title: "Record Keeping",
    items: [
      "JSONL export with full event history",
      "Merkle root signing for tamper-evidence",
      "Export hash logged to audit_exports table",
      "Regulatory-ready format",
      "Cursor-based pagination for large datasets",
    ],
  },
};

function EUAIAct() {
  const [ref, visible] = useInView();
  const [active, setActive] = useState("Art.12");

  return (
    <section id="regulation" className="section" style={{ background: "var(--bg)" }}>
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 32px" }}>
        <div ref={ref} className={`reveal${visible ? " in" : ""}`} style={{ marginBottom: 56 }}>
          <span className="section-label">— Regulation</span>
          <div>
            <div className="h2-line1" style={{ fontSize: "clamp(2rem, 4vw, 3rem)", letterSpacing: "-0.025em" }}>Built for</div>
            <div className="h2-line2" style={{ fontSize: "clamp(2rem, 4vw, 3rem)", letterSpacing: "-0.025em" }}>EU AI Act compliance.</div>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "2fr 3fr", gap: 64, alignItems: "start" }}>
          {/* Pills */}
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {Object.entries(ARTICLES).map(([key, val]) => (
              <button
                key={key}
                className={`article-pill${active === key ? " active" : ""}`}
                onClick={() => setActive(key)}
              >
                <div style={{ fontWeight: 600, marginBottom: 2 }}>{key}</div>
                <div style={{ fontSize: 12, opacity: 0.7 }}>{val.title}</div>
              </button>
            ))}
          </div>

          {/* Feature list */}
          <div>
            <h3 style={{ fontFamily: "var(--font-sans)", fontWeight: 700, fontSize: "1.25rem", color: "var(--text)", marginBottom: 24, letterSpacing: "-0.01em" }}>
              {ARTICLES[active].title}
            </h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {ARTICLES[active].items.map((item, i) => (
                <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                  <div style={{
                    width: 20, height: 20, borderRadius: "50%",
                    background: "var(--text)", display: "flex",
                    alignItems: "center", justifyContent: "center",
                    flexShrink: 0, marginTop: 2,
                  }}>
                    <svg width="9" height="9" viewBox="0 0 10 10" fill="none">
                      <path d="M2 5l2 2 4-4" stroke="#f0ede6" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                  <span style={{ fontFamily: "var(--font-sans)", fontSize: "0.9375rem", color: "var(--text-muted)", lineHeight: 1.55 }}>
                    {item}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ── Developer ──────────────────────────────────────────────── */

const DEV_TABS: Record<string, string> = {
  Install: `# Install the SDK
npm install @clearagent/sdk

# Configure environment
export CLEARAGENT_API_KEY="ca_live_..."
export CLEARAGENT_ORG_ID="org_..."`,

  Initialize: `import { ClearAgent } from '@clearagent/sdk';

// Initialize with your API key
const agent = new ClearAgent({
  apiKey: process.env.CLEARAGENT_API_KEY,
  orgId: process.env.CLEARAGENT_ORG_ID,
});

// Register your AI agent
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
  input: {
    amount: 9500,
    currency: 'USD',
    recipient: 'vendor_abc',
  },
});

// Poll for result
const result = await agent.poll(jobId);
// → {
//   status: 'completed',
//   requiresReview: true,   // confidence < 0.85
//   contentHash: 'sha256:a3f4...',
//   prevHash: 'sha256:9e1b...',
// }`,
};

function Developer() {
  const [ref, visible] = useInView();
  const [tab, setTab] = useState("Install");

  return (
    <section id="developer" className="section" style={{ background: "var(--bg)" }}>
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 32px" }}>
        <div ref={ref} className={`reveal${visible ? " in" : ""}`} style={{ marginBottom: 48 }}>
          <span className="section-label">— Developer</span>
          <div>
            <div className="h2-line1" style={{ fontSize: "clamp(2rem, 4vw, 3rem)", letterSpacing: "-0.025em" }}>Simple API.</div>
            <div className="h2-line2" style={{ fontSize: "clamp(2rem, 4vw, 3rem)", letterSpacing: "-0.025em" }}>Powerful compliance.</div>
          </div>
        </div>

        <div className={`reveal${visible ? " in" : ""} reveal-delay-1`}>
          {/* Tab bar */}
          <div style={{ display: "flex", borderBottom: "1px solid var(--border)", marginBottom: 0 }}>
            {Object.keys(DEV_TABS).map((t) => (
              <button key={t} className={`dev-tab${tab === t ? " active" : ""}`} onClick={() => setTab(t)}>{t}</button>
            ))}
          </div>

          {/* Terminal */}
          <div className="terminal" style={{ borderTopLeftRadius: 0, borderTopRightRadius: 0 }}>
            <div className="terminal-header">
              <div className="terminal-dot" style={{ background: "#ff5f57" }} />
              <div className="terminal-dot" style={{ background: "#febc2e" }} />
              <div className="terminal-dot" style={{ background: "#28c840" }} />
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "#555", marginLeft: 8 }}>
                {tab === "Install" ? "shell" : tab === "Initialize" ? "index.ts" : "verify.ts"}
              </span>
            </div>
            <div
              className="terminal-body"
              style={{ minHeight: 220 }}
              dangerouslySetInnerHTML={{ __html: renderCode(DEV_TABS[tab]) }}
            />
          </div>
        </div>

        <div className={`reveal${visible ? " in" : ""} reveal-delay-2`} style={{ marginTop: 32, display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 16 }}>
          <p style={{ fontFamily: "var(--font-sans)", fontSize: "0.875rem", color: "var(--text-muted)" }}>
            Available in TypeScript, Python, and REST. MIT licensed.
          </p>
          <div style={{ display: "flex", gap: 10 }}>
            <a href="https://github.com/clearagent" className="btn-black btn-sm">View full docs</a>
            <a href="https://github.com/clearagent" className="btn-outline btn-sm">GitHub</a>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ── CTA Card + Footer ──────────────────────────────────────── */

function CTACard() {
  const [ref, visible] = useInView();

  return (
    <section className="section" style={{ background: "var(--bg)" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "0 32px" }}>
        <div
          ref={ref}
          className={`reveal${visible ? " in" : ""}`}
          style={{
            border: "1px solid var(--border)",
            borderRadius: 24,
            background: "white",
            overflow: "hidden",
            display: "grid",
            gridTemplateColumns: "55fr 45fr",
            minHeight: 340,
          }}
        >
          {/* Left */}
          <div style={{ padding: "56px 56px 56px 56px", display: "flex", flexDirection: "column", justifyContent: "center" }}>
            <span className="section-label">— Get started</span>
            <div style={{ marginBottom: 20 }}>
              <div className="h2-line1" style={{ fontSize: "clamp(1.75rem, 3.5vw, 2.75rem)", letterSpacing: "-0.025em" }}>Start verifying</div>
              <div className="h2-line2" style={{ fontSize: "clamp(1.75rem, 3.5vw, 2.75rem)", letterSpacing: "-0.025em" }}>your AI agents today.</div>
            </div>
            <p style={{ fontFamily: "var(--font-sans)", fontSize: "0.9375rem", color: "var(--text-muted)", lineHeight: 1.6, marginBottom: 32 }}>
              Free tier: 1,000 events/month. No credit card required.
            </p>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <a href="#developer" className="btn-black">Get API Key</a>
              <a href="https://github.com/clearagent" className="btn-outline">View docs</a>
            </div>
          </div>

          {/* Right — Globe */}
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "flex-end",
            overflow: "hidden", position: "relative",
            background: "linear-gradient(135deg, #f8f6f0 0%, #ede9e0 100%)",
          }}>
            <div style={{ position: "absolute", right: -40, top: "50%", transform: "translateY(-50%)" }}>
              <GlobeCanvas size={380} />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer style={{ background: "var(--bg)", borderTop: "1px solid var(--border)", padding: "28px 32px" }}>
      <div style={{
        maxWidth: 1200, margin: "0 auto",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        flexWrap: "wrap", gap: 12,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 22, height: 22, borderRadius: 6, background: "var(--text)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg width="10" height="10" viewBox="0 0 14 14" fill="none">
              <path d="M2 7L5.5 10.5L12 3.5" stroke="#f0ede6" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <span style={{ fontFamily: "var(--font-sans)", fontSize: "0.8125rem", color: "var(--text-muted)", fontWeight: 500 }}>
            © 2026 ClearAgent, Inc.
          </span>
        </div>
        <div style={{ display: "flex", gap: 24 }}>
          {["Privacy", "Terms", "GitHub", "Status"].map((l) => (
            <a key={l} href="#"
              style={{ fontFamily: "var(--font-sans)", fontSize: "0.8125rem", color: "var(--text-dim)", textDecoration: "none", transition: "color 0.15s" }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "var(--text-muted)")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-dim)")}
            >
              {l}
            </a>
          ))}
        </div>
      </div>
    </footer>
  );
}

/* ── App ────────────────────────────────────────────────────── */

export default function App() {
  const [isLoading, setIsLoading] = useState(true);

  return (
    <>
      <AnimatePresence>
        {isLoading && <LoadingScreen key="loading" onComplete={() => setIsLoading(false)} />}
      </AnimatePresence>

      {!isLoading && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.15 }}
        >
          <CustomCursor />
          <Nav />
          <Hero />
          <Capabilities />
          <Process />
          <ComplianceStats />
          <LiveMetrics />
          <Integrations />
          <EUAIAct />
          <Developer />
          <CTACard />
          <Footer />
        </motion.div>
      )}
    </>
  );
}
