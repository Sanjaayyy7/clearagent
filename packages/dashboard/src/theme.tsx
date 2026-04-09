import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";

export const FS = { fontFamily: "var(--font-sans)" } as const;
export const HEADING = {
  ...FS,
  fontWeight: 800,
  lineHeight: 0.92,
  letterSpacing: "-0.04em",
} as const;
export const HERO_H = {
  ...FS,
  fontWeight: 800,
  lineHeight: 0.88,
  letterSpacing: "-0.05em",
} as const;
export const BODY = {
  ...FS,
  fontWeight: 400,
  fontSize: 17,
  lineHeight: 1.65,
  letterSpacing: "-0.01em",
  color: "#555555",
} as const;

export const contentWidth = ({
  maxWidth = 1320,
  pad = "0 48px",
}: {
  maxWidth?: number;
  pad?: string;
} = {}): CSSProperties => ({
  maxWidth,
  margin: "0 auto",
  padding: pad,
  width: "100%",
});

export function CustomCursor() {
  const ref = useRef<HTMLDivElement>(null);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    const move = (event: MouseEvent) => {
      if (ref.current) {
        ref.current.style.transform = `translate(calc(${event.clientX}px - 50%), calc(${event.clientY}px - 50%))`;
      }
    };
    const over = (event: MouseEvent) => {
      setExpanded(Boolean((event.target as HTMLElement).closest("a,button,[data-hover]")));
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

export function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <div className="section-label">
      <span style={{ color: "#444444" }}>—</span>
      <span>{children}</span>
    </div>
  );
}

export function SectionHeading({
  line1,
  line2,
  size = "clamp(40px,5.5vw,60px)",
  mb = 36,
}: {
  line1: string;
  line2: string;
  size?: string;
  mb?: number;
}) {
  return (
    <div style={{ marginBottom: mb }}>
      <div style={{ ...HEADING, fontSize: size, color: "#0a0a0a", display: "block" }}>{line1}</div>
      <div style={{ ...HEADING, fontSize: size, color: "#aaaaaa", display: "block" }}>{line2}</div>
    </div>
  );
}

function DashboardNavLink({ to, label }: { to: string; label: string }) {
  const location = useLocation();
  const active = to === "/" ? location.pathname === "/" : location.pathname.startsWith(to);

  return (
    <NavLink
      to={to}
      style={{
        ...FS,
        fontSize: 15,
        fontWeight: 400,
        letterSpacing: "-0.01em",
        color: active ? "#000000" : "#555555",
        textDecoration: "none",
        transition: "color 0.15s",
      }}
    >
      {label}
    </NavLink>
  );
}

export function DashboardNav() {
  const [floating, setFloating] = useState(false);
  const [open, setOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const onScroll = () => setFloating(window.scrollY > 80);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);

  const links = useMemo(
    () => [
      { to: "/", label: "Live Feed" },
      { to: "/integrity", label: "Integrity" },
      { to: "/agents", label: "Agents" },
      { to: "/escalated", label: "Escalated" },
    ],
    []
  );

  return (
    <nav className={`nav-base${floating ? " nav-floating" : ""}`}>
      <div style={{ ...contentWidth(), height: 60, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <Link to="/" style={{ display: "flex", alignItems: "center", gap: 9, textDecoration: "none" }}>
          <div
            className="logo-mark"
            style={{
              width: 28,
              height: 28,
              borderRadius: 7,
              background: "#000000",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
              transition: "background 0.3s",
            }}
          >
            <svg width="12" height="12" viewBox="0 0 14 14" fill="none">
              <path
                d="M2 7L5.5 10.5L12 3.5"
                stroke="#ffffff"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <span
            style={{
              ...FS,
              fontWeight: 700,
              fontSize: 17,
              color: "#000000",
              letterSpacing: "-0.02em",
            }}
          >
            ClearAgent
          </span>
        </Link>

        <div className="hidden md:flex" style={{ gap: 32, alignItems: "center" }}>
          {links.map((link) => (
            <DashboardNavLink key={link.to} to={link.to} label={link.label} />
          ))}
        </div>

        <div className="hidden md:flex" style={{ gap: 10, alignItems: "center" }}>
          <a
            href="https://github.com/Sanjaayyy7/clearagent"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "9px 18px",
              borderRadius: 9999,
              border: "1px solid rgba(0,0,0,0.18)",
              color: "#333333",
              fontSize: 14,
              fontFamily: "var(--font-sans)",
              textDecoration: "none",
            }}
          >
            <svg width="13" height="13" viewBox="0 0 16 16" fill="currentColor">
              <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
            </svg>
            GitHub
          </a>
          <a href="http://localhost:3001" className="btn-black btn-sm">
            View Landing
          </a>
        </div>

        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          style={{
            background: "none",
            border: "none",
            color: "#555555",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
          }}
          className="md:hidden"
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            {open ? (
              <path d="M4 4L16 16M16 4L4 16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            ) : (
              <path d="M3 6h14M3 10h14M3 14h14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            )}
          </svg>
        </button>
      </div>

      {open && (
        <div
          style={{
            borderTop: "1px solid rgba(0,0,0,0.08)",
            background: "rgba(255,255,255,0.96)",
            padding: "16px 48px 20px",
            display: "flex",
            flexDirection: "column",
            gap: 14,
          }}
        >
          {links.map((link) => (
            <DashboardNavLink key={link.to} to={link.to} label={link.label} />
          ))}
          <div style={{ display: "flex", gap: 10, paddingTop: 4 }}>
            <a
              href="https://github.com/Sanjaayyy7/clearagent"
              style={{
                flex: 1,
                justifyContent: "center",
                display: "inline-flex",
                alignItems: "center",
                padding: "9px 18px",
                borderRadius: 9999,
                border: "1px solid rgba(0,0,0,0.18)",
                color: "#333333",
                fontSize: 14,
                fontFamily: "var(--font-sans)",
                textDecoration: "none",
              }}
            >
              GitHub
            </a>
            <a href="http://localhost:3001" className="btn-black btn-sm" style={{ flex: 1, justifyContent: "center" }}>
              View Landing
            </a>
          </div>
        </div>
      )}
    </nav>
  );
}

export function PageShell({ children }: { children: ReactNode }) {
  return <div className="dashboard-shell">{children}</div>;
}

export function LoadingState({ label }: { label: string }) {
  return (
    <div className="dashboard-page">
      <div style={contentWidth()}>
        <div className="dashboard-empty-state">{label}</div>
      </div>
    </div>
  );
}

export function ErrorState({ label, action }: { label: string; action?: ReactNode }) {
  return (
    <div className="dashboard-page">
      <div style={contentWidth()}>
        <div className="dashboard-empty-state dashboard-empty-state-error">
          <p>{label}</p>
          {action}
        </div>
      </div>
    </div>
  );
}
