import { useEffect, useRef, useState, useCallback } from "react";

/* ── Hooks ─────────────────────────────────────────────────── */

function useInView(threshold = 0.2): [React.RefObject<HTMLDivElement>, boolean] {
  const ref = useRef<HTMLDivElement>(null!);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setVisible(true); obs.disconnect(); } },
      { threshold }
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
      const progress = Math.min((ts - start) / duration, 1);
      const ease = 1 - Math.pow(1 - progress, 3);
      setCount(Math.round(ease * target));
      if (progress < 1) requestAnimationFrame(step);
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
  const days = Math.floor(total / 86400000);
  const hours = Math.floor((total % 86400000) / 3600000);
  const minutes = Math.floor((total % 3600000) / 60000);
  const seconds = Math.floor((total % 60000) / 1000);
  return { days, hours, minutes, seconds };
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
    const particles: { x: number; y: number; vx: number; vy: number; r: number }[] = [];

    const resize = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    for (let i = 0; i < 60; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        r: Math.random() * 1.5 + 0.5,
      });
    }

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0 || p.x > canvas.width) p.vx *= -1;
        if (p.y < 0 || p.y > canvas.height) p.vy *= -1;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(99,102,241,0.35)";
        ctx.fill();
      });
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 100) {
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.strokeStyle = `rgba(99,102,241,${0.12 * (1 - dist / 100)})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        }
      }
      animId = requestAnimationFrame(draw);
    };
    draw();
    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", resize);
    };
  }, []);
  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none"
      style={{ opacity: 0.6 }}
    />
  );
}

/* ── Nav ────────────────────────────────────────────────────── */

function Nav() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const links = ["Compliance", "How It Works", "Live Data", "Developer"];

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 nav-blur transition-all duration-300 ${scrolled ? "nav-scrolled" : ""}`}
    >
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        <a href="#" className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-ca-accent flex items-center justify-center">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M2 7L5.5 10.5L12 3.5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <span className="font-semibold text-ca-text text-sm tracking-tight">ClearAgent</span>
        </a>

        <div className="hidden md:flex items-center gap-8">
          {links.map((l) => (
            <a
              key={l}
              href={`#${l.toLowerCase().replace(" ", "-")}`}
              className="text-sm text-ca-muted hover:text-ca-text transition-colors"
            >
              {l}
            </a>
          ))}
        </div>

        <div className="hidden md:flex items-center gap-3">
          <a href="https://github.com/clearagent" className="btn-outline text-xs py-2 px-4">
            GitHub
          </a>
          <a
            href="#developer"
            className="btn-primary text-xs py-2 px-4 glow-pulse inline-block"
          >
            Get API Key
          </a>
        </div>

        <button
          className="md:hidden text-ca-muted hover:text-ca-text transition-colors"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="Toggle menu"
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            {mobileOpen ? (
              <path d="M4 4L16 16M16 4L4 16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            ) : (
              <path d="M3 6h14M3 10h14M3 14h14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            )}
          </svg>
        </button>
      </div>

      {mobileOpen && (
        <div className="md:hidden border-t border-ca-border bg-ca-surface px-6 py-4 flex flex-col gap-4">
          {links.map((l) => (
            <a
              key={l}
              href={`#${l.toLowerCase().replace(" ", "-")}`}
              className="text-sm text-ca-muted hover:text-ca-text transition-colors"
              onClick={() => setMobileOpen(false)}
            >
              {l}
            </a>
          ))}
          <div className="flex gap-3 pt-2">
            <a href="https://github.com/clearagent" className="btn-outline text-xs py-2 px-4 flex-1 text-center">GitHub</a>
            <a href="#developer" className="btn-primary text-xs py-2 px-4 flex-1 text-center" onClick={() => setMobileOpen(false)}>Get API Key</a>
          </div>
        </div>
      )}
    </nav>
  );
}

/* ── Hero ───────────────────────────────────────────────────── */

function Hero() {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-ca-bg pt-16">
      <ParticleCanvas />

      {/* Radial glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 60% 50% at 50% 40%, rgba(99,102,241,0.08) 0%, transparent 70%)",
        }}
      />

      <div className="relative z-10 max-w-4xl mx-auto px-6 text-center">
        <div className="hero-0 inline-flex items-center gap-2 mb-8">
          <span className="article-badge">EU AI Act — Art. 12 · 14 · 19</span>
          <span className="article-badge" style={{ background: "rgba(0,212,170,0.12)", color: "var(--accent-2)", borderColor: "rgba(0,212,170,0.25)" }}>
            Open Source
          </span>
        </div>

        <h1
          className="hero-1 hero-headline font-serif text-ca-text leading-none mb-6"
          style={{ fontSize: "clamp(2.75rem, 7vw, 5rem)" }}
        >
          The verification layer
          <br />
          <span className="gradient-text">AI agents need.</span>
        </h1>

        <p className="hero-2 text-ca-muted text-lg max-w-2xl mx-auto mb-10 leading-relaxed">
          Cryptographic audit trails, human oversight workflows, and compliance
          records purpose-built for the EU AI Act — Articles 12, 14, and 19.
          Enforcement begins August 2026.
        </p>

        <div className="hero-3 flex flex-col sm:flex-row items-center justify-center gap-4">
          <a href="#developer" className="btn-primary glow-pulse text-sm px-6 py-3">
            Start Building Free
          </a>
          <a href="#how-it-works" className="btn-outline text-sm px-6 py-3">
            See How It Works
          </a>
        </div>

        <div
          className="scroll-bounce mt-20 flex flex-col items-center gap-2 text-ca-muted"
          style={{ fontSize: "0.7rem", letterSpacing: "0.08em", textTransform: "uppercase" }}
        >
          <span>Scroll</span>
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
  "EU AI Act — Art. 12 Logging",
  "Art. 14 Human Oversight",
  "Art. 19 Record-Keeping",
  "Append-Only Hash Chain",
  "SHA-256 Content Integrity",
  "BullMQ Async Verification",
  "Merkle Root Audit",
  "PostgreSQL NOTIFY/LISTEN",
  "Open Source — MIT License",
  "Drizzle ORM Parameterized Queries",
  "GDPR-Ready Data Model",
];

function TrustBar() {
  const doubled = [...TRUST_ITEMS, ...TRUST_ITEMS];
  return (
    <div className="bg-ca-surface border-y border-ca-border py-4 overflow-hidden">
      <div className="ticker-track">
        {doubled.map((item, i) => (
          <span key={i} className="flex items-center gap-3 px-6">
            <span
              className="w-1 h-1 rounded-full flex-shrink-0"
              style={{ background: "var(--accent-2)" }}
            />
            <span
              className="text-ca-muted whitespace-nowrap"
              style={{ fontSize: "0.75rem", letterSpacing: "0.06em", textTransform: "uppercase", fontFamily: "var(--font-mono)" }}
            >
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

function CountdownUnit({ value, label }: { value: number; label: string }) {
  return (
    <div className="countdown-unit">
      <span className="countdown-num">{String(value).padStart(2, "0")}</span>
      <span className="countdown-label">{label}</span>
    </div>
  );
}

function ComplianceSection() {
  const [ref, visible] = useInView(0.15);
  const { days, hours, minutes, seconds } = useCountdown(EU_DEADLINE);

  const articles = [
    {
      id: "Art. 12",
      title: "Automated Logging",
      body: "Every verification event is written as an immutable append-only record. SHA-256 content hashes link each event to its predecessor, forming a cryptographic chain that cannot be altered without detection.",
      color: "var(--accent)",
      done: ["Append-only PostgreSQL trigger", "SHA-256 hash chain per event", "Merkle root integrity proof", "Tamper detection via /audit/integrity"],
    },
    {
      id: "Art. 14",
      title: "Human Oversight",
      body: "Agents flagged by policy evaluators are held for human review before decisions are finalized. Every override is logged with a mandatory justification and reviewer identity.",
      color: "var(--accent-2)",
      done: ["API-enforced agent suspension", "Mandatory justification (≥ 10 chars)", "Reviewer identity + role recorded", "Audit trail per review action"],
    },
    {
      id: "Art. 19",
      title: "Record-Keeping",
      body: "Compliance packages can be exported on demand — signed with a SHA-256 file hash and logged to the audit exports table. Every export is a point-in-time snapshot of the full event history.",
      color: "var(--accent-3)",
      done: ["On-demand audit export endpoint", "File hash of exported payload", "Export logged to auditExports table", "Agent + org metadata included"],
    },
  ];

  return (
    <section id="compliance" className="py-24 bg-ca-bg" ref={ref}>
      <div className="max-w-6xl mx-auto px-6">
        <div className={`fade-up text-center mb-16 ${visible ? "visible" : ""}`}>
          <p
            className="text-ca-muted mb-3"
            style={{ fontFamily: "var(--font-mono)", fontSize: "0.75rem", letterSpacing: "0.1em", textTransform: "uppercase" }}
          >
            Regulatory Compliance
          </p>
          <h2
            className="font-serif text-ca-text mb-4"
            style={{ fontSize: "clamp(2rem, 4vw, 2.75rem)" }}
          >
            Built for the EU AI Act.
            <br />
            <span className="gradient-text-teal">Before it's required.</span>
          </h2>
          <p className="text-ca-muted max-w-xl mx-auto text-base">
            Enforcement begins August 2026. Organizations deploying high-risk AI systems face fines up to 3% of global annual revenue for non-compliance.
          </p>
        </div>

        {/* Countdown */}
        <div className={`fade-up delay-1 mb-16 ${visible ? "visible" : ""}`}>
          <div
            className="ca-card max-w-lg mx-auto p-8 text-center"
            style={{ background: "rgba(13,13,20,0.8)", borderColor: "rgba(99,102,241,0.2)" }}
          >
            <p
              className="text-ca-muted mb-6"
              style={{ fontFamily: "var(--font-mono)", fontSize: "0.7rem", letterSpacing: "0.1em", textTransform: "uppercase" }}
            >
              EU AI Act Enforcement Deadline
            </p>
            <div className="flex items-center justify-center gap-4">
              <CountdownUnit value={days} label="Days" />
              <span className="countdown-num" style={{ color: "var(--muted)", opacity: 0.5 }}>:</span>
              <CountdownUnit value={hours} label="Hours" />
              <span className="countdown-num" style={{ color: "var(--muted)", opacity: 0.5 }}>:</span>
              <CountdownUnit value={minutes} label="Minutes" />
              <span className="countdown-num" style={{ color: "var(--muted)", opacity: 0.5 }}>:</span>
              <CountdownUnit value={seconds} label="Seconds" />
            </div>
            <p className="mt-4 text-ca-muted" style={{ fontSize: "0.75rem" }}>
              August 1, 2026 · Articles 12, 14 & 19 in force
            </p>
          </div>
        </div>

        {/* Article cards */}
        <div className="grid md:grid-cols-3 gap-6">
          {articles.map((a, i) => (
            <div
              key={a.id}
              className={`fade-up delay-${i + 2} ca-card p-6 ${visible ? "visible" : ""}`}
            >
              <div className="flex items-center gap-3 mb-4">
                <span
                  className="font-mono text-xs font-bold px-2 py-1 rounded"
                  style={{ background: `${a.color}20`, color: a.color, border: `1px solid ${a.color}40` }}
                >
                  {a.id}
                </span>
                <span className="text-ca-text font-medium text-sm">{a.title}</span>
              </div>
              <p className="text-ca-muted text-sm leading-relaxed mb-5">{a.body}</p>
              <ul className="space-y-2">
                {a.done.map((item) => (
                  <li key={item} className="flex items-start gap-2">
                    <svg
                      className="flex-shrink-0 mt-0.5"
                      width="12"
                      height="12"
                      viewBox="0 0 12 12"
                      fill="none"
                    >
                      <circle cx="6" cy="6" r="5.5" stroke={a.color} strokeOpacity="0.4" />
                      <path d="M3.5 6L5 7.5L8.5 4" stroke={a.color} strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    <span className="text-ca-muted" style={{ fontSize: "0.75rem" }}>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ── How It Works ───────────────────────────────────────────── */

function HowItWorksSection() {
  const [ref, visible] = useInView(0.1);

  const steps = [
    {
      num: "01",
      title: "Agent emits a verification signal",
      body: "Your AI agent calls POST /v1/events/verify with its input payload, output, and confidence score. The API immediately returns a jobId.",
      accent: "var(--accent)",
    },
    {
      num: "02",
      title: "Worker verifies and builds the hash chain",
      body: "A BullMQ worker evaluates oversight policies, computes a SHA-256 content hash linked to the previous event, and writes a single immutable INSERT.",
      accent: "var(--accent-2)",
    },
    {
      num: "03",
      title: "Low-confidence decisions route to human review",
      body: "Events below the confidence threshold are flagged as requires_review. Reviewers approve, reject, or override — each action requires a justification logged to the audit trail.",
      accent: "var(--accent-3)",
    },
    {
      num: "04",
      title: "Audit packages on demand",
      body: "Compliance teams export the full event history with a single GET /v1/audit/export call. The response is SHA-256 signed and logged — ready for regulatory inspection.",
      accent: "var(--accent)",
    },
  ];

  return (
    <section id="how-it-works" className="py-24" style={{ background: "var(--surface)" }} ref={ref}>
      <div className="max-w-6xl mx-auto px-6">
        <div className={`fade-up text-center mb-16 ${visible ? "visible" : ""}`}>
          <p
            className="text-ca-muted mb-3"
            style={{ fontFamily: "var(--font-mono)", fontSize: "0.75rem", letterSpacing: "0.1em", textTransform: "uppercase" }}
          >
            Protocol
          </p>
          <h2
            className="font-serif text-ca-text"
            style={{ fontSize: "clamp(2rem, 4vw, 2.75rem)" }}
          >
            How ClearAgent works
          </h2>
        </div>

        <div className="relative">
          {/* Connector line */}
          <div
            className="absolute left-8 top-8 bottom-8 w-px hidden md:block"
            style={{ background: "linear-gradient(to bottom, var(--border), transparent)" }}
          />

          <div className="space-y-8">
            {steps.map((s, i) => (
              <div
                key={s.num}
                className={`fade-up delay-${i + 1} flex gap-6 ${visible ? "visible" : ""}`}
              >
                <div className="flex-shrink-0">
                  <div
                    className="step-num"
                    style={{ background: `${s.accent}18`, borderColor: `${s.accent}40`, color: s.accent }}
                  >
                    {s.num}
                  </div>
                </div>
                <div className="ca-card flex-1 p-5">
                  <h3 className="text-ca-text font-medium mb-2 text-sm">{s.title}</h3>
                  <p className="text-ca-muted text-sm leading-relaxed">{s.body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ── Live Data Section ──────────────────────────────────────── */

const HASH_BLOCKS = [
  { hash: "a3f9c2d1", status: "approved", confidence: 0.97, time: "2s ago" },
  { hash: "7b4e8f02", status: "requires_review", confidence: 0.71, time: "14s ago" },
  { hash: "c1d50a39", status: "approved", confidence: 0.94, time: "38s ago" },
  { hash: "9e2b7c4f", status: "approved", confidence: 0.88, time: "1m ago" },
];

function LiveDataSection() {
  const [ref, visible] = useInView(0.15);
  const eventsCount = useCounter(10247, 1800, visible);
  const reviewsCount = useCounter(843, 1400, visible);
  const integrityPct = useCounter(100, 1200, visible);

  const stats = [
    { label: "Events Verified", value: eventsCount.toLocaleString(), suffix: "" },
    { label: "Human Reviews", value: reviewsCount.toLocaleString(), suffix: "" },
    { label: "Chain Integrity", value: integrityPct, suffix: "%" },
  ];

  return (
    <section id="live-data" className="py-24 bg-ca-bg" ref={ref}>
      <div className="max-w-6xl mx-auto px-6">
        <div className={`fade-up text-center mb-16 ${visible ? "visible" : ""}`}>
          <p
            className="text-ca-muted mb-3"
            style={{ fontFamily: "var(--font-mono)", fontSize: "0.75rem", letterSpacing: "0.1em", textTransform: "uppercase" }}
          >
            Live Audit Trail
          </p>
          <h2
            className="font-serif text-ca-text"
            style={{ fontSize: "clamp(2rem, 4vw, 2.75rem)" }}
          >
            Every decision.
            <br />
            <span className="gradient-text">Immutably recorded.</span>
          </h2>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-3 gap-4 mb-12">
          {stats.map((s, i) => (
            <div
              key={s.label}
              className={`fade-up delay-${i + 1} ca-card p-6 text-center ${visible ? "visible" : ""}`}
            >
              <div
                className="font-mono font-bold mb-1"
                style={{ fontSize: "2rem", color: "var(--text)", lineHeight: 1 }}
              >
                {s.value}{s.suffix}
              </div>
              <div className="text-ca-muted" style={{ fontSize: "0.75rem", letterSpacing: "0.06em", textTransform: "uppercase" }}>
                {s.label}
              </div>
            </div>
          ))}
        </div>

        {/* Hash chain visualization */}
        <div className={`fade-up delay-4 ${visible ? "visible" : ""}`}>
          <div className="terminal">
            <div className="terminal-bar">
              <div className="terminal-dot" style={{ background: "#ef4444" }} />
              <div className="terminal-dot" style={{ background: "#f59e0b" }} />
              <div className="terminal-dot" style={{ background: "#22c55e" }} />
              <span className="ml-3 text-ca-muted" style={{ fontSize: "0.7rem", fontFamily: "var(--font-mono)" }}>
                GET /v1/audit/integrity
              </span>
              <span
                className="ml-auto impl-badge"
              >
                intact
              </span>
            </div>
            <div className="p-4 space-y-3">
              {HASH_BLOCKS.map((b, i) => (
                <div
                  key={b.hash}
                  className="chain-block flex items-center gap-3 p-3 rounded-lg"
                  style={{ background: "rgba(255,255,255,0.02)", border: "1px solid var(--border)" }}
                >
                  {i > 0 && (
                    <div className="flex items-center gap-1 text-ca-muted" style={{ fontSize: "0.6rem" }}>
                      <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                        <path d="M4 0v8M1 5l3 3 3-3" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </div>
                  )}
                  <span className="hash-mono flex-shrink-0">{b.hash}…</span>
                  <div className="flex-1 flex items-center gap-2">
                    <span
                      className="text-xs px-1.5 py-0.5 rounded"
                      style={{
                        background: b.status === "approved" ? "rgba(0,212,170,0.1)" : "rgba(255,107,53,0.1)",
                        color: b.status === "approved" ? "var(--accent-2)" : "var(--accent)",
                        border: `1px solid ${b.status === "approved" ? "rgba(0,212,170,0.2)" : "rgba(255,107,53,0.2)"}`,
                        fontSize: "0.65rem",
                        fontFamily: "var(--font-mono)",
                      }}
                    >
                      {b.status}
                    </span>
                    <span className="text-ca-muted" style={{ fontSize: "0.7rem" }}>
                      confidence: {b.confidence.toFixed(2)}
                    </span>
                  </div>
                  <span className="text-ca-muted" style={{ fontSize: "0.65rem", fontFamily: "var(--font-mono)" }}>
                    {b.time}
                  </span>
                </div>
              ))}
              <div
                className="flex items-center gap-2 text-ca-muted pt-1"
                style={{ fontSize: "0.7rem", fontFamily: "var(--font-mono)" }}
              >
                <span className="cursor-blink" style={{ color: "var(--accent-2)" }}>▊</span>
                <span>merkle_root: 4a7f2c91d83e…</span>
                <span className="ml-auto" style={{ color: "var(--accent-2)" }}>✓ chain intact</span>
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

  const facts = [
    { label: "License", value: "MIT" },
    { label: "Language", value: "TypeScript" },
    { label: "Database", value: "PostgreSQL" },
    { label: "Queue", value: "BullMQ + Redis" },
  ];

  return (
    <section id="open-source" className="py-24" style={{ background: "var(--surface)" }} ref={ref}>
      <div className="max-w-6xl mx-auto px-6">
        <div className="grid md:grid-cols-2 gap-16 items-center">
          <div>
            <div className={`fade-up ${visible ? "visible" : ""}`}>
              <p
                className="text-ca-muted mb-3"
                style={{ fontFamily: "var(--font-mono)", fontSize: "0.75rem", letterSpacing: "0.1em", textTransform: "uppercase" }}
              >
                Open Source
              </p>
              <h2
                className="font-serif text-ca-text mb-5"
                style={{ fontSize: "clamp(2rem, 4vw, 2.75rem)" }}
              >
                Read every line
                <br />
                <span className="gradient-text-teal">of your audit stack.</span>
              </h2>
              <p className="text-ca-muted leading-relaxed mb-8">
                Compliance tools shouldn't be black boxes. ClearAgent is MIT-licensed and fully open source — every trigger, every hash function, every oversight policy is auditable by your legal and security teams before you ship.
              </p>
              <a href="https://github.com/clearagent" className="btn-outline text-sm px-6 py-3 inline-flex items-center gap-2">
                <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                  <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/>
                </svg>
                View on GitHub
              </a>
            </div>
          </div>

          <div className={`fade-up delay-2 ${visible ? "visible" : ""}`}>
            <div className="ca-card p-6">
              <div className="grid grid-cols-2 gap-3 mb-6">
                {facts.map((f) => (
                  <div
                    key={f.label}
                    className="p-3 rounded-lg"
                    style={{ background: "var(--surface-2)", border: "1px solid var(--border)" }}
                  >
                    <div className="text-ca-muted mb-1" style={{ fontSize: "0.65rem", fontFamily: "var(--font-mono)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                      {f.label}
                    </div>
                    <div className="text-ca-text font-medium text-sm">{f.value}</div>
                  </div>
                ))}
              </div>
              <div
                className="p-4 rounded-lg"
                style={{ background: "#080810", border: "1px solid var(--border)", fontFamily: "var(--font-mono)", fontSize: "0.78rem" }}
              >
                <div className="flex items-center gap-2 mb-3">
                  <span style={{ color: "var(--muted)" }}>$</span>
                  <span className="text-ca-text">git clone github.com/clearagent/clearagent</span>
                </div>
                <div className="flex items-center gap-2 mb-3">
                  <span style={{ color: "var(--muted)" }}>$</span>
                  <span className="text-ca-text">cd clearagent && docker compose up -d</span>
                </div>
                <div className="flex items-center gap-2">
                  <span style={{ color: "var(--muted)" }}>$</span>
                  <span style={{ color: "var(--accent-2)" }}>✓ Ready on http://localhost:3000</span>
                  <span className="cursor-blink ml-1" style={{ color: "var(--accent-2)" }}>▊</span>
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
# → { "jobId": "job_abc123", "message": "Verification queued" }

# Poll for result
curl https://api.clearagent.dev/v1/jobs/job_abc123 \\
  -H "Authorization: Bearer $CLEARAGENT_API_KEY"
# → { "status": "completed", "eventId": "evt_abc123" }

# Audit integrity check
curl https://api.clearagent.dev/v1/audit/integrity \\
  -H "Authorization: Bearer $CLEARAGENT_API_KEY"
# → { "status": "intact", "totalEvents": 247, "merkleRoot": "..." }`,
};

type TabKey = keyof typeof CODE_TABS;

function DeveloperSection() {
  const [ref, visible] = useInView(0.1);
  const [activeTab, setActiveTab] = useState<TabKey>("TypeScript");
  const [copied, setCopied] = useState(false);

  const copy = useCallback(() => {
    navigator.clipboard.writeText(CODE_TABS[activeTab]).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [activeTab]);

  const tokenize = (code: string): React.ReactNode[] => {
    return code.split("\n").map((line, i) => (
      <div key={i} className="flex">
        <span
          className="select-none w-8 flex-shrink-0 text-right pr-3"
          style={{ color: "var(--muted)", opacity: 0.4, fontFamily: "var(--font-mono)", fontSize: "inherit" }}
        >
          {i + 1}
        </span>
        <span style={{ fontFamily: "var(--font-mono)" }}>{line || " "}</span>
      </div>
    ));
  };

  return (
    <section id="developer" className="py-24 bg-ca-bg" ref={ref}>
      <div className="max-w-6xl mx-auto px-6">
        <div className={`fade-up text-center mb-16 ${visible ? "visible" : ""}`}>
          <p
            className="text-ca-muted mb-3"
            style={{ fontFamily: "var(--font-mono)", fontSize: "0.75rem", letterSpacing: "0.1em", textTransform: "uppercase" }}
          >
            Developer API
          </p>
          <h2
            className="font-serif text-ca-text mb-4"
            style={{ fontSize: "clamp(2rem, 4vw, 2.75rem)" }}
          >
            Integrate in minutes.
            <br />
            <span className="gradient-text">Audit for years.</span>
          </h2>
          <p className="text-ca-muted max-w-xl mx-auto">
            A single REST API. TypeScript, Python, and cURL SDKs. Self-hostable with Docker in one command.
          </p>
        </div>

        <div className={`fade-up delay-2 ${visible ? "visible" : ""}`}>
          <div className="terminal">
            <div className="terminal-bar justify-between">
              <div className="flex items-center gap-2">
                <div className="terminal-dot" style={{ background: "#ef4444" }} />
                <div className="terminal-dot" style={{ background: "#f59e0b" }} />
                <div className="terminal-dot" style={{ background: "#22c55e" }} />
              </div>

              <div className="flex items-center gap-1">
                {(Object.keys(CODE_TABS) as TabKey[]).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className="px-3 py-1 rounded text-xs transition-colors"
                    style={{
                      fontFamily: "var(--font-mono)",
                      background: activeTab === tab ? "rgba(99,102,241,0.2)" : "transparent",
                      color: activeTab === tab ? "#a5b4fc" : "var(--muted)",
                      border: activeTab === tab ? "1px solid rgba(99,102,241,0.3)" : "1px solid transparent",
                    }}
                  >
                    {tab}
                  </button>
                ))}
              </div>

              <button
                onClick={copy}
                className="flex items-center gap-1.5 text-ca-muted hover:text-ca-text transition-colors"
                style={{ fontFamily: "var(--font-mono)", fontSize: "0.7rem" }}
                title="Copy to clipboard"
              >
                {copied ? (
                  <>
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                      <path d="M2 6L4.5 8.5L10 3" stroke="var(--accent-2)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    <span style={{ color: "var(--accent-2)" }}>copied</span>
                  </>
                ) : (
                  <>
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                      <rect x="1" y="3" width="7" height="8" rx="1" stroke="currentColor" strokeWidth="1"/>
                      <path d="M3 3V2a1 1 0 011-1h5a1 1 0 011 1v7a1 1 0 01-1 1H8" stroke="currentColor" strokeWidth="1" strokeLinecap="round"/>
                    </svg>
                    <span>copy</span>
                  </>
                )}
              </button>
            </div>

            <div
              className="p-5 overflow-x-auto text-ca-text"
              style={{ fontSize: "0.78rem", lineHeight: "1.7", maxHeight: "440px", overflowY: "auto" }}
            >
              {tokenize(CODE_TABS[activeTab])}
            </div>
          </div>
        </div>

        {/* Endpoint list */}
        <div className={`fade-up delay-3 mt-8 grid sm:grid-cols-2 md:grid-cols-3 gap-3 ${visible ? "visible" : ""}`}>
          {[
            { method: "POST", path: "/v1/events/verify", desc: "Submit for verification" },
            { method: "GET", path: "/v1/jobs/:jobId", desc: "Poll async job status" },
            { method: "POST", path: "/v1/reviews", desc: "Submit human review" },
            { method: "PATCH", path: "/v1/agents/:id/status", desc: "Suspend or reactivate agent" },
            { method: "GET", path: "/v1/audit/integrity", desc: "Verify hash chain" },
            { method: "GET", path: "/v1/audit/export", desc: "Export compliance package" },
          ].map((ep) => (
            <div
              key={ep.path}
              className="p-3 rounded-lg"
              style={{ background: "var(--surface)", border: "1px solid var(--border)", fontFamily: "var(--font-mono)" }}
            >
              <div className="flex items-center gap-2 mb-1">
                <span
                  className="text-xs px-1.5 py-0.5 rounded font-bold"
                  style={{
                    background: ep.method === "GET" ? "rgba(0,212,170,0.12)" : ep.method === "POST" ? "rgba(99,102,241,0.15)" : "rgba(255,107,53,0.12)",
                    color: ep.method === "GET" ? "var(--accent-2)" : ep.method === "POST" ? "#a5b4fc" : "var(--accent)",
                    fontSize: "0.6rem",
                    letterSpacing: "0.06em",
                  }}
                >
                  {ep.method}
                </span>
                <span className="text-ca-text" style={{ fontSize: "0.7rem" }}>{ep.path}</span>
              </div>
              <p className="text-ca-muted" style={{ fontSize: "0.7rem" }}>{ep.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ── CTA Footer ─────────────────────────────────────────────── */

function CTAFooter() {
  const [ref, visible] = useInView(0.2);

  const year = new Date().getFullYear();

  return (
    <footer ref={ref} style={{ background: "var(--surface)", borderTop: "1px solid var(--border)" }}>
      {/* CTA band */}
      <div className="py-24">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <div className={`fade-up ${visible ? "visible" : ""}`}>
            <h2
              className="font-serif text-ca-text mb-5"
              style={{ fontSize: "clamp(2rem, 4vw, 3rem)" }}
            >
              Start building
              <br />
              <span className="gradient-text">before the deadline.</span>
            </h2>
            <p className="text-ca-muted mb-10 text-base max-w-lg mx-auto leading-relaxed">
              Free forever for open source. Self-hostable. No usage limits on the API. The compliance clock is running.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <a href="#developer" className="btn-primary glow-pulse text-sm px-8 py-3">
                Get API Key — Free
              </a>
              <a href="https://github.com/clearagent" className="btn-outline text-sm px-8 py-3 inline-flex items-center gap-2">
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
      <div
        className="border-t border-ca-border py-8"
        style={{ borderColor: "var(--border)" }}
      >
        <div className="max-w-6xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded bg-ca-accent flex items-center justify-center">
              <svg width="10" height="10" viewBox="0 0 14 14" fill="none">
                <path d="M2 7L5.5 10.5L12 3.5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <span className="text-ca-muted" style={{ fontSize: "0.8rem" }}>
              ClearAgent — © {year} — MIT License
            </span>
          </div>
          <div className="flex items-center gap-6">
            {["Compliance", "How It Works", "Developer", "GitHub"].map((l) => (
              <a
                key={l}
                href={l === "GitHub" ? "https://github.com/clearagent" : `#${l.toLowerCase().replace(" ", "-")}`}
                className="text-ca-muted hover:text-ca-text transition-colors"
                style={{ fontSize: "0.8rem" }}
              >
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
  // Fade-up observer (re-scan on every route render)
  useEffect(() => {
    const els = document.querySelectorAll(".fade-up");
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            (e.target as HTMLElement).classList.add("visible");
            obs.unobserve(e.target);
          }
        });
      },
      { threshold: 0.15 }
    );
    els.forEach((el) => obs.observe(el));
    return () => obs.disconnect();
  }, []);

  return (
    <div className="min-h-screen" style={{ background: "var(--bg)" }}>
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
