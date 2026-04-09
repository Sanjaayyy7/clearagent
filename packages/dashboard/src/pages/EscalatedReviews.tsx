import { useEffect, useState } from "react";
import { listEvents, type VerificationEvent } from "../lib/api.ts";
import { BODY, HEADING, SectionHeading, SectionLabel, contentWidth, ErrorState, LoadingState } from "../theme.tsx";
import { Link } from "react-router-dom";

const SLA_HOURS = 1;

function msAgo(dateStr: string): number {
  return Date.now() - new Date(dateStr).getTime();
}

function formatAge(dateStr: string): string {
  const ms = msAgo(dateStr);
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  if (h > 0) return `${h}h ${m}m ago`;
  return `${m}m ago`;
}

export default function EscalatedReviews() {
  const [events, setEvents] = useState<VerificationEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Fetch all events and filter client-side for requiresReview
    // In production this would be a dedicated /v1/events?requires_review=true endpoint
    listEvents({ limit: 100 })
      .then((res) => {
        const pending = res.data.filter((e) => e.requiresReview);
        setEvents(pending);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load events"))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingState label="Loading escalated reviews…" />;
  if (error) return <ErrorState label={error} />;

  const overdue = events.filter((e) => msAgo(e.occurredAt) > SLA_HOURS * 3600 * 1000);
  const pending = events.filter((e) => msAgo(e.occurredAt) <= SLA_HOURS * 3600 * 1000);

  return (
    <section className="dashboard-page">
      <div style={contentWidth()}>
        <div className="dashboard-page-intro">
          <SectionLabel>Art. 14 — Human Oversight</SectionLabel>
          <SectionHeading line1="Escalated" line2="reviews" />
          <p style={{ ...BODY, maxWidth: 640 }}>
            Events requiring human review. Decisions with confidence below the oversight threshold or flagged
            decisions must be reviewed within {SLA_HOURS}h to maintain EU AI Act compliance.
          </p>
        </div>

        <div className="dashboard-grid dashboard-grid-three" style={{ marginBottom: 40 }}>
          <div className="dashboard-card dashboard-metric-card">
            <p className="dashboard-card-label">Requiring Review</p>
            <p className="dashboard-metric-value">{events.length}</p>
            <p className="dashboard-card-copy">Total events pending oversight</p>
          </div>
          <div className="dashboard-card dashboard-metric-card">
            <p className="dashboard-card-label">Overdue (&gt;{SLA_HOURS}h)</p>
            <p className="dashboard-metric-value" style={{ color: overdue.length > 0 ? "var(--ca-danger, #dc2626)" : undefined }}>
              {overdue.length}
            </p>
            <p className="dashboard-card-copy">Past the {SLA_HOURS}-hour SLA</p>
          </div>
          <div className="dashboard-card dashboard-metric-card">
            <p className="dashboard-card-label">Within SLA</p>
            <p className="dashboard-metric-value" style={{ color: "var(--ca-success, #16a34a)" }}>
              {pending.length}
            </p>
            <p className="dashboard-card-copy">Still within the review window</p>
          </div>
        </div>

        {overdue.length > 0 && (
          <div style={{ marginBottom: 32 }}>
            <div style={{ ...HEADING, fontSize: "clamp(20px, 2.4vw, 28px)", marginBottom: 16 }}>
              Overdue — immediate action required
            </div>
            <EventTable events={overdue} overdue />
          </div>
        )}

        {pending.length > 0 && (
          <div>
            <div style={{ ...HEADING, fontSize: "clamp(20px, 2.4vw, 28px)", marginBottom: 16 }}>
              Pending — within SLA
            </div>
            <EventTable events={pending} overdue={false} />
          </div>
        )}

        {events.length === 0 && (
          <div className="dashboard-card" style={{ textAlign: "center", padding: 48 }}>
            <p style={{ ...HEADING, fontSize: 24, marginBottom: 12 }}>No reviews pending</p>
            <p style={{ ...BODY, color: "#666" }}>
              All flagged decisions have been reviewed. Art. 14 compliance is current.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}

function EventTable({ events, overdue }: { events: VerificationEvent[]; overdue: boolean }) {
  return (
    <div className="dashboard-card" style={{ padding: 0, overflow: "hidden" }}>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ borderBottom: "1px solid #e5e5e5" }}>
            {["Event ID", "Decision", "Confidence", "Age", "Status", ""].map((h) => (
              <th key={h} className="dashboard-table-header">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {events.map((event) => (
            <tr key={event.id} className="dashboard-table-row">
              <td className="dashboard-primary-cell">
                <code style={{ fontSize: 12 }}>{event.id.slice(0, 8)}…</code>
              </td>
              <td>
                <span className={`dashboard-badge dashboard-badge-${event.decision === "flagged" ? "warning" : "danger"}`}>
                  {event.decision}
                </span>
              </td>
              <td className="dashboard-secondary-cell">
                {event.confidence ? parseFloat(event.confidence).toFixed(3) : "—"}
              </td>
              <td className="dashboard-secondary-cell" style={{ color: overdue ? "#dc2626" : undefined, fontWeight: overdue ? 600 : undefined }}>
                {formatAge(event.occurredAt)}
              </td>
              <td>
                <span className={`dashboard-badge ${overdue ? "dashboard-badge-danger" : "dashboard-badge-warning"}`}>
                  {overdue ? "OVERDUE" : "PENDING"}
                </span>
              </td>
              <td style={{ textAlign: "right", padding: "0 20px" }}>
                <Link
                  to={`/events/${event.id}`}
                  className="dashboard-link"
                  style={{ fontSize: 13, fontWeight: 600 }}
                >
                  Review →
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
