import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { listEvents, subscribeToEventStream, type EventsResponse, type VerificationEvent } from "../lib/api.ts";
import { BODY, HERO_H, SectionHeading, SectionLabel, contentWidth, LoadingState } from "../theme.tsx";
import { SplineScene } from "../SplineScene.tsx";

function statusTone(status: string, decision: string) {
  const value = decision || status;
  if (value === "approved" || value === "verified") return "dashboard-badge dashboard-badge-success";
  if (value === "flagged") return "dashboard-badge dashboard-badge-warning";
  if (value === "rejected" || value === "failed") return "dashboard-badge dashboard-badge-danger";
  return "dashboard-badge dashboard-badge-neutral";
}

function StatusBadge({ status, decision }: { status: string; decision: string }) {
  const label = status === "verified" ? "Approved" : status.charAt(0).toUpperCase() + status.slice(1);
  return <span className={statusTone(status, decision)}>{label}</span>;
}

function MetricCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="dashboard-card dashboard-metric-card">
      <p className="dashboard-card-label">{label}</p>
      <p className="dashboard-metric-value">{value}</p>
      {sub ? <p className="dashboard-card-copy">{sub}</p> : null}
    </div>
  );
}

export default function LiveFeed() {
  const navigate = useNavigate();
  const [events, setEvents] = useState<VerificationEvent[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listEvents({ limit: 50 })
      .then((res: EventsResponse) => {
        setEvents(res.data);
        setTotal(res.pagination.total);
      })
      .catch((err) => console.error("Failed to fetch events:", err))
      .finally(() => setLoading(false));

    const cleanup = subscribeToEventStream((newEvent) => {
      setEvents((prev) => [newEvent as VerificationEvent, ...prev].slice(0, 50));
      setTotal((prev) => prev + 1);
    });

    return cleanup;
  }, []);

  if (loading) {
    return <LoadingState label="Loading the live verification dashboard..." />;
  }

  const approved = events.filter((event) => event.decision === "approved").length;
  const flagged = events.filter((event) => event.decision === "flagged").length;
  const pendingReview = events.filter((event) => event.requiresReview).length;
  const passRate = events.length > 0 ? Math.round((approved / events.length) * 100) : 0;

  return (
    <>
      <section
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          paddingTop: 80,
          background: "#ffffff",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "absolute",
            right: 0,
            top: 0,
            width: "50%",
            height: "100%",
            overflow: "hidden",
            zIndex: 0,
            pointerEvents: "none",
            background: "#ffffff",
          }}
        >
          <SplineScene
            scene="https://prod.spline.design/lYYHbwSeuAZemnWu/scene.splinecode"
            style={{
              width: "100%",
              height: "100%",
              display: "block",
              transform: "translate(-25%, -6%) scale(3.45)",
              transformOrigin: "50% 50%",
              filter:
                "grayscale(1) contrast(1.24) brightness(1.08) saturate(0) drop-shadow(0 18px 28px rgba(255,255,255,0.18)) drop-shadow(0 10px 20px rgba(0,0,0,0.08))",
            }}
          />
        </div>
        <div style={{ ...contentWidth(), position: "relative", zIndex: 20 }}>
          <div style={{ maxWidth: "50%", width: "100%" }}>
            <SectionLabel>Dashboard</SectionLabel>
            <h1 style={{ ...HERO_H, fontSize: "clamp(56px, 7vw, 88px)", marginBottom: 28, overflow: "visible" }}>
              <span className="hero-gradient-text" style={{ display: "block" }}>
                AI verification
              </span>
              <span className="hero-gradient-text" style={{ display: "block" }}>
                dashboard.
              </span>
            </h1>
            <p style={{ ...BODY, maxWidth: 500, marginBottom: 36 }}>
              Live operator console for verification events, audit-chain health, and human oversight workflows,
              styled as the same premium ClearAgent product surface as the landing page.
            </p>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 44 }}>
              <Link to="/integrity" className="btn-black">
                View integrity <span className="arrow">→</span>
              </Link>
              <Link to="/agents" className="btn-outline">
                Manage agents
              </Link>
            </div>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 13, color: "#888888", letterSpacing: "0.02em" }}>
              {total} events verified &nbsp;&nbsp;·&nbsp;&nbsp; {passRate}% pass rate &nbsp;&nbsp;·&nbsp;&nbsp;{" "}
              {pendingReview} human reviews pending
            </div>
          </div>
        </div>
      </section>

      <section className="section">
        <div style={contentWidth()}>
          <div className="dashboard-heading-row">
            <div>
              <SectionLabel>Live feed</SectionLabel>
              <SectionHeading line1="Verification feed" line2="in real time" />
            </div>
            <div className="dashboard-live-pill">
              <span className="dashboard-live-dot" />
              <span>Live via SSE</span>
            </div>
          </div>

          <div className="dashboard-grid dashboard-grid-four">
            <MetricCard label="Total Events" value={total} sub="Immutable append-only trail" />
            <MetricCard label="Pass Rate" value={`${passRate}%`} sub={`${approved} approved`} />
            <MetricCard label="Pending Review" value={pendingReview} sub="Requires human oversight" />
            <MetricCard label="Flagged" value={flagged} sub="Article 14 escalation" />
          </div>

          <div className="dashboard-card dashboard-table-card">
            <div className="dashboard-table-wrap">
              <table className="dashboard-table">
                <thead>
                  <tr>
                    <th>Status</th>
                    <th>Transaction</th>
                    <th>Confidence</th>
                    <th>Hash</th>
                    <th>Review</th>
                    <th>Time</th>
                  </tr>
                </thead>
                <tbody>
                  {events.map((event) => (
                    <tr key={event.id} onClick={() => navigate(`/events/${event.id}`)} data-hover>
                      <td>
                        <StatusBadge status={event.status} decision={event.decision} />
                      </td>
                      <td>
                        <div className="dashboard-primary-cell">
                          {(event.inputPayload as { recipient?: string })?.recipient || "Unknown"}
                        </div>
                        <div className="dashboard-secondary-cell">
                          {(event.inputPayload as { currency?: string })?.currency}{" "}
                          {(event.inputPayload as { amount?: number })?.amount?.toLocaleString()}
                        </div>
                      </td>
                      <td>
                        <span className="dashboard-mono-value">
                          {event.confidence ? Number(event.confidence).toFixed(2) : "—"}
                        </span>
                      </td>
                      <td>
                        <code className="dashboard-hash">{event.contentHash.slice(0, 12)}...</code>
                      </td>
                      <td>
                        {event.requiresReview ? (
                          <span className="dashboard-text-warning">Needs Review</span>
                        ) : (
                          <span className="dashboard-secondary-cell">—</span>
                        )}
                      </td>
                      <td className="dashboard-secondary-cell">
                        {new Date(event.occurredAt).toLocaleDateString()}{" "}
                        {new Date(event.occurredAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </td>
                    </tr>
                  ))}
                  {events.length === 0 ? (
                    <tr>
                      <td colSpan={6}>
                        <div className="dashboard-empty-table">
                          No verification events yet. Start the API and seed data to populate the live feed.
                        </div>
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
