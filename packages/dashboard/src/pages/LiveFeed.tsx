import { useEffect, useState } from "react";
import { listEvents, subscribeToEventStream, type VerificationEvent, type EventsResponse } from "../lib/api.ts";

function StatusBadge({ status, decision }: { status: string; decision: string }) {
  const colors: Record<string, string> = {
    verified: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
    approved: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
    flagged: "bg-amber-500/15 text-amber-400 border-amber-500/30",
    failed: "bg-red-500/15 text-red-400 border-red-500/30",
    rejected: "bg-red-500/15 text-red-400 border-red-500/30",
    pending: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  };
  const label = status === "verified" ? "Approved" : status.charAt(0).toUpperCase() + status.slice(1);
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${colors[decision] || colors[status] || "bg-gray-500/15 text-gray-400"}`}>
      {label}
    </span>
  );
}

function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="bg-brand-surface border border-brand-border rounded-xl p-4">
      <p className="text-xs text-brand-muted uppercase tracking-wide">{label}</p>
      <p className="text-2xl font-bold mt-1">{value}</p>
      {sub && <p className="text-xs text-brand-muted mt-1">{sub}</p>}
    </div>
  );
}

export default function LiveFeed() {
  const [events, setEvents] = useState<VerificationEvent[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Initial load
    listEvents({ limit: 50 })
      .then((res: EventsResponse) => {
        setEvents(res.data);
        setTotal(res.pagination.total);
      })
      .catch((err) => console.error("Failed to fetch events:", err))
      .finally(() => setLoading(false));

    // Live updates via SSE (replaces 3s polling)
    const cleanup = subscribeToEventStream((newEvent) => {
      setEvents((prev) => {
        // Prepend new event, keep most recent 50
        const updated = [newEvent as VerificationEvent, ...prev].slice(0, 50);
        return updated;
      });
      setTotal((prev) => prev + 1);
    });

    return cleanup;
  }, []);

  const approved = events.filter((e) => e.decision === "approved").length;
  const flagged = events.filter((e) => e.decision === "flagged").length;
  const pendingReview = events.filter((e) => e.requiresReview).length;
  const passRate = events.length > 0 ? Math.round((approved / events.length) * 100) : 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full text-brand-muted">
        Loading verification events...
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold">Live Verification Feed</h2>
          <p className="text-sm text-brand-muted mt-0.5">Real-time AI agent transaction verification</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 bg-brand-teal rounded-full animate-pulse" />
          <span className="text-xs text-brand-muted">Live via SSE</span>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4 mb-6">
        <StatCard label="Total Events" value={total} />
        <StatCard label="Pass Rate" value={`${passRate}%`} sub={`${approved} approved`} />
        <StatCard label="Pending Review" value={pendingReview} sub="Requires human oversight" />
        <StatCard label="Flagged" value={flagged} sub="Art. 14 escalation" />
      </div>

      <div className="bg-brand-surface border border-brand-border rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-brand-border text-brand-muted text-xs uppercase tracking-wide">
              <th className="text-left p-3 pl-4">Status</th>
              <th className="text-left p-3">Transaction</th>
              <th className="text-left p-3">Confidence</th>
              <th className="text-left p-3">Hash</th>
              <th className="text-left p-3">Review</th>
              <th className="text-left p-3 pr-4">Time</th>
            </tr>
          </thead>
          <tbody>
            {events.map((event) => (
              <tr key={event.id} className="border-b border-brand-border/50 hover:bg-brand-border/20 transition-colors">
                <td className="p-3 pl-4">
                  <StatusBadge status={event.status} decision={event.decision} />
                </td>
                <td className="p-3">
                  <div className="font-medium text-brand-text">
                    {(event.inputPayload as { recipient?: string })?.recipient || "Unknown"}
                  </div>
                  <div className="text-xs text-brand-muted">
                    {(event.inputPayload as { currency?: string })?.currency}{" "}
                    {(event.inputPayload as { amount?: number })?.amount?.toLocaleString()}
                  </div>
                </td>
                <td className="p-3">
                  <span className={`font-mono text-sm ${
                    Number(event.confidence) >= 0.85
                      ? "text-emerald-400"
                      : Number(event.confidence) >= 0.5
                        ? "text-amber-400"
                        : "text-red-400"
                  }`}>
                    {event.confidence ? Number(event.confidence).toFixed(2) : "—"}
                  </span>
                </td>
                <td className="p-3">
                  <code className="text-xs text-brand-muted font-mono">
                    {event.contentHash.slice(0, 12)}...
                  </code>
                </td>
                <td className="p-3">
                  {event.requiresReview ? (
                    <span className="text-amber-400 text-xs font-medium">Needs Review</span>
                  ) : (
                    <span className="text-brand-muted text-xs">—</span>
                  )}
                </td>
                <td className="p-3 pr-4 text-xs text-brand-muted">
                  {new Date(event.occurredAt).toLocaleDateString()}{" "}
                  {new Date(event.occurredAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
