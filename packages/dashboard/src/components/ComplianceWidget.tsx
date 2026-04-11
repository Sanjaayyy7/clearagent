import { useEffect, useState } from "react";

interface ComplianceScore {
  score: number;
  grade: string;
  status: string;
  breakdown: {
    article12: { score: number; status: string; issues: string[] };
    article14: { score: number; status: string; issues: string[] };
    article19: { score: number; status: string; issues: string[] };
  };
  lastCalculated: string;
  daysToEnforcement: number;
}

const API_URL = (import.meta as any).env?.VITE_API_URL ?? "http://localhost:3000";

function statusColor(status: string): string {
  if (status === "compliant") return "#22c55e";
  if (status === "warning") return "#f59e0b";
  return "#ef4444";
}

function scoreColor(score: number): string {
  if (score >= 80) return "#22c55e";
  if (score >= 60) return "#f59e0b";
  return "#ef4444";
}

function ArticleBadge({ label, score, status }: { label: string; score: number; status: string }) {
  const color = statusColor(status);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "4px 10px", background: "rgba(255,255,255,0.04)", borderRadius: 6, border: `1px solid ${color}30` }}>
      <span style={{ fontSize: 11, color: "#888" }}>{label}</span>
      <span style={{ fontSize: 13, fontWeight: 600, color }}>{score}</span>
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: color, flexShrink: 0 }} />
    </div>
  );
}

export function ComplianceWidget() {
  const [data, setData] = useState<ComplianceScore | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    const apiKey = "ca_test_demo_key_clearagent_2026";
    fetch(`${API_URL}/v1/compliance/score`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => setData(d as ComplianceScore))
      .catch(() => setError(true));
  }, []);

  if (error || !data) return null;

  const mainColor = scoreColor(data.score);

  return (
    <div
      style={{
        background: "rgba(255,255,255,0.03)",
        border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: 12,
        padding: "16px 20px",
        display: "flex",
        alignItems: "center",
        gap: 24,
        flexWrap: "wrap",
        marginBottom: 24,
      }}
    >
      {/* Score ring */}
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div
          style={{
            width: 52,
            height: 52,
            borderRadius: "50%",
            border: `3px solid ${mainColor}`,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <span style={{ fontSize: 16, fontWeight: 700, color: mainColor, lineHeight: 1 }}>{data.score}</span>
          <span style={{ fontSize: 9, color: "#888" }}>/ 100</span>
        </div>
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, color: mainColor }}>{data.grade} — {data.status}</div>
          <div style={{ fontSize: 11, color: "#666", marginTop: 2 }}>EU AI Act compliance score</div>
        </div>
      </div>

      {/* Article badges */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <ArticleBadge label="Art. 12" score={data.breakdown.article12.score} status={data.breakdown.article12.status} />
        <ArticleBadge label="Art. 14" score={data.breakdown.article14.score} status={data.breakdown.article14.status} />
        <ArticleBadge label="Art. 19" score={data.breakdown.article19.score} status={data.breakdown.article19.status} />
      </div>

      {/* Countdown */}
      <div style={{ marginLeft: "auto", textAlign: "right" }}>
        <div style={{ fontSize: 22, fontWeight: 700, color: data.daysToEnforcement < 60 ? "#ef4444" : data.daysToEnforcement < 120 ? "#f59e0b" : "#888" }}>
          {data.daysToEnforcement}d
        </div>
        <div style={{ fontSize: 10, color: "#666" }}>until Aug 2, 2026</div>
      </div>
    </div>
  );
}
