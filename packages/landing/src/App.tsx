import { useEffect, useRef, useState, useCallback } from "react";

/* ── Hooks ─────────────────────────────────────────────────── */

function useInView(threshold = 0.15): [React.RefObject<HTMLDivElement>, boolean] {
  const ref = useRef<HTMLDivElement>(null!);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setVisible(true); obs.disconnect(); } },
      { threshold, rootMargin: "0px 0px -60px 0px" }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return [ref, visible];
}

function useCounter(target: number, duration: number, active: boolean): number {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!active) return;
    let start: number | null = null;
    const step = (ts: number) => {
      if (!start) start = ts;
      const p = Math.min((ts - start) / duration, 1);
      setCount(Math.round((1 - Math.pow(1 - p, 3)) * target));
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [active, target, duration]);
  return count;
}

function useCountdown(target: Date) {
  const [diff, setDiff] = useState(target.getTime() - Date.now());
  useEffect(() => {
    const id = setInterval(() => setDiff(target.getTime() - Date.now()), 1000);
    return () => clearInterval(id);
  }, [target]);
  const total = Math.max(0, diff);
  return {
    days: Math.floor(total / 86400000),
    hours: Math.floor((total % 86400000) / 3600000),
    minutes: Math.floor((total % 3600000) / 60000),
    seconds: Math.floor((total % 60000) / 1000),
  };
}

/* ── Custom Cursor ──────────────────────────────────────────── */

function CustomCursor() {
  const ref = useRef<HTMLDivElement>(null);
  const [hovered, setHovered] = useState(false);
  const pos = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const move = (e: MouseEvent) => {
      pos.current = { x: e.clientX, y: e.clientY };
      if (ref.current) {
        ref.current.style.transform = `translate(calc(${e.clientX}px - 50%), calc(${e.clientY}px - 50%))`;
      }
    };
    const over = (e: MouseEvent) => {
      setHovered(!!(e.target as HTMLElement).closest("a, button, [role='button']"));
    };
    document.addEventListener("mousemove", move, { passive: true });
    document.addEventListener("mouseover", over, { passive: true });
    return () => {
      document.removeEventListener("mousemove", move);
      document.removeEventListener("mouseover", over);
    };
  }, [pos]);

  return <div ref={ref} className={`custom-cursor${hovered ? " hovered" : ""}`} />;
}

/* ── Particle Canvas ────────────────────────────────────────── */

function ParticleCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;
    const pts: { x: number; y: number; vx: number; vy: number; r: number }[] = [];

    const resize = () => { canvas.width = canvas.offsetWidth; canvas.height = canvas.offsetHeight; };
    resize();
    window.addEventListener("resize", resize);

    for (let i = 0; i < 55; i++) {
      pts.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.25,
        vy: (Math.random() - 0.5) * 0.25,
        r: Math.random() * 1.2 + 0.4,
      });
    }

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      pts.forEach((p) => {
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0 || p.x > canvas.width) p.vx *= -1;
        if (p.y < 0 || p.y > canvas.height) p.vy *= -1;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(124,58,237,0.4)";
        ctx.fill();
      });
      for (let i = 0; i < pts.length; i++) {
        for (let j = i + 1; j < pts.length; j++) {
          const dx = pts[i].x - pts[j].x, dy = pts[i].y - pts[j].y;
          const d = Math.sqrt(dx * dx + dy * dy);
          if (d < 110) {
            ctx.beginPath();
            ctx.moveTo(pts[i].x, pts[i].y);
            ctx.lineTo(pts[j].x, pts[j].y);
            ctx.strokeStyle = `rgba(124,58,237,${0.1 * (1 - d / 110)})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        }
      }
      animId = requestAnimationFrame(draw);
    };
    draw();
    return () => { cancelAnimationFrame(animId); window.removeEventListener("resize", resize); };
  }, []);

  return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none" style={{ opacity: 0.7 }} />;
}

/* ── Nav ────────────────────────────────────────────────────── */

function Nav() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", fn);
    return () => window.removeEventListener("scroll", fn);
  }, []);

  return (
    <nav className={`fixed top-0 inset-x-0 z-50 nav-blur transition-all duration-300 ${scrolled ? "nav-scrolled" : ""}`}>
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        <a href="#" className="flex items-center gap-2.5 group">
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center transition-all duration-200 group-hover:scale-105"
            style={{ background: "var(--cta)" }}
          >
            <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
              <path d="M2 7L5.5 10.5L12 3.5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <span style={{ fontFamily: "var(--font-body)", fontWeight: 500, fontSize: "0.9rem", color: "var(--text)", letterSpacing: "-0.01em" }}>
            ClearAgent
          </span>
        </a>

        <div className="hidden md:flex items-center gap-8">
          {["Compliance", "How It Works", "Live Data", "Developer"].map((l) => (
            <a
              key={l}
              href={`#${l.toLowerCase().replace(" ", "-")}`}
              className="transition-colors"
              style={{ fontFamily: "var(--font-body)", fontSize: "0.875rem", fontWeight: 400, color: "var(--muted)" }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "var(--text)")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "var(--muted)")}
            >
              {l}
            </a>
          ))}
        </div>

        <div className="hidden md:flex items-center gap-3">
          <a href="https://github.com/clearagent" className="btn-outline text-xs py-2 px-4 inline-flex items-center gap-1.5">
            <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
              <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/>
            </svg>
            GitHub
          </a>
          <a href="#developer" className="btn-primary glow-pulse text-xs py-2 px-4">Get API Key</a>
        </div>

        <button className="md:hidden" onClick={() => setOpen(!open)} aria-label="Toggle menu"
          style={{ color: "var(--muted)", background: "none", border: "none", cursor: "none" }}>
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            {open
              ? <path d="M4 4L16 16M16 4L4 16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              : <path d="M3 6h14M3 10h14M3 14h14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            }
          </svg>
        </button>
      </div>

      {open && (
        <div className="md:hidden px-6 py-4 flex flex-col gap-4"
          style={{ borderTop: "1px solid var(--border)", background: "var(--surface)" }}>
          {["Compliance", "How It Works", "Live Data", "Developer"].map((l) => (
            <a key={l} href={`#${l.toLowerCase().replace(" ", "-")}`}
              onClick={() => setOpen(false)}
              style={{ fontFamily: "var(--font-body)", fontSize: "0.9rem", color: "var(--muted)" }}>
              {l}
            </a>
          ))}
          <div className="flex gap-3 pt-2">
            <a href="https://github.com/clearagent" className="btn-outline text-xs py-2 px-4 flex-1 text-center">GitHub</a>
            <a href="#developer" className="btn-primary text-xs py-2 px-4 flex-1 text-center" onClick={() => setOpen(false)}>Get API Key</a>
          </div>
        </div>
      )}
    </nav>
  );
}

/* ── Hero ───────────────────────────────────────────────────── */

function Hero() {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-16"
      style={{ background: "var(--bg)" }}>
      <ParticleCanvas />

      {/* Violet radial glow */}
      <div className="absolute inset-0 pointer-events-none" style={{
        background: "radial-gradient(ellipse 65% 55% at 50% 38%, rgba(124,58,237,0.1) 0%, transparent 68%)",
      }} />
      {/* Subtle warm glow near bottom */}
      <div className="absolute inset-0 pointer-events-none" style={{
        background: "radial-gradient(ellipse 40% 30% at 50% 80%, rgba(249,115,22,0.04) 0%, transparent 60%)",
      }} />

      <div className="relative z-10 max-w-4xl mx-auto px-6 text-center">
        <div className="hero-0 inline-flex items-center gap-2 mb-8">
          <span className="article-badge">EU AI Act — Art. 12 · 14 · 19</span>
          <span className="article-badge" style={{ background: "rgba(124,58,237,0.08)", color: "#a78bfa", borderColor: "rgba(124,58,237,0.2)" }}>
            Open Source
          </span>
        </div>

        <h1 className="hero-1 leading-none mb-6"
          style={{ fontFamily: "var(--font-display)", fontSize: "clamp(3rem, 7.5vw, 5.5rem)", fontWeight: 300, color: "var(--text)" }}>
          The verification layer<br />
          <span className="gradient-text">AI agents need.</span>
        </h1>

        <p className="hero-2 max-w-2xl mx-auto mb-10"
          style={{ fontFamily: "var(--font-body)", fontSize: "1.0625rem", fontWeight: 300, lineHeight: 1.75, color: "var(--muted)" }}>
          Cryptographic audit trails, human oversight workflows, and compliance records
          purpose-built for the EU AI Act — Articles 12, 14, and 19.
          Enforcement begins August 2026.
        </p>

        <div className="hero-3 flex flex-col sm:flex-row items-center justify-center gap-4">
          <a href="#developer" className="btn-primary glow-pulse" style={{ fontSize: "0.9rem", padding: "0.75rem 2rem" }}>
            Start Building Free
          </a>
          <a href="#how-it-works" className="btn-outline" style={{ fontSize: "0.9rem", padding: "0.75rem 2rem" }}>
            See How It Works
          </a>
        </div>

        <div className="scroll-bounce mt-20 flex flex-col items-center gap-2" style={{ color: "var(--text-dim)" }}>
          <span style={{ fontFamily: "var(--font-body)", fontSize: "0.65rem", letterSpacing: "0.15em", textTransform: "uppercase" }}>Scroll</span>
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M2 4L6 8L10 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
      </div>
    </section>
  );
}

/* ── Trust Bar ──────────────────────────────────────────────── */

const TRUST_ITEMS = [
  "EU AI Act — Art. 12 Logging", "Art. 14 Human Oversight", "Art. 19 Record-Keeping",
  "Append-Only Hash Chain", "SHA-256 Content Integrity", "BullMQ Async Verification",
  "Merkle Root Audit", "PostgreSQL NOTIFY/LISTEN", "MIT License",
  "Drizzle ORM", "GDPR-Ready Data Model",
];

function TrustBar() {
  const doubled = [...TRUST_ITEMS, ...TRUST_ITEMS];
  return (
    <div className="overflow-hidden py-4" style={{ background: "var(--surface)", borderTop: "1px solid var(--border)", borderBottom: "1px solid var(--border)" }}>
      <div className="ticker-track">
        {doubled.map((item, i) => (
          <span key={i} className="flex items-center gap-3 px-8">
            <span className="w-1 h-1 rounded-full flex-shrink-0" style={{ background: "var(--accent)", opacity: 0.6 }} />
            <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.7rem", letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--text-dim)", whiteSpace: "nowrap" }}>
              {item}
            </span>
          </span>
        ))}
      </div>
    </div>
  );
}

/* ── Compliance Section ─────────────────────────────────────── */

const EU_DEADLINE = new Date("2026-08-01T00:00:00Z");

function CountdownUnit({ value, label, pulse }: { value: number; label: string; pulse?: boolean }) {
  return (
    <div className="flex flex-col items-center" style={{ minWidth: 60 }}>
      <span className={`countdown-num${pulse ? " seconds-pulse" : ""}`}>{String(value).padStart(2, "0")}</span>
      <span className="countdown-label">{label}</span>
    </div>
  );
}

function ComplianceSection() {
  const [ref, visible] = useInView(0.1);
  const { days, hours, minutes, seconds } = useCountdown(EU_DEADLINE);

  return (
    <section id="compliance" ref={ref} style={{ background: "var(--surface)", padding: "120px 0" }}>
      <div className="max-w-6xl mx-auto px-6">

        {/* Header */}
        <div className={`fade-up text-center mb-16 ${visible ? "visible" : ""}`}>
          <p className="section-label mb-4">Regulatory Compliance</p>
          <h2 className="section-headline mb-4">
            Built for the EU AI Act.<br />
            <span className="gradient-text-violet">Before it's required.</span>
          </h2>
          <p className="section-subtext max-w-2xl mx-auto">
            Enforcement begins August 2026. Organizations deploying high-risk AI systems face
            fines up to 3% of global annual revenue. ClearAgent makes compliance the default.
          </p>
        </div>

        {/* Countdown */}
        <div className={`fade-up delay-1 mb-16 ${visible ? "visible" : ""}`}>
          <div
            className="max-w-xl mx-auto p-10 text-center ca-card ca-card-glow"
            style={{ borderColor: "rgba(124,58,237,0.3)", borderTopWidth: "2px", borderTopColor: "rgba(124,58,237,0.5)" }}
          >
            <p className="section-label mb-8">EU AI Act Enforcement Deadline</p>
            <div className="flex items-start justify-center gap-6">
              <CountdownUnit value={days} label="Days" />
              <span className="countdown-num" style={{ color: "var(--text-dim)", opacity: 0.3, marginTop: 4 }}>:</span>
              <CountdownUnit value={hours} label="Hours" />
              <span className="countdown-num" style={{ color: "var(--text-dim)", opacity: 0.3, marginTop: 4 }}>:</span>
              <CountdownUnit value={minutes} label="Minutes" />
              <span className="countdown-num" style={{ color: "var(--text-dim)", opacity: 0.3, marginTop: 4 }}>:</span>
              <CountdownUnit value={seconds} label="Seconds" pulse />
            </div>
            <p className="mt-6" style={{ fontFamily: "var(--font-body)", fontSize: "0.75rem", color: "var(--text-dim)", letterSpacing: "0.06em" }}>
              August 1, 2026 · Articles 12, 14 &amp; 19 in force
            </p>
          </div>
        </div>

        {/* Asymmetric article grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

          {/* Art. 12 — large, primary */}
          <div className={`fade-up delay-2 md:col-span-2 ca-card p-8 ${visible ? "visible" : ""}`}
            style={{ borderTopWidth: "2px", borderTopColor: "var(--accent)" }}>
            <div className="flex items-center gap-3 mb-5">
              <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.65rem", fontWeight: 500, letterSpacing: "0.08em", padding: "3px 10px", borderRadius: 4, background: "rgba(124,58,237,0.15)", color: "#c4b5fd", border: "1px solid rgba(124,58,237,0.3)" }}>Art. 12</span>
              <span style={{ fontFamily: "var(--font-display)", fontSize: "1.4rem", fontWeight: 400, color: "var(--text)" }}>Automated Logging</span>
            </div>
            <p style={{ fontFamily: "var(--font-body)", fontSize: "0.9375rem", fontWeight: 300, color: "var(--muted)", lineHeight: 1.7, marginBottom: "1.5rem" }}>
              Every verification event is written as an immutable, append-only record. SHA-256 content hashes link each event to its predecessor — forming a cryptographic chain that cannot be altered without detection. A Merkle root proves the entire history in a single value.
            </p>
            <div className="grid grid-cols-2 gap-3">
              {["Append-only PostgreSQL trigger", "SHA-256 hash chain per event", "Merkle root integrity proof", "Tamper detection via /audit/integrity"].map((item) => (
                <div key={item} className="flex items-start gap-2">
                  <svg className="flex-shrink-0 mt-1" width="11" height="11" viewBox="0 0 12 12" fill="none">
                    <circle cx="6" cy="6" r="5.5" stroke="var(--accent)" strokeOpacity="0.4" />
                    <path d="M3.5 6L5 7.5L8.5 4" stroke="var(--accent)" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  <span style={{ fontFamily: "var(--font-body)", fontSize: "0.8125rem", fontWeight: 300, color: "var(--muted)" }}>{item}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Right column */}
          <div className="flex flex-col gap-6">

            {/* Art. 14 — human oversight, amber + violet glow */}
            <div className={`fade-up delay-3 ca-card ca-card-glow p-6 flex-1 ${visible ? "visible" : ""}`}
              style={{ borderTopWidth: "2px", borderTopColor: "var(--flagged)" }}>
              <div className="flex items-center gap-3 mb-4">
                <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.65rem", fontWeight: 500, letterSpacing: "0.08em", padding: "3px 10px", borderRadius: 4, background: "rgba(245,158,11,0.12)", color: "#fcd34d", border: "1px solid rgba(245,158,11,0.25)" }}>Art. 14</span>
                <span style={{ fontFamily: "var(--font-display)", fontSize: "1.2rem", fontWeight: 400, color: "var(--text)" }}>Human Oversight</span>
              </div>
              <p style={{ fontFamily: "var(--font-body)", fontSize: "0.8125rem", fontWeight: 300, color: "var(--muted)", lineHeight: 1.65, marginBottom: "1rem" }}>
                Low-confidence decisions route to human review. API-enforced agent suspension. Every override logged with mandatory justification.
              </p>
              {["API-enforced agent suspension", "Justification required (≥10 chars)", "Reviewer identity + role recorded"].map((item) => (
                <div key={item} className="flex items-start gap-2 mb-2">
                  <svg className="flex-shrink-0 mt-0.5" width="11" height="11" viewBox="0 0 12 12" fill="none">
                    <circle cx="6" cy="6" r="5.5" stroke="var(--flagged)" strokeOpacity="0.4" />
                    <path d="M3.5 6L5 7.5L8.5 4" stroke="var(--flagged)" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  <span style={{ fontFamily: "var(--font-body)", fontSize: "0.775rem", fontWeight: 300, color: "var(--muted)" }}>{item}</span>
                </div>
              ))}
            </div>

            {/* Art. 19 — record keeping */}
            <div className={`fade-up delay-4 ca-card p-6 flex-1 ${visible ? "visible" : ""}`}
              style={{ borderTopWidth: "2px", borderTopColor: "rgba(124,58,237,0.35)" }}>
              <div className="flex items-center gap-3 mb-4">
                <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.65rem", fontWeight: 500, letterSpacing: "0.08em", padding: "3px 10px", borderRadius: 4, background: "rgba(124,58,237,0.1)", color: "#a78bfa", border: "1px solid rgba(124,58,237,0.2)" }}>Art. 19</span>
                <span style={{ fontFamily: "var(--font-display)", fontSize: "1.2rem", fontWeight: 400, color: "var(--text)" }}>Record-Keeping</span>
              </div>
              <p style={{ fontFamily: "var(--font-body)", fontSize: "0.8125rem", fontWeight: 300, color: "var(--muted)", lineHeight: 1.65, marginBottom: "1rem" }}>
                On-demand compliance exports. SHA-256 signed, logged to the audit table. Every export is a point-in-time snapshot.
              </p>
              {["On-demand audit export endpoint", "SHA-256 signed payload", "Logged to auditExports table"].map((item) => (
                <div key={item} className="flex items-start gap-2 mb-2">
                  <svg className="flex-shrink-0 mt-0.5" width="11" height="11" viewBox="0 0 12 12" fill="none">
                    <circle cx="6" cy="6" r="5.5" stroke="rgba(124,58,237,0.4)" />
                    <path d="M3.5 6L5 7.5L8.5 4" stroke="rgba(124,58,237,0.6)" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  <span style={{ fontFamily: "var(--font-body)", fontSize: "0.775rem", fontWeight: 300, color: "var(--muted)" }}>{item}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ── How It Works ───────────────────────────────────────────── */

const HOW_STEPS = [
  {
    num: "01",
    title: "Agent emits a signal",
    body: "Your AI agent calls POST /v1/events/verify with its input, output, and confidence score. The API returns a jobId immediately.",
    color: "var(--accent)",
    borderColor: "rgba(124,58,237,0.4)",
  },
  {
    num: "02",
    title: "Worker builds the chain",
    body: "A BullMQ worker evaluates oversight policies, computes a SHA-256 hash linked to the prior event, and writes a single immutable INSERT.",
    color: "var(--accent)",
    borderColor: "rgba(124,58,237,0.4)",
  },
  {
    num: "03",
    title: "Human review fires",
    body: "Events below the confidence threshold route to human review. Reviewers approve, reject, or override — every action logged with mandatory justification.",
    color: "var(--flagged)",
    borderColor: "rgba(245,158,11,0.4)",
    amber: true,
  },
  {
    num: "04",
    title: "Audit export ready",
    body: "Compliance teams export the full event history with GET /v1/audit/export. The response is SHA-256 signed — ready for regulatory inspection.",
    color: "var(--accent)",
    borderColor: "rgba(124,58,237,0.4)",
  },
];

function HowItWorksSection() {
  const [ref, visible] = useInView(0.1);

  return (
    <section id="how-it-works" ref={ref} style={{ background: "var(--bg)", padding: "120px 0" }}>
      <div className="max-w-6xl mx-auto px-6">
        <div className={`fade-up text-center mb-20 ${visible ? "visible" : ""}`}>
          <p className="section-label mb-4">Protocol</p>
          <h2 className="section-headline">
            Four steps.<br />
            <span className="gradient-text-violet">One audit trail.</span>
          </h2>
        </div>

        {/* Steps — horizontal on desktop */}
        <div className="flex flex-col md:flex-row items-start gap-4 md:gap-0">
          {HOW_STEPS.map((step, i) => (
            <div key={step.num} className="flex flex-row md:flex-col items-start md:items-stretch flex-1">
              <div className={`fade-up delay-${i + 1} relative overflow-hidden ca-card p-6 mx-0 md:mx-3 flex-1 ${visible ? "visible" : ""}`}
                style={{ borderTopWidth: "2px", borderTopColor: step.amber ? "var(--flagged)" : "var(--accent)" }}>
                {/* Ghost number */}
                <span className="ghost-number">{step.num}</span>
                <div className="relative z-10">
                  <div className="flex items-center gap-2 mb-3">
                    <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.65rem", fontWeight: 500, color: step.amber ? "var(--flagged)" : "var(--accent)", opacity: 0.8 }}>
                      {step.num}
                    </span>
                  </div>
                  <h3 style={{ fontFamily: "var(--font-display)", fontSize: "1.25rem", fontWeight: 400, color: "var(--text)", marginBottom: "0.75rem", lineHeight: 1.3 }}>
                    {step.title}
                  </h3>
                  <p style={{ fontFamily: "var(--font-body)", fontSize: "0.8125rem", fontWeight: 300, color: "var(--muted)", lineHeight: 1.65 }}>
                    {step.body}
                  </p>
                </div>
              </div>
              {/* Connector between steps */}
              {i < HOW_STEPS.length - 1 && (
                <div className="hidden md:flex items-start pt-8 self-start flex-shrink-0">
                  <div style={{ width: 1, height: 1, borderTop: "1px dashed var(--border)", marginTop: 0 }} />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ── Live Data Section ──────────────────────────────────────── */

const HASH_BLOCKS = [
  { hash: "a3f9c2d1", status: "approved",        confidence: 0.97, time: "2s ago" },
  { hash: "7b4e8f02", status: "requires_review", confidence: 0.71, time: "14s ago" },
  { hash: "c1d50a39", status: "approved",        confidence: 0.94, time: "38s ago" },
  { hash: "9e2b7c4f", status: "approved",        confidence: 0.88, time: "1m ago" },
];

function LiveDataSection() {
  const [ref, visible] = useInView(0.1);
  const events   = useCounter(80,  1400, visible);
  const reviews  = useCounter(10,  1200, visible);
  const integrity = useCounter(100, 1000, visible);

  const stats = [
    { label: "Events Verified", value: events, suffix: "" },
    { label: "Human Reviews",   value: reviews, suffix: "" },
    { label: "Chain Integrity", value: integrity, suffix: "%" },
  ];

  return (
    <section id="live-data" ref={ref} style={{ background: "var(--surface)", padding: "120px 0" }}>
      <div className="max-w-6xl mx-auto px-6">

        <div className={`fade-up text-center mb-16 ${visible ? "visible" : ""}`}>
          <p className="section-label mb-4">Live Audit Trail</p>
          <h2 className="section-headline">
            Every decision.<br />
            <span className="gradient-text-violet">Immutably recorded.</span>
          </h2>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-3 gap-4 mb-10">
          {stats.map((s, i) => (
            <div key={s.label} className={`fade-up delay-${i + 1} ca-card p-8 text-center ${visible ? "visible" : ""}`}>
              <div style={{ fontFamily: "var(--font-display)", fontSize: "3.75rem", fontWeight: 300, color: "var(--text)", lineHeight: 1, marginBottom: "0.5rem", letterSpacing: "-0.02em" }}>
                {s.value}{s.suffix}
              </div>
              <div style={{ fontFamily: "var(--font-body)", fontSize: "0.7rem", fontWeight: 500, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--muted)" }}>
                {s.label}
              </div>
            </div>
          ))}
        </div>

        {/* Hash chain terminal */}
        <div className={`fade-up delay-4 ${visible ? "visible" : ""}`}>
          <div className="terminal">
            <div className="terminal-bar justify-between">
              <div className="flex items-center gap-2">
                <div className="terminal-dot" style={{ background: "#ef4444" }} />
                <div className="terminal-dot" style={{ background: "#f59e0b" }} />
                <div className="terminal-dot" style={{ background: "#22c55e" }} />
                <span className="ml-3" style={{ fontFamily: "var(--font-mono)", fontSize: "0.7rem", color: "var(--muted)" }}>
                  GET /v1/audit/integrity
                </span>
              </div>
              <span className="impl-badge">intact</span>
            </div>
            <div className="p-5 space-y-2.5">
              {HASH_BLOCKS.map((b, i) => (
                <div key={b.hash} className="chain-block flex items-center gap-3 px-3 py-2.5 rounded-lg"
                  style={{ background: "rgba(255,255,255,0.015)", border: "1px solid var(--border)" }}>
                  {i > 0 && (
                    <svg className="flex-shrink-0" width="8" height="10" viewBox="0 0 8 10" fill="none">
                      <path d="M4 0v8M1.5 6L4 9L6.5 6" stroke="var(--text-dim)" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  )}
                  <span className="hash-mono flex-shrink-0">{b.hash}…</span>
                  <div className="flex-1 flex items-center gap-2">
                    <span className="text-xs px-1.5 py-0.5 rounded" style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: "0.6rem",
                      background: b.status === "approved" ? "rgba(16,185,129,0.1)" : "rgba(245,158,11,0.1)",
                      color: b.status === "approved" ? "var(--verified)" : "var(--flagged)",
                      border: `1px solid ${b.status === "approved" ? "rgba(16,185,129,0.2)" : "rgba(245,158,11,0.2)"}`,
                    }}>
                      {b.status}
                    </span>
                    <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.65rem", color: "var(--text-dim)" }}>
                      confidence: {b.confidence.toFixed(2)}
                    </span>
                  </div>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.6rem", color: "var(--text-dim)" }}>
                    {b.time}
                  </span>
                </div>
              ))}
              <div className="flex items-center gap-2 pt-2" style={{ fontFamily: "var(--font-mono)", fontSize: "0.7rem", color: "var(--text-dim)" }}>
                <span className="cursor-blink" style={{ color: "var(--accent)" }}>▊</span>
                <span>merkle_root: 4a7f2c91d83e…  total_events: 80</span>
                <span className="ml-auto" style={{ color: "var(--verified)" }}>✓ chain intact</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ── Open Source Section ────────────────────────────────────── */

function OpenSourceSection() {
  const [ref, visible] = useInView(0.15);

  return (
    <section id="open-source" ref={ref} style={{ background: "var(--bg)", padding: "120px 0" }}>
      <div className="max-w-6xl mx-auto px-6">
        <div className="grid md:grid-cols-2 gap-20 items-center">

          <div className={`fade-up ${visible ? "visible" : ""}`}>
            <p className="section-label mb-5">Open Source</p>
            <h2 className="section-headline mb-6">
              Read every line<br />
              <span className="gradient-text-violet">of your audit stack.</span>
            </h2>
            <p className="section-subtext mb-8">
              Compliance tools shouldn't be black boxes. ClearAgent is MIT-licensed and fully open source — every trigger, every hash function, every oversight policy is auditable by your legal and security teams before you ship.
            </p>
            <a href="https://github.com/clearagent" className="btn-outline-violet inline-flex items-center gap-2" style={{ padding: "0.75rem 1.75rem" }}>
              <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/>
              </svg>
              View on GitHub
            </a>
          </div>

          <div className={`fade-up delay-2 ${visible ? "visible" : ""}`}>
            <div className="ca-card p-6">
              {/* Tech facts */}
              <div className="grid grid-cols-2 gap-3 mb-6">
                {[
                  { label: "License", value: "MIT" },
                  { label: "Language", value: "TypeScript" },
                  { label: "Database", value: "PostgreSQL" },
                  { label: "Queue", value: "BullMQ + Redis" },
                ].map((f) => (
                  <div key={f.label} className="px-3 py-2.5 rounded-lg" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
                    <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.6rem", textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--text-dim)", marginBottom: 4 }}>{f.label}</div>
                    <div style={{ fontFamily: "var(--font-body)", fontSize: "0.875rem", fontWeight: 500, color: "var(--text)" }}>{f.value}</div>
                  </div>
                ))}
              </div>
              {/* Terminal */}
              <div className="terminal">
                <div className="terminal-bar">
                  <div className="terminal-dot" style={{ background: "#ef4444" }} />
                  <div className="terminal-dot" style={{ background: "#f59e0b" }} />
                  <div className="terminal-dot" style={{ background: "#22c55e" }} />
                </div>
                <div className="p-4 space-y-2.5" style={{ fontSize: "0.78rem" }}>
                  {[
                    { prompt: "$", text: "git clone github.com/clearagent/clearagent", color: "var(--text)" },
                    { prompt: "$", text: "docker compose up -d", color: "var(--text)" },
                    { prompt: "✓", text: "Ready on http://localhost:3000", color: "var(--verified)" },
                  ].map((line, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <span style={{ color: i < 2 ? "var(--text-dim)" : "var(--verified)" }}>{line.prompt}</span>
                      <span style={{ fontFamily: "var(--font-mono)", color: line.color }}>{line.text}</span>
                      {i === 2 && <span className="cursor-blink ml-1" style={{ color: "var(--verified)" }}>▊</span>}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ── Developer Section ──────────────────────────────────────── */

const CODE_TABS = {
  TypeScript: `import { ClearAgent } from "@clearagent/sdk";

const ca = new ClearAgent({
  apiKey: process.env.CLEARAGENT_API_KEY,
});

// Verify an agent decision
const { jobId } = await ca.events.verify({
  agentId: "agent_abc123",
  input: { query: "Approve payment of $4,200" },
  output: { decision: "approved", amount: 4200 },
  confidence: 0.94,
  eventType: "financial_decision",
});

// Poll for completion
const result = await ca.jobs.poll(jobId);
// → { status: "completed", eventId: "evt_..." }

// Human review for flagged events
if (result.requiresReview) {
  await ca.reviews.create({
    eventId: result.eventId,
    action: "approve",
    justification: "Verified vendor relationship",
    reviewerId: "reviewer_001",
    reviewerEmail: "compliance@example.com",
    reviewerRole: "compliance_officer",
  });
}`,
  Python: `from clearagent import ClearAgent
import os

ca = ClearAgent(api_key=os.environ["CLEARAGENT_API_KEY"])

# Verify an agent decision
job = ca.events.verify(
    agent_id="agent_abc123",
    input={"query": "Approve payment of $4,200"},
    output={"decision": "approved", "amount": 4200},
    confidence=0.94,
    event_type="financial_decision",
)

# Poll for completion
result = ca.jobs.poll(job.job_id)
# → { status: "completed", event_id: "evt_..." }

# Stream live events
for event in ca.events.stream():
    print(f"New event: {event.id} — {event.status}")`,
  curl: `# Verify a decision
curl -X POST https://api.clearagent.dev/v1/events/verify \\
  -H "Authorization: Bearer $CLEARAGENT_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "agentId": "agent_abc123",
    "input": { "query": "Approve payment" },
    "output": { "decision": "approved" },
    "confidence": 0.94,
    "eventType": "financial_decision"
  }'
# → { "jobId": "job_abc123" }

# Poll job status
curl https://api.clearagent.dev/v1/jobs/job_abc123 \\
  -H "Authorization: Bearer $CLEARAGENT_API_KEY"
# → { "status": "completed", "eventId": "evt_abc123" }

# Verify hash chain integrity
curl https://api.clearagent.dev/v1/audit/integrity \\
  -H "Authorization: Bearer $CLEARAGENT_API_KEY"
# → { "status": "intact", "totalEvents": 80, "merkleRoot": "..." }`,
};

type TabKey = keyof typeof CODE_TABS;

function DeveloperSection() {
  const [ref, visible] = useInView(0.1);
  const [tab, setTab] = useState<TabKey>("TypeScript");
  const [copied, setCopied] = useState(false);

  const copy = useCallback(() => {
    navigator.clipboard.writeText(CODE_TABS[tab]).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [tab]);

  return (
    <section id="developer" ref={ref} style={{ background: "var(--surface)", padding: "120px 0" }}>
      <div className="max-w-6xl mx-auto px-6">

        <div className={`fade-up text-center mb-16 ${visible ? "visible" : ""}`}>
          <p className="section-label mb-4">Developer API</p>
          <h2 className="section-headline mb-4">
            Integrate in minutes.<br />
            <span className="gradient-text-violet">Audit for years.</span>
          </h2>
          <p className="section-subtext max-w-xl mx-auto">
            A single REST API. TypeScript, Python, and cURL. Self-hostable with Docker in one command.
          </p>
        </div>

        {/* Code block */}
        <div className={`fade-up delay-2 ${visible ? "visible" : ""}`}>
          <div className="terminal">
            <div className="terminal-bar justify-between">
              <div className="flex items-center gap-2">
                <div className="terminal-dot" style={{ background: "#ef4444" }} />
                <div className="terminal-dot" style={{ background: "#f59e0b" }} />
                <div className="terminal-dot" style={{ background: "#22c55e" }} />
              </div>
              <div className="flex items-center gap-1">
                {(Object.keys(CODE_TABS) as TabKey[]).map((t) => (
                  <button key={t} onClick={() => setTab(t)}
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: "0.7rem",
                      padding: "3px 10px",
                      borderRadius: 4,
                      border: tab === t ? "1px solid rgba(124,58,237,0.4)" : "1px solid transparent",
                      background: tab === t ? "rgba(124,58,237,0.18)" : "transparent",
                      color: tab === t ? "#c4b5fd" : "var(--muted)",
                      cursor: "none",
                      transition: "all 0.15s",
                    }}>
                    {t}
                  </button>
                ))}
              </div>
              <button onClick={copy}
                className="flex items-center gap-1.5 transition-colors"
                style={{ fontFamily: "var(--font-mono)", fontSize: "0.7rem", color: copied ? "var(--verified)" : "var(--muted)", background: "none", border: "none", cursor: "none" }}>
                {copied ? (
                  <><svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                    <path d="M2 6L4.5 8.5L10 3" stroke="var(--verified)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>copied</>
                ) : (
                  <><svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                    <rect x="1" y="3" width="7" height="8" rx="1" stroke="currentColor" strokeWidth="1"/>
                    <path d="M3 3V2a1 1 0 011-1h5a1 1 0 011 1v7a1 1 0 01-1 1H8" stroke="currentColor" strokeWidth="1" strokeLinecap="round"/>
                  </svg>copy</>
                )}
              </button>
            </div>

            <div className="p-5 overflow-x-auto" style={{ fontSize: "0.78rem", lineHeight: 1.7, maxHeight: 420, overflowY: "auto", color: "var(--text)" }}>
              {CODE_TABS[tab].split("\n").map((line, i) => (
                <div key={i} className="flex">
                  <span className="select-none flex-shrink-0 text-right pr-4 w-8" style={{ fontFamily: "var(--font-mono)", color: "var(--text-dim)", opacity: 0.4, fontSize: "inherit" }}>
                    {i + 1}
                  </span>
                  <span style={{ fontFamily: "var(--font-mono)" }}>{line || " "}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Endpoint pills */}
        <div className={`fade-up delay-3 mt-8 flex flex-wrap justify-center gap-3 ${visible ? "visible" : ""}`}>
          {[
            { method: "POST", path: "/v1/events/verify", desc: "Submit for verification" },
            { method: "GET",  path: "/v1/jobs/:jobId",   desc: "Poll async status" },
            { method: "POST", path: "/v1/reviews",       desc: "Submit human review" },
            { method: "PATCH", path: "/v1/agents/:id/status", desc: "Suspend agent" },
            { method: "GET",  path: "/v1/audit/integrity", desc: "Verify hash chain" },
            { method: "GET",  path: "/v1/audit/export",  desc: "Export compliance package" },
          ].map((ep) => {
            const methodColor = ep.method === "GET" ? "var(--verified)" : ep.method === "POST" ? "#c4b5fd" : "var(--flagged)";
            const methodBg = ep.method === "GET" ? "rgba(16,185,129,0.1)" : ep.method === "POST" ? "rgba(124,58,237,0.12)" : "rgba(245,158,11,0.1)";
            return (
              <div key={ep.path} className="px-4 py-2.5 rounded-lg" style={{ background: "var(--surface-3)", border: "1px solid var(--border)" }}>
                <div className="flex items-center gap-2">
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.6rem", fontWeight: 500, padding: "1px 6px", borderRadius: 3, background: methodBg, color: methodColor, letterSpacing: "0.06em" }}>
                    {ep.method}
                  </span>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.7rem", color: "var(--text)" }}>{ep.path}</span>
                </div>
                <p style={{ fontFamily: "var(--font-body)", fontSize: "0.7rem", fontWeight: 300, color: "var(--text-dim)", marginTop: 4 }}>{ep.desc}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* ── CTA Footer ─────────────────────────────────────────────── */

function CTAFooter() {
  const [ref, visible] = useInView(0.15);
  const year = new Date().getFullYear();

  return (
    <footer ref={ref} style={{ background: "var(--bg)", borderTop: "1px solid var(--border)" }}>

      {/* Violet upward glow */}
      <div className="relative overflow-hidden">
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-full pointer-events-none" style={{
          height: 400,
          background: "radial-gradient(ellipse 60% 100% at 50% 100%, rgba(124,58,237,0.07) 0%, transparent 70%)",
        }} />

        <div className="relative z-10 py-32 max-w-3xl mx-auto px-6 text-center">
          <div className={`fade-up ${visible ? "visible" : ""}`}>
            <h2 className="mb-8" style={{
              fontFamily: "var(--font-display)",
              fontSize: "clamp(2.25rem, 5vw, 3.75rem)",
              fontWeight: 300,
              lineHeight: 1.08,
              color: "var(--text)",
              letterSpacing: "-0.01em",
            }}>
              The compliance layer<br />
              doesn&apos;t exist yet.<br />
              <span className="gradient-text-violet">We&apos;re building it.</span>
            </h2>

            <p className="section-subtext max-w-lg mx-auto mb-10">
              Free forever for open source. Self-hostable. No usage limits on the API.
              The compliance clock is already running.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <a href="#developer" className="btn-primary glow-pulse" style={{ fontSize: "0.9375rem", padding: "0.8125rem 2.25rem" }}>
                Get API Key — Free
              </a>
              <a href="https://github.com/clearagent" className="btn-outline-violet inline-flex items-center gap-2" style={{ fontSize: "0.9375rem", padding: "0.8125rem 2.25rem" }}>
                <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                  <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/>
                </svg>
                View Source
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Footer nav */}
      <div style={{ borderTop: "1px solid var(--border)", padding: "2rem 0" }}>
        <div className="max-w-6xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded flex items-center justify-center" style={{ background: "var(--cta)" }}>
              <svg width="10" height="10" viewBox="0 0 14 14" fill="none">
                <path d="M2 7L5.5 10.5L12 3.5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <span style={{ fontFamily: "var(--font-body)", fontSize: "0.8rem", fontWeight: 300, color: "var(--text-dim)" }}>
              ClearAgent — © {year} — MIT License
            </span>
          </div>
          <div className="flex items-center gap-6">
            {[
              { label: "Compliance",   href: "#compliance" },
              { label: "How It Works", href: "#how-it-works" },
              { label: "Developer",    href: "#developer" },
              { label: "GitHub",       href: "https://github.com/clearagent" },
            ].map((l) => (
              <a key={l.label} href={l.href}
                style={{ fontFamily: "var(--font-body)", fontSize: "0.8rem", fontWeight: 300, color: "var(--text-dim)" }}
                onMouseEnter={(e) => (e.currentTarget.style.color = "var(--text)")}
                onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-dim)")}
              >
                {l.label}
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}

/* ── App ────────────────────────────────────────────────────── */

export default function App() {
  useEffect(() => {
    const els = document.querySelectorAll(".fade-up");
    const obs = new IntersectionObserver(
      (entries) => entries.forEach((e) => {
        if (e.isIntersecting) {
          (e.target as HTMLElement).classList.add("visible");
          obs.unobserve(e.target);
        }
      }),
      { threshold: 0.15, rootMargin: "0px 0px -60px 0px" }
    );
    els.forEach((el) => obs.observe(el));
    return () => obs.disconnect();
  }, []);

  return (
    <div style={{ background: "var(--bg)", minHeight: "100vh" }}>
      <CustomCursor />
      <Nav />
      <Hero />
      <TrustBar />
      <ComplianceSection />
      <HowItWorksSection />
      <LiveDataSection />
      <OpenSourceSection />
      <DeveloperSection />
      <CTAFooter />
    </div>
  );
}
