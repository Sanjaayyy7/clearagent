import { useEffect, useState } from "react";
import { getAuditIntegrity, getAuditExport, type AuditIntegrity } from "../lib/api.ts";

export default function IntegrityReport() {
  const [data, setData] = useState<AuditIntegrity | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    getAuditIntegrity()
      .then(setData)
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load integrity data"))
      .finally(() => setLoading(false));
  }, []);

  async function handleExport() {
    setExporting(true);
    try {
      const result = await getAuditExport({ authorityName: "ClearAgent Dashboard", authorityRef: `EXPORT-${Date.now()}` });
      const blob = new Blob([JSON.stringify(result, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `clearagent-audit-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Export failed");
    } finally {
      setExporting(false);
    }
  }

  if (loading) {
    return <div className="flex items-center justify-center h-full text-brand-muted">Loading integrity data...</div>;
  }

  if (error || !data) {
    return <div className="text-center mt-20 text-red-400">{error || "Failed to load"}</div>;
  }

  const complianceItems = [
    { label: "Art. 12 — Automatic logging", status: true, detail: "Append-only PostgreSQL + SHA-256 hash chain" },
    { label: "Art. 12 — Tamper evidence", status: data.validChain, detail: data.validChain ? "Hash chain intact" : `Chain broken at ${data.brokenAt}` },
    { label: "Art. 14 — Human oversight", status: true, detail: "Review workflow with mandatory justification" },
    { label: "Art. 19 — Record keeping", status: true, detail: "JSON export with SHA-256 file hash" },
    { label: "Art. 19 — Retention enforcement", status: false, detail: "retention_expires_at set — auto-purge not yet implemented" },
  ];

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h2 className="text-xl font-bold">Integrity Report</h2>
        <p className="text-sm text-brand-muted mt-0.5">
          Last checked: {new Date(data.checkedAt).toLocaleString()}
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-brand-surface border border-brand-border rounded-xl p-4">
          <p className="text-xs text-brand-muted uppercase tracking-wide">Chain Status</p>
          <div className="mt-1">
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${
              data.validChain
                ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
                : "bg-red-500/15 text-red-400 border-red-500/30"
            }`}>
              {data.validChain ? "Intact" : "BROKEN"}
            </span>
          </div>
        </div>
        <div className="bg-brand-surface border border-brand-border rounded-xl p-4">
          <p className="text-xs text-brand-muted uppercase tracking-wide">Total Events</p>
          <p className="text-2xl font-bold mt-1">{data.totalEvents}</p>
        </div>
        <div className="bg-brand-surface border border-brand-border rounded-xl p-4">
          <p className="text-xs text-brand-muted uppercase tracking-wide">Merkle Root</p>
          <code className="text-xs font-mono text-brand-text mt-1 block break-all">
            {data.merkleRoot ? data.merkleRoot.slice(0, 20) + "..." : "—"}
          </code>
        </div>
      </div>

      {/* Full Merkle root */}
      {data.merkleRoot && (
        <div className="bg-brand-surface border border-brand-border rounded-xl p-4">
          <p className="text-xs text-brand-muted uppercase tracking-wide mb-2">Full Merkle Root</p>
          <code className="text-xs font-mono text-emerald-400 break-all">{data.merkleRoot}</code>
        </div>
      )}

      {/* Compliance status */}
      <div className="bg-brand-surface border border-brand-border rounded-xl p-4">
        <p className="text-xs text-brand-muted uppercase tracking-wide mb-3">EU AI Act Compliance Status</p>
        <div className="space-y-2">
          {complianceItems.map((item) => (
            <div key={item.label} className="flex items-start gap-3 py-2 border-b border-brand-border/50 last:border-0">
              <span className={`mt-0.5 text-sm ${item.status ? "text-emerald-400" : "text-amber-400"}`}>
                {item.status ? "✓" : "⚠"}
              </span>
              <div>
                <p className="text-sm text-brand-text">{item.label}</p>
                <p className="text-xs text-brand-muted">{item.detail}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Export buttons */}
      <div className="flex gap-3">
        <button
          onClick={handleExport}
          disabled={exporting}
          className="bg-brand-accent text-white rounded-lg px-4 py-2.5 text-sm font-medium hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-opacity"
        >
          {exporting ? "Exporting..." : "Export JSON (Art. 19)"}
        </button>
        <button
          disabled
          className="bg-brand-surface border border-brand-border text-brand-muted rounded-lg px-4 py-2.5 text-sm font-medium cursor-not-allowed"
          title="Coming soon"
        >
          Export XML (Coming Soon)
        </button>
      </div>
    </div>
  );
}
