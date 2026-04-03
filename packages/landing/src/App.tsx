import { useEffect, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import LoadingScreen from "./LoadingScreen";

/* ── Hooks ─────────────────────────────────────────────────── */

function useInView(threshold = 0.12): [React.RefObject<HTMLDivElement>, boolean] {
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

function useCountdown(target: Date) {
  const [diff, setDiff] = useState(Math.max(0, target.getTime() - Date.now()));
  useEffect(() => {
    const id = setInterval(() => setDiff(Math.max(0, target.getTime() - Date.now())), 1000);
    return () => clearInterval(id);
  }, [target]);
  return {
    days:    Math.floor(diff / 86400000),
    hours:   Math.floor((diff % 86400000) / 3600000),
    minutes: Math.floor((diff % 3600000) / 60000),
    seconds: Math.floor((diff % 60000) / 1000),
  };
}

/* ── Custom Cursor ──────────────────────────────────────────── */

function CustomCursor() {
  const ref = useRef<HTMLDivElement>(null);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    const move = (e: MouseEvent) => {
      if (ref.current) {
        ref.current.style.transform = `translate(calc(${e.clientX}px - 50%), calc(${e.clientY}px - 50%))`;
      }
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

/* ── Particle Canvas ────────────────────────────────────────── */

function ParticleCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf: number;
    type P = { x: number; y: number; vx: number; vy: number; r: number; a: number };
    const pts: P[] = [];

    const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; };
    resize();
    window.addEventListener("resize", resize);

    const count = window.devicePixelRatio > 1.5 ? 45 : 60;
    for (let i = 0; i < count; i++) {
      pts.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.25,
        vy: (Math.random() - 0.5) * 0.25,
        r: Math.random() * 0.8 + 0.4,
        a: Math.random() * 0.1 + 0.15,
      });
    }

    const draw = () => {
      if (document.hidden) { raf = requestAnimationFrame(draw); return; }
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (const p of pts) {
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0) p.x = canvas.width;
        if (p.x > canvas.width) p.x = 0;
        if (p.y < 0) p.y = canvas.height;
        if (p.y > canvas.height) p.y = 0;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(124,58,237,${p.a})`;
        ctx.fill();
      }
      for (let i = 0; i < pts.length; i++) {
        for (let j = i + 1; j < pts.length; j++) {
          const dx = pts[i].x - pts[j].x, dy = pts[i].y - pts[j].y;
          const d = Math.sqrt(dx * dx + dy * dy);
          if (d < 120) {
            ctx.beginPath();
            ctx.moveTo(pts[i].x, pts[i].y);
            ctx.lineTo(pts[j].x, pts[j].y);
            ctx.strokeStyle = `rgba(124,58,237,${0.07 * (1 - d / 120)})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        }
      }
      raf = requestAnimationFrame(draw);
    };
    draw();
    return () => { cancelAnimationFrame(raf); window.removeEventListener("resize", resize); };
  }, []);

  return (
    <canvas ref={canvasRef} style={{
      position: "fixed", inset: 0, width: "100%", height: "100%",
      pointerEvents: "none", zIndex: 0, opacity: 0.8,
    }} />
  );
}

/* ── Nav ────────────────────────────────────────────────────── */

function Nav() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", fn, { passive: true });
    return () => window.removeEventListener("scroll", fn);
  }, []);

  const links = ["Compliance", "How It Works", "Live Data", "Developer"];

  return (
    <nav style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 50 }}
      className={`nav-glass transition-all duration-300${scrolled ? " nav-scrolled" : ""}`}>
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        <a href="#" className="flex items-center gap-2.5">
          <div style={{ width: 28, height: 28, borderRadius: 8, background: "var(--cta)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
              <path d="M2 7L5.5 10.5L12 3.5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <span style={{ fontFamily: "var(--font-body)", fontWeight: 500, fontSize: "0.9rem", color: "var(--text)", letterSpacing: "-0.01em" }}>ClearAgent</span>
        </a>

        <div className="hidden md:flex items-center gap-8">
          {links.map((l) => (
            <a key={l} href={`#${l.toLowerCase().replace(/ /g, "-")}`}
              style={{ fontFamily: "var(--font-body)", fontSize: "0.875rem", color: "var(--muted)", transition: "color 0.2s" }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "var(--text)")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "var(--muted)")}>
              {l}
            </a>
          ))}
        </div>

        <div className="hidden md:flex items-center gap-3">
          <a href="https://github.com/clearagent" className="btn-outline-sm">
            <svg width="13" height="13" viewBox="0 0 16 16" fill="currentColor">
              <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/>
            </svg>
            GitHub
          </a>
          <a href="#developer" className="btn-cta" style={{ fontSize: "0.8125rem", padding: "0.5rem 1.25rem", borderRadius: 8 }}>Get API Key</a>
        </div>

        <button onClick={() => setOpen(!open)} style={{ background: "none", border: "none", color: "var(--muted)", display: "flex", alignItems: "center" }}
          className="md:hidden">
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
          {links.map((l) => (
            <a key={l} href={`#${l.toLowerCase().replace(/ /g, "-")}`}
              onClick={() => setOpen(false)}
              style={{ fontFamily: "var(--font-body)", color: "var(--muted)" }}>{l}</a>
          ))}
          <div className="flex gap-3 pt-1">
            <a href="https://github.com/clearagent" className="btn-outline-sm flex-1 justify-center">GitHub</a>
            <a href="#developer" className="btn-cta flex-1" style={{ fontSize: "0.8125rem", padding: "0.5rem 1rem", borderRadius: 8 }}
              onClick={() => setOpen(false)}>Get API Key</a>
          </div>
        </div>
      )}
    </nav>
  );
}

/* ── Hero ───────────────────────────────────────────────────── */

function HeroStats({ active }: { active: boolean }) {
  const ev = useCounter(80, 1200, active);
  const rv = useCounter(10, 1000, active);
  const ci = useCounter(100, 800, active);

  return (
    <div className="flex items-center justify-center gap-2 flex-wrap" style={{ fontFamily: "var(--font-body)", fontSize: "0.8125rem", color: "var(--dim)" }}>
      <span><strong style={{ color: "var(--muted)", fontWeight: 400 }}>{ev}</strong> events verified</span>
      <span style={{ opacity: 0.4 }}>·</span>
      <span><strong style={{ color: "var(--muted)", fontWeight: 400 }}>{rv}</strong> human reviews</span>
      <span style={{ opacity: 0.4 }}>·</span>
      <span><strong style={{ color: "var(--muted)", fontWeight: 400 }}>{ci}%</strong> chain integrity</span>
    </div>
  );
}

function Hero() {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 100);
    window.addEventListener("scroll", fn, { passive: true });
    return () => window.removeEventListener("scroll", fn);
  }, []);

  return (
    <section style={{ position: "relative", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "transparent", paddingTop: 64, zIndex: 1 }}>
      {/* Radial violet glow behind hero content */}
      <div style={{ position: "absolute", inset: 0, pointerEvents: "none", background: "radial-gradient(ellipse 80% 60% at 50% 40%, rgba(124,58,237,0.08) 0%, transparent 70%)" }} />

      <div className="relative max-w-4xl mx-auto px-6 text-center" style={{ zIndex: 2 }}>
        {/* Badges */}
        <div className="h0 inline-flex items-center gap-3 mb-8 flex-wrap justify-center">
          <span className="badge-violet glass" style={{ borderRadius: 9999 }}>EU AI ACT — ART. 12 · 14 · 19</span>
          <span className="badge-green glass" style={{ borderRadius: 9999 }}>OPEN SOURCE · MIT</span>
        </div>

        {/* Headline */}
        <h1 className="h1 mb-6" style={{ fontFamily: "var(--font-display)", fontSize: "clamp(3rem,8vw,6rem)", fontWeight: 300, lineHeight: 1.03, color: "var(--text)" }}>
          The verification layer<br />
          <span className="grad-orange">AI agents need.</span>
        </h1>

        {/* Subtext */}
        <p className="h2 section-subtext max-w-xl mx-auto mb-8" style={{ fontSize: "1.0625rem" }}>
          Cryptographic audit trails, human oversight workflows, and compliance records
          purpose-built for the EU AI Act — Articles 12, 14, and 19.
        </p>

        {/* Inline stats */}
        <div className="h3 mb-10">
          <HeroStats active={true} />
        </div>

        {/* CTAs */}
        <div className="h4 flex flex-col sm:flex-row items-center justify-center gap-4">
          <a href="#developer" className="btn-cta cta-glow">Start Building Free</a>
          <a href="https://github.com/clearagent" className="btn-ghost glass">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/>
            </svg>
            View on GitHub
          </a>
        </div>

        {/* Scroll indicator */}
        {!scrolled && (
          <div className="scroll-bounce mt-20 flex flex-col items-center gap-2" style={{ color: "var(--dim)" }}>
            <span style={{ fontFamily: "var(--font-body)", fontSize: "0.6rem", letterSpacing: "0.2em", textTransform: "uppercase" }}>Scroll</span>
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M2 4L6 8L10 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
        )}
      </div>
    </section>
  );
}

/* ── Trust Ticker ───────────────────────────────────────────── */

const TICKER = [
  "EU AI Act Art. 12", "Append-Only Audit Trail", "Human Oversight (Art. 14)",
  "SHA-256 Hash Chain", "Record Keeping (Art. 19)", "Open Source · MIT",
  "BullMQ Verified", "PostgreSQL Immutable", "Merkle Root Integrity", "August 2026 Ready",
];

function TrustTicker() {
  const doubled = [...TICKER, ...TICKER];
  return (
    <div style={{ position: "relative", zIndex: 1, background: "rgba(7,7,26,0.7)", borderTop: "1px solid var(--border)", borderBottom: "1px solid var(--border)", padding: "18px 0", overflow: "hidden", backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)" }}>
      <div className="ticker-track">
        {doubled.map((item, i) => (
          <span key={i} className="flex items-center gap-3 px-6">
            <span style={{ width: 4, height: 4, borderRadius: "50%", background: "var(--accent)", opacity: 0.7, flexShrink: 0, display: "inline-block" }} />
            <span style={{ fontFamily: "var(--font-body)", fontSize: "0.75rem", fontWeight: 400, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--muted)", whiteSpace: "nowrap" }}>
              {item}
            </span>
          </span>
        ))}
      </div>
    </div>
  );
}

/* ── Compliance Section ─────────────────────────────────────── */

const EU_TARGET = new Date("2026-08-01T00:00:00.000Z");

function ComplianceSection() {
  const [ref, vis] = useInView(0.1);
  const { days, hours, minutes, seconds } = useCountdown(EU_TARGET);

  return (
    <section id="compliance" ref={ref} style={{ position: "relative", zIndex: 1, background: "transparent", padding: "120px 0" }}>
      <div className="max-w-6xl mx-auto px-6">

        {/* Header */}
        <div className={`reveal text-center mb-16 ${vis ? "in" : ""}`}>
          <span className="section-label">Regulatory Compliance</span>
          <h2 className="section-headline mb-4">
            Built for the EU AI Act.<br />
            <span style={{ fontStyle: "italic", color: "var(--accent)" }}>Before it&apos;s required.</span>
          </h2>
          <p className="section-subtext max-w-2xl mx-auto">
            Enforcement begins August 2026. Organizations deploying high-risk AI systems face fines
            up to 3% of global annual revenue for non-compliance.
          </p>
        </div>

        {/* Countdown */}
        <div className={`reveal d1 mb-16 ${vis ? "in" : ""}`}>
          <div className="glass max-w-2xl mx-auto" style={{
            borderRadius: 24, padding: "48px 40px",
            borderColor: "var(--border-glow)",
            boxShadow: "0 0 40px rgba(124,58,237,0.08), inset 0 1px 0 rgba(255,255,255,0.05)",
          }}>
            <p style={{ fontFamily: "var(--font-body)", fontSize: 11, fontWeight: 500, letterSpacing: "0.2em", textTransform: "uppercase", color: "var(--muted)", textAlign: "center", marginBottom: 32 }}>
              EU AI Act Enforcement Deadline
            </p>
            <div className="flex items-start justify-center gap-4 flex-wrap">
              {[
                { value: days,    label: "Days" },
                { value: hours,   label: "Hours" },
                { value: minutes, label: "Minutes" },
                { value: seconds, label: "Seconds", pulse: true },
              ].map((u, i) => (
                <div key={u.label} className="flex items-start gap-4">
                  <div style={{ textAlign: "center" }}>
                    <span className={`cd-num${u.pulse ? " seconds-pulse" : ""}`}>
                      {String(u.value).padStart(2, "0")}
                    </span>
                    <span className="cd-label">{u.label}</span>
                  </div>
                  {i < 3 && <span className="cd-sep" style={{ marginTop: "0.2em" }}>:</span>}
                </div>
              ))}
            </div>
            <p style={{ fontFamily: "var(--font-body)", fontSize: "0.8rem", color: "var(--dim)", textAlign: "center", marginTop: 24 }}>
              August 1, 2026 · Articles 12, 14 &amp; 19 in force
            </p>
          </div>
        </div>

        {/* Article cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">

          {/* Art. 12 — large */}
          <div className={`reveal d2 md:col-span-2 card p-8 ${vis ? "in" : ""}`}
            style={{ borderTopWidth: 2, borderTopColor: "var(--accent)" }}>
            <div className="flex items-center gap-3 mb-5">
              <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.65rem", padding: "3px 10px", borderRadius: 4, background: "var(--accent-soft)", color: "#c4b5fd", border: "1px solid rgba(124,58,237,0.25)" }}>
                ART. 12
              </span>
              <span style={{ fontFamily: "var(--font-display)", fontSize: "1.4rem", fontWeight: 400, color: "var(--text)" }}>Automated Logging</span>
            </div>
            <p className="section-subtext mb-6" style={{ fontSize: "0.9375rem" }}>
              Every verification event is written as an immutable, append-only record. SHA-256 content hashes link each event to its predecessor — forming a cryptographic chain that cannot be altered without detection. A Merkle root proves the full history in a single value.
            </p>
            <div className="grid grid-cols-2 gap-3">
              {["Append-only PostgreSQL trigger","SHA-256 hash chain per event","Merkle root integrity proof","Tamper detection via /audit/integrity"].map((item) => (
                <div key={item} className="flex items-start gap-2">
                  <svg className="flex-shrink-0 mt-1" width="11" height="11" viewBox="0 0 12 12" fill="none">
                    <circle cx="6" cy="6" r="5.5" stroke="var(--accent)" strokeOpacity="0.4"/>
                    <path d="M3.5 6L5 7.5L8.5 4" stroke="var(--accent)" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  <span style={{ fontFamily: "var(--font-body)", fontSize: "0.8125rem", fontWeight: 300, color: "var(--muted)" }}>{item}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Right column */}
          <div className="flex flex-col gap-5">
            {/* Art. 14 — amber, DIFFERENTIATOR */}
            <div className={`reveal d3 card p-6 flex-1 ${vis ? "in" : ""}`}
              style={{ borderTopWidth: 2, borderTopColor: "var(--flagged)", boxShadow: "0 0 0 1px rgba(245,158,11,0.04), 0 8px 40px rgba(0,0,0,0.5), 0 0 30px rgba(245,158,11,0.05), inset 0 1px 0 rgba(255,255,255,0.04)" }}>
              <div className="mb-3">
                <span className="badge-amber">Differentiator</span>
              </div>
              <div className="flex items-center gap-2 mb-3">
                <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.65rem", padding: "3px 10px", borderRadius: 4, background: "rgba(245,158,11,0.1)", color: "#fcd34d", border: "1px solid rgba(245,158,11,0.25)" }}>ART. 14</span>
                <span style={{ fontFamily: "var(--font-display)", fontSize: "1.2rem", fontWeight: 400, color: "var(--text)" }}>Human Oversight</span>
              </div>
              <p style={{ fontFamily: "var(--font-body)", fontSize: "0.8125rem", fontWeight: 300, color: "var(--muted)", lineHeight: 1.65, marginBottom: "0.875rem" }}>
                Low-confidence decisions route to human review. API-enforced agent suspension. Every override logged with mandatory justification.
              </p>
              {["API-enforced agent suspension","Justification required (≥10 chars)","Reviewer identity + role recorded"].map((item) => (
                <div key={item} className="flex items-start gap-2 mb-1.5">
                  <svg className="flex-shrink-0 mt-0.5" width="10" height="10" viewBox="0 0 12 12" fill="none">
                    <circle cx="6" cy="6" r="5.5" stroke="var(--flagged)" strokeOpacity="0.4"/>
                    <path d="M3.5 6L5 7.5L8.5 4" stroke="var(--flagged)" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  <span style={{ fontFamily: "var(--font-body)", fontSize: "0.775rem", fontWeight: 300, color: "var(--muted)" }}>{item}</span>
                </div>
              ))}
            </div>

            {/* Art. 19 */}
            <div className={`reveal d4 card p-6 flex-1 ${vis ? "in" : ""}`}
              style={{ borderTopWidth: 2, borderTopColor: "var(--dim)" }}>
              <div className="flex items-center gap-2 mb-3">
                <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.65rem", padding: "3px 10px", borderRadius: 4, background: "rgba(58,58,92,0.3)", color: "var(--muted)", border: "1px solid var(--border)" }}>ART. 19</span>
                <span style={{ fontFamily: "var(--font-display)", fontSize: "1.2rem", fontWeight: 400, color: "var(--text)" }}>Record-Keeping</span>
              </div>
              <p style={{ fontFamily: "var(--font-body)", fontSize: "0.8125rem", fontWeight: 300, color: "var(--muted)", lineHeight: 1.65, marginBottom: "0.875rem" }}>
                On-demand compliance exports. SHA-256 signed, logged to the audit table. Every export is a point-in-time snapshot.
              </p>
              {["On-demand audit export endpoint","SHA-256 signed payload","Logged to auditExports table"].map((item) => (
                <div key={item} className="flex items-start gap-2 mb-1.5">
                  <svg className="flex-shrink-0 mt-0.5" width="10" height="10" viewBox="0 0 12 12" fill="none">
                    <circle cx="6" cy="6" r="5.5" stroke="var(--muted)" strokeOpacity="0.3"/>
                    <path d="M3.5 6L5 7.5L8.5 4" stroke="var(--muted)" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
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

const STEPS = [
  { n: "01", title: "Agent emits a signal", body: "Your AI agent calls POST /v1/events/verify with input, output, and confidence score. The API returns a jobId immediately.", amber: false },
  { n: "02", title: "Worker builds the chain", body: "A BullMQ worker evaluates oversight policies, computes a SHA-256 hash linked to the prior event, and writes a single immutable INSERT.", amber: false },
  { n: "03", title: "Human review fires", body: "Events below the confidence threshold route to human review. Every override logged with mandatory justification and reviewer identity.", amber: true },
  { n: "04", title: "Audit export ready", body: "Compliance teams export the full event history via GET /v1/audit/export. SHA-256 signed and logged — ready for regulatory inspection.", amber: false },
];

function HowItWorksSection() {
  const [ref, vis] = useInView(0.08);
  return (
    <section id="how-it-works" ref={ref} style={{ position: "relative", zIndex: 1, background: "transparent", padding: "120px 0" }}>
      <div className="max-w-6xl mx-auto px-6">
        <div className={`reveal text-center mb-16 ${vis ? "in" : ""}`}>
          <span className="section-label">Protocol</span>
          <h2 className="section-headline">
            Four steps.<br />
            <span className="grad-violet">One audit trail.</span>
          </h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-5">
          {STEPS.map((s, i) => (
            <div key={s.n} className={`reveal d${i + 1} card p-6 ${vis ? "in" : ""}`}
              style={{ borderTopWidth: 2, borderTopColor: s.amber ? "var(--flagged)" : "var(--accent)" }}>
              <span className="ghost-num">{s.n}</span>
              <div style={{ position: "relative", zIndex: 1 }}>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.65rem", color: s.amber ? "var(--flagged)" : "var(--accent)", opacity: 0.7, display: "block", marginBottom: 10 }}>{s.n}</span>
                <h3 style={{ fontFamily: "var(--font-display)", fontSize: "1.25rem", fontWeight: 400, color: "var(--text)", marginBottom: "0.75rem", lineHeight: 1.3 }}>{s.title}</h3>
                <p style={{ fontFamily: "var(--font-body)", fontSize: "0.8125rem", fontWeight: 300, color: "var(--muted)", lineHeight: 1.65 }}>{s.body}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ── Live Data Section ──────────────────────────────────────── */

const EVENTS = [
  { hash: "a3f9c2d1", status: "approved",        conf: 0.97, time: "2s ago" },
  { hash: "7b4e8f02", status: "requires_review", conf: 0.71, time: "14s ago" },
  { hash: "c1d50a39", status: "approved",        conf: 0.94, time: "38s ago" },
  { hash: "9e2b7c4f", status: "approved",        conf: 0.88, time: "1m ago" },
];

function LiveDataSection() {
  const [ref, vis] = useInView(0.08);
  const ev  = useCounter(80,  1400, vis);
  const rev = useCounter(10,  1200, vis);
  const ci  = useCounter(100, 1000, vis);

  return (
    <section id="live-data" ref={ref} style={{ position: "relative", zIndex: 1, background: "transparent", padding: "120px 0" }}>
      <div className="max-w-6xl mx-auto px-6">
        <div className={`reveal text-center mb-14 ${vis ? "in" : ""}`}>
          <span className="section-label">Live Audit Trail</span>
          <h2 className="section-headline">
            Every decision.<br />
            <span className="grad-violet">Immutably recorded.</span>
          </h2>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          {[
            { value: ev,  label: "Events Verified", color: "var(--text)" },
            { value: rev, label: "Human Reviews",   color: "var(--text)" },
            { value: ci,  label: "Chain Integrity", suffix: "%", color: "var(--verified)" },
          ].map((s, i) => (
            <div key={s.label} className={`reveal d${i+1} card p-8 text-center ${vis ? "in" : ""}`}>
              <div className="stat-num" style={{ color: s.color }}>{s.value}{s.suffix}</div>
              <div className="stat-label">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Terminal */}
        <div className={`reveal d4 terminal ${vis ? "in" : ""}`}>
          <div className="terminal-bar justify-between">
            <div className="flex items-center gap-2">
              <div className="tl-dot" style={{ background: "#ff5f57" }} />
              <div className="tl-dot" style={{ background: "#ffbd2e" }} />
              <div className="tl-dot" style={{ background: "#28c840" }} />
              <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.7rem", color: "var(--muted)", marginLeft: 8 }}>GET /v1/audit/integrity</span>
            </div>
            <span className="badge-intact">intact</span>
          </div>
          <div className="p-5 space-y-2.5">
            {EVENTS.map((e, i) => (
              <div key={e.hash} className={`chain-row flex items-center gap-3 px-3 py-2.5 rounded-xl ${vis ? "in" : ""}`}
                style={{ background: "rgba(255,255,255,0.015)", border: "1px solid var(--border)" }}>
                {i > 0 && <svg width="8" height="10" viewBox="0 0 8 10" fill="none" className="flex-shrink-0">
                  <path d="M4 0v8M1.5 6L4 9L6.5 6" stroke="var(--dim)" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>}
                <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.65rem", color: "#a78bfa", opacity: 0.8, flexShrink: 0 }}>{e.hash}…</span>
                <div className="flex-1 flex items-center gap-2 flex-wrap">
                  <span className="glass" style={{
                    fontFamily: "var(--font-mono)", fontSize: "0.6rem", padding: "2px 8px", borderRadius: 4,
                    color: e.status === "approved" ? "var(--verified)" : "var(--flagged)",
                    borderColor: e.status === "approved" ? "rgba(16,185,129,0.25)" : "rgba(245,158,11,0.25)",
                  }}>{e.status}</span>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.65rem", color: "var(--dim)" }}>
                    confidence: {e.conf.toFixed(2)}
                  </span>
                </div>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.6rem", color: "var(--dim)" }}>{e.time}</span>
              </div>
            ))}
            <div className="flex items-center gap-2 pt-2" style={{ fontFamily: "var(--font-mono)", fontSize: "0.7rem", color: "var(--dim)" }}>
              <span className="blink" style={{ color: "var(--accent)" }}>▊</span>
              <span>merkle_root: 4a7f2c91d83e…  total_events: 80</span>
              <span className="ml-auto" style={{ color: "var(--verified)" }}>✓ chain intact</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ── Open Source ────────────────────────────────────────────── */

function OpenSourceSection() {
  const [ref, vis] = useInView(0.1);
  return (
    <section id="open-source" ref={ref} style={{ position: "relative", zIndex: 1, background: "transparent", padding: "120px 0" }}>
      <div className="max-w-6xl mx-auto px-6">
        <div className="grid md:grid-cols-2 gap-16 items-center">
          <div className={`reveal ${vis ? "in" : ""}`}>
            <span className="section-label">Open Source</span>
            <h2 className="section-headline mb-6">
              Read every line<br />
              <span className="grad-violet">of your audit stack.</span>
            </h2>
            <p className="section-subtext mb-8">
              Compliance tools shouldn&apos;t be black boxes. ClearAgent is MIT-licensed — every trigger,
              every hash function, every oversight policy is auditable before you ship.
            </p>
            <a href="https://github.com/clearagent" className="btn-ghost glass" style={{ display: "inline-flex" }}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/>
              </svg>
              View on GitHub
            </a>
          </div>
          <div className={`reveal d2 card p-6 ${vis ? "in" : ""}`}>
            <div className="grid grid-cols-2 gap-3 mb-5">
              {[["MIT","License"],["TypeScript","Language"],["PostgreSQL","Database"],["BullMQ","Queue"]].map(([v, k]) => (
                <div key={k} className="glass px-3 py-2.5 rounded-xl">
                  <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.6rem", textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--dim)", marginBottom: 3 }}>{k}</div>
                  <div style={{ fontFamily: "var(--font-body)", fontSize: "0.875rem", fontWeight: 500, color: "var(--text)" }}>{v}</div>
                </div>
              ))}
            </div>
            <div className="terminal">
              <div className="terminal-bar">
                <div className="tl-dot" style={{ background: "#ff5f57" }} />
                <div className="tl-dot" style={{ background: "#ffbd2e" }} />
                <div className="tl-dot" style={{ background: "#28c840" }} />
              </div>
              <div className="p-4 space-y-2" style={{ fontSize: "0.775rem" }}>
                {[
                  { p: "$", t: "git clone github.com/clearagent/clearagent", c: "var(--text)" },
                  { p: "$", t: "docker compose up -d", c: "var(--text)" },
                  { p: "✓", t: "Ready on http://localhost:3000", c: "var(--verified)" },
                ].map((l, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span style={{ color: i < 2 ? "var(--accent)" : "var(--verified)", fontFamily: "var(--font-mono)" }}>{l.p}</span>
                    <span style={{ fontFamily: "var(--font-mono)", color: l.c }}>{l.t}</span>
                    {i === 2 && <span className="blink" style={{ color: "var(--verified)" }}>▊</span>}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ── Developer API ──────────────────────────────────────────── */

const TABS = {
  TypeScript: `import { ClearAgent } from '@clearagent/sdk';

const ca = new ClearAgent({
  apiKey: process.env.CLEARAGENT_API_KEY,
});

// Verify an agent decision
const { jobId } = await ca.events.verify({
  agentId: 'agent_abc123',
  input: { query: 'Approve payment of $4,200' },
  output: { decision: 'approved', amount: 4200 },
  confidence: 0.94,
  eventType: 'transaction',
});

// Poll for completion
const result = await ca.jobs.poll(jobId);
// result.requiresReview → false
// result.contentHash → 'a3f9c2d1...'

// Submit human review if flagged
if (result.requiresReview) {
  await ca.reviews.create({
    eventId: result.eventId,
    action: 'approve',
    justification: 'Verified vendor relationship',
    reviewerId: 'reviewer_001',
    reviewerRole: 'compliance_officer',
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
    event_type="transaction",
)

# Poll for completion
result = ca.jobs.poll(job.job_id)
# result.requires_review → False
# result.content_hash → "a3f9c2d1..."

# Stream live events via SSE
for event in ca.events.stream():
    print(f"New: {event.id} — {event.status}")`,
  curl: `# Verify a decision
curl -X POST https://api.clearagent.dev/v1/events/verify \\
  -H "Authorization: Bearer $CLEARAGENT_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "agentId": "agent_abc123",
    "input": { "query": "Approve payment" },
    "output": { "decision": "approved" },
    "confidence": 0.94
  }'
# → { "jobId": "job_abc123" }

# Poll job status
curl https://api.clearagent.dev/v1/jobs/job_abc123 \\
  -H "Authorization: Bearer $CLEARAGENT_API_KEY"
# → { "status": "completed", "eventId": "evt_..." }

# Audit integrity check
curl https://api.clearagent.dev/v1/audit/integrity \\
  -H "Authorization: Bearer $CLEARAGENT_API_KEY"
# → { "status": "intact", "totalEvents": 80, "merkleRoot": "..." }`,
};

type TK = keyof typeof TABS;

function renderCode(code: string) {
  return code.split("\n").map((line, i) => {
    let rest = line;
    const key = i;
    const lineNum = (
      <span key="ln" style={{ userSelect: "none", minWidth: 32, paddingRight: 16, textAlign: "right", display: "inline-block", color: "var(--dim)", opacity: 0.5, fontFamily: "var(--font-mono)", fontSize: "inherit" }}>
        {i + 1}
      </span>
    );

    if (/^\s*\/\//.test(rest)) {
      return <div key={key} className="flex">{lineNum}<span style={{ color: "var(--dim)", fontStyle: "italic", fontFamily: "var(--font-mono)" }}>{rest || "\u00a0"}</span></div>;
    }

    const tokens: React.ReactNode[] = [];
    let k = 0;
    while (rest.length) {
      if (rest.startsWith("//")) {
        tokens.push(<span key={k++} style={{ color: "var(--dim)", fontStyle: "italic" }}>{rest}</span>);
        rest = "";
      } else {
        const str = rest.match(/^(['"`])(?:[^\\]|\\.)*?\1/);
        if (str) { tokens.push(<span key={k++} style={{ color: "#86efac" }}>{str[0]}</span>); rest = rest.slice(str[0].length); continue; }
        const kw = rest.match(/^(import|export|const|let|var|await|new|return|from|if|else|async|function|type|interface|of)\b/);
        if (kw) { tokens.push(<span key={k++} style={{ color: "#a78bfa" }}>{kw[0]}</span>); rest = rest.slice(kw[0].length); continue; }
        const num = rest.match(/^\b\d+\.?\d*\b/);
        if (num) { tokens.push(<span key={k++} style={{ color: "#fcd34d" }}>{num[0]}</span>); rest = rest.slice(num[0].length); continue; }
        tokens.push(<span key={k++}>{rest[0]}</span>);
        rest = rest.slice(1);
      }
    }
    return <div key={key} className="flex">{lineNum}<span style={{ fontFamily: "var(--font-mono)" }}>{tokens.length ? tokens : "\u00a0"}</span></div>;
  });
}

function DeveloperSection() {
  const [ref, vis] = useInView(0.08);
  const [tab, setTab] = useState<TK>("TypeScript");
  const [copied, setCopied] = useState(false);

  const copy = useCallback(() => {
    navigator.clipboard.writeText(TABS[tab]).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [tab]);

  return (
    <section id="developer" ref={ref} style={{ position: "relative", zIndex: 1, background: "transparent", padding: "120px 0" }}>
      <div className="max-w-6xl mx-auto px-6">
        <div className={`reveal text-center mb-14 ${vis ? "in" : ""}`}>
          <span className="section-label">Developer API</span>
          <h2 className="section-headline mb-4">
            Integrate in minutes.<br />
            <span className="grad-orange">Audit for years.</span>
          </h2>
          <p className="section-subtext max-w-xl mx-auto">
            A single REST API. TypeScript, Python, and cURL. Self-hostable with Docker in one command.
          </p>
        </div>

        <div className={`reveal d2 card ${vis ? "in" : ""}`}>
          <div className="terminal-bar justify-between" style={{ padding: "12px 20px" }}>
            <div className="flex items-center gap-2">
              <div className="tl-dot" style={{ background: "#ff5f57" }} />
              <div className="tl-dot" style={{ background: "#ffbd2e" }} />
              <div className="tl-dot" style={{ background: "#28c840" }} />
            </div>
            <div className="flex items-center gap-1">
              {(Object.keys(TABS) as TK[]).map((t) => (
                <button key={t} onClick={() => setTab(t)}
                  style={{
                    fontFamily: "var(--font-mono)", fontSize: "0.7rem",
                    padding: "4px 12px", borderRadius: 6,
                    border: tab === t ? "1px solid rgba(124,58,237,0.4)" : "1px solid transparent",
                    background: tab === t ? "rgba(124,58,237,0.18)" : "transparent",
                    color: tab === t ? "#c4b5fd" : "var(--muted)",
                    transition: "all 0.15s",
                  }}>
                  {t}
                </button>
              ))}
            </div>
            <button onClick={copy}
              style={{ fontFamily: "var(--font-mono)", fontSize: "0.7rem", color: copied ? "var(--verified)" : "var(--dim)", background: "none", border: "none", display: "flex", alignItems: "center", gap: 5, transition: "color 0.2s" }}>
              {copied ? <>
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 6L4.5 8.5L10 3" stroke="var(--verified)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                Copied
              </> : <>
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><rect x="1" y="3" width="7" height="8" rx="1" stroke="currentColor" strokeWidth="1"/><path d="M3 3V2a1 1 0 011-1h5a1 1 0 011 1v7a1 1 0 01-1 1H8" stroke="currentColor" strokeWidth="1" strokeLinecap="round"/></svg>
                Copy
              </>}
            </button>
          </div>
          <div style={{ padding: "20px 20px", fontSize: "0.775rem", lineHeight: 1.8, maxHeight: 420, overflowY: "auto", color: "var(--text)", background: "#040410" }}>
            {renderCode(TABS[tab])}
          </div>
        </div>

        {/* Endpoint pills */}
        <div className={`reveal d3 flex flex-wrap justify-center gap-3 mt-8 ${vis ? "in" : ""}`}>
          {[
            { m: "POST",  p: "/v1/events/verify",       d: "Submit for verification" },
            { m: "GET",   p: "/v1/jobs/:jobId",          d: "Poll async status" },
            { m: "POST",  p: "/v1/reviews",              d: "Submit human review" },
            { m: "PATCH", p: "/v1/agents/:id/status",    d: "Suspend agent" },
            { m: "GET",   p: "/v1/audit/integrity",      d: "Verify hash chain" },
            { m: "GET",   p: "/v1/audit/export",         d: "Export compliance package" },
          ].map((ep) => {
            const mc = ep.m === "GET" ? "var(--verified)" : ep.m === "POST" ? "#c4b5fd" : "var(--flagged)";
            const mb = ep.m === "GET" ? "rgba(16,185,129,0.1)" : ep.m === "POST" ? "var(--accent-soft)" : "rgba(245,158,11,0.1)";
            return (
              <div key={ep.p} className="glass px-4 py-2.5 rounded-xl">
                <div className="flex items-center gap-2">
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.6rem", fontWeight: 500, padding: "1px 6px", borderRadius: 3, background: mb, color: mc, letterSpacing: "0.06em" }}>{ep.m}</span>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.7rem", color: "var(--text)" }}>{ep.p}</span>
                </div>
                <p style={{ fontFamily: "var(--font-body)", fontSize: "0.7rem", fontWeight: 300, color: "var(--dim)", marginTop: 3 }}>{ep.d}</p>
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
  const [ref, vis] = useInView(0.15);
  return (
    <footer ref={ref} style={{ position: "relative", zIndex: 1, background: "transparent", borderTop: "1px solid var(--border)" }}>
      {/* Violet glow rising from bottom */}
      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 480, pointerEvents: "none", background: "radial-gradient(ellipse 70% 100% at 50% 100%, rgba(124,58,237,0.09) 0%, transparent 70%)" }} />

      <div className="relative max-w-3xl mx-auto px-6 py-32 text-center" style={{ zIndex: 2 }}>
        <div className={`reveal ${vis ? "in" : ""}`}>
          <h2 className="mb-8" style={{
            fontFamily: "var(--font-display)", fontWeight: 300,
            fontSize: "clamp(2.25rem,5.5vw,4rem)", lineHeight: 1.06, color: "var(--text)",
          }}>
            The compliance layer<br />
            doesn&apos;t exist yet.<br />
            <span className="grad-violet">We&apos;re building it.</span>
          </h2>
          <p className="section-subtext max-w-lg mx-auto mb-10">
            Free forever for open source. Self-hostable. No usage limits on the API.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-8">
            <a href="#developer" className="btn-cta cta-glow">Get API Key — Free</a>
            <a href="https://github.com/clearagent" className="btn-ghost glass">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/>
              </svg>
              View Source
            </a>
          </div>
          <p style={{ fontFamily: "var(--font-body)", fontSize: "0.8125rem", fontStyle: "italic", color: "var(--dim)" }}>
            The compliance clock is already running.
          </p>
        </div>
      </div>

      <div style={{ borderTop: "1px solid var(--border)", padding: "1.75rem 0", background: "rgba(3,3,10,0.6)", backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)" }}>
        <div className="max-w-6xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div style={{ width: 18, height: 18, borderRadius: 5, background: "var(--cta)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <svg width="9" height="9" viewBox="0 0 14 14" fill="none">
                <path d="M2 7L5.5 10.5L12 3.5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <span style={{ fontFamily: "var(--font-body)", fontSize: "0.8rem", fontWeight: 300, color: "var(--dim)" }}>
              ClearAgent — © {new Date().getFullYear()} — MIT License
            </span>
          </div>
          <div className="flex items-center gap-5">
            {[["Compliance","#compliance"],["How It Works","#how-it-works"],["Developer","#developer"],["GitHub","https://github.com/clearagent"]].map(([l, h]) => (
              <a key={l} href={h} style={{ fontFamily: "var(--font-body)", fontSize: "0.8rem", fontWeight: 300, color: "var(--dim)", transition: "color 0.2s" }}
                onMouseEnter={(e) => (e.currentTarget.style.color = "var(--muted)")}
                onMouseLeave={(e) => (e.currentTarget.style.color = "var(--dim)")}>
                {l}
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
  const [isLoading, setIsLoading] = useState(true);

  // Scroll reveal
  useEffect(() => {
    const els = document.querySelectorAll(".reveal");
    const obs = new IntersectionObserver(
      (entries) => entries.forEach((e) => {
        if (e.isIntersecting) { (e.target as HTMLElement).classList.add("in"); obs.unobserve(e.target); }
      }),
      { threshold: 0.12, rootMargin: "0px 0px -60px 0px" }
    );
    els.forEach((el) => obs.observe(el));
    return () => obs.disconnect();
  }, [isLoading]);

  return (
    <>
      <AnimatePresence>
        {isLoading && <LoadingScreen key="loader" onComplete={() => setIsLoading(false)} />}
      </AnimatePresence>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: isLoading ? 0 : 1 }}
        transition={{ duration: 0.6, delay: 0.25 }}
        style={{ minHeight: "100vh" }}
      >
        <CustomCursor />
        <ParticleCanvas />
        {/* Global violet glow at hero level */}
        <div style={{ position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none", background: "radial-gradient(ellipse 80% 50% at 50% 0%, rgba(124,58,237,0.07) 0%, transparent 60%)" }} />

        <Nav />
        <Hero />
        <TrustTicker />
        <ComplianceSection />
        <HowItWorksSection />
        <LiveDataSection />
        <OpenSourceSection />
        <DeveloperSection />
        <CTAFooter />
      </motion.div>
    </>
  );
}
