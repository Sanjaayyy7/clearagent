import { useEffect, useState } from "react";
import { getAuditExport, getAuditIntegrity, type AuditIntegrity } from "../lib/api.ts";
import { BODY, HEADING, SectionHeading, SectionLabel, contentWidth, ErrorState, LoadingState } from "../theme.tsx";

function integrityTone(valid: boolean) {
  return valid ? "dashboard-badge dashboard-badge-success" : "dashboard-badge dashboard-badge-danger";
}

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
      const result = await getAuditExport({
        authorityName: "ClearAgent Dashboard",
        authorityRef: `EXPORT-${Date.now()}`,
      });
      const blob = new Blob([JSON.stringify(result, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `clearagent-audit-${new Date().toISOString().slice(0, 10)}.json`;
      anchor.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Export failed");
    } finally {
      setExporting(false);
    }
  }

  if (loading) {
    return <LoadingState label="Loading audit-chain integrity evidence..." />;
  }

  if (error || !data) {
    return <ErrorState label={error || "Failed to load integrity data"} />;
  }

  const complianceItems = [
    {
      label: "Art. 12 — Automatic logging",
      status: true,
      detail: "Append-only PostgreSQL ledger plus SHA-256 content hashing and previous-hash linkage.",
    },
    {
      label: "Art. 12 — Tamper evidence",
      status: data.validChain,
      detail: data.validChain ? "Hash chain intact and Merkle root available." : `Chain broken at ${data.brokenAt}`,
    },
    {
      label: "Art. 14 — Human oversight",
      status: true,
      detail: "Human review workflow requires justification and permanent review records.",
    },
    {
      label: "Art. 19 — Record keeping",
      status: true,
      detail: "Regulator-ready JSON export with deterministic export hash.",
    },
    {
      label: "Art. 19 — Retention enforcement",
      status: false,
      detail: "Retention timestamps exist; automated purge enforcement is still pending.",
    },
  ];

  return (
    <>
      <section className="dashboard-page">
        <div style={contentWidth()}>
          <div className="dashboard-page-intro">
            <SectionLabel>Integrity</SectionLabel>
            <SectionHeading line1="Audit chain" line2="evidence, intact" />
            <p style={{ ...BODY, maxWidth: 640 }}>
              Real-time proof that the verification ledger remains append-only, tamper-evident, and exportable for
              EU AI Act record-keeping obligations.
            </p>
          </div>

          <div className="dashboard-grid dashboard-grid-three">
            <div className="dashboard-card dashboard-metric-card">
              <p className="dashboard-card-label">Chain Status</p>
              <div style={{ marginTop: 12 }}>
                <span className={integrityTone(data.validChain)}>{data.validChain ? "Intact" : "Broken"}</span>
              </div>
            </div>
            <div className="dashboard-card dashboard-metric-card">
              <p className="dashboard-card-label">Total Events</p>
              <p className="dashboard-metric-value">{data.totalEvents}</p>
              <p className="dashboard-card-copy">Recorded in the immutable audit trail</p>
            </div>
            <div className="dashboard-card dashboard-metric-card">
              <p className="dashboard-card-label">Merkle Root</p>
              <code className="dashboard-hash" style={{ display: "block", marginTop: 12 }}>
                {data.merkleRoot ? `${data.merkleRoot.slice(0, 22)}...` : "—"}
              </code>
              <p className="dashboard-card-copy">Last checked {new Date(data.checkedAt).toLocaleString()}</p>
            </div>
          </div>

          <div className="dashboard-grid dashboard-grid-two dashboard-detail-grid">
            <div className="dashboard-card">
              <SectionLabel>Compliance status</SectionLabel>
              <div style={{ ...HEADING, fontSize: "clamp(28px, 3.6vw, 40px)", marginBottom: 20 }}>Operational checklist.</div>
              <div className="dashboard-compliance-list">
                {complianceItems.map((item) => (
                  <div key={item.label} className="dashboard-compliance-item">
                    <span className={item.status ? "dashboard-compliance-dot ok" : "dashboard-compliance-dot warn"} />
                    <div>
                      <p className="dashboard-primary-cell">{item.label}</p>
                      <p className="dashboard-card-copy">{item.detail}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="dashboard-card">
              <SectionLabel>Evidence export</SectionLabel>
              <div style={{ ...HEADING, fontSize: "clamp(28px, 3.6vw, 40px)", marginBottom: 18 }}>Regulator-ready output.</div>
              <p style={{ ...BODY, fontSize: 15, maxWidth: 520, marginBottom: 24 }}>
                Generate a signed JSON package of verification events and reviews with the same clean interface language
                as the landing page, while preserving the audit-ledger evidence operators need.
              </p>
              {data.merkleRoot ? (
                <div className="dashboard-code-block" style={{ marginBottom: 24 }}>
                  <p className="dashboard-card-label">Full Merkle Root</p>
                  <code className="dashboard-hash dashboard-hash-full">{data.merkleRoot}</code>
                </div>
              ) : null}
              <div className="dashboard-actions">
                <button type="button" onClick={handleExport} disabled={exporting} className="btn-black">
                  {exporting ? "Exporting..." : "Export JSON"}
                </button>
                <button type="button" disabled className="btn-outline dashboard-disabled-button" title="Coming soon">
                  Export XML
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
