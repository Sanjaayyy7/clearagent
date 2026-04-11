import { BrowserRouter, Route, Routes } from "react-router-dom";
import { useEffect } from "react";
import { Toaster } from "react-hot-toast";
import LiveFeed from "./pages/LiveFeed.tsx";
import EventDetail from "./pages/EventDetail.tsx";
import IntegrityReport from "./pages/IntegrityReport.tsx";
import AgentManagement from "./pages/AgentManagement.tsx";
import EscalatedReviews from "./pages/EscalatedReviews.tsx";
import { CustomCursor, DashboardNav, PageShell } from "./theme.tsx";
import { ErrorBoundary } from "./components/ErrorBoundary.tsx";
import { ComplianceWidget } from "./components/ComplianceWidget.tsx";
import { useDemoMode } from "./hooks/useDemoMode.ts";

function AppFrame() {
  const isDemo = useDemoMode();

  useEffect(() => {
    document.title = isDemo
      ? "ClearAgent Dashboard — DEMO MODE"
      : "ClearAgent Dashboard — Verification Console";
  }, [isDemo]);

  return (
    <PageShell>
      <CustomCursor />
      <DashboardNav />
      {isDemo && (
        <div style={{ background: "#f59e0b", color: "#000", textAlign: "center", padding: "6px 0", fontSize: 13, fontWeight: 600, letterSpacing: "0.05em" }}>
          DEMO MODE — synthetic data, not connected to a live backend
        </div>
      )}
      <div style={{ maxWidth: 1320, margin: "0 auto", padding: "24px 48px 0" }}>
        <ComplianceWidget />
      </div>
      <Routes>
        <Route path="/" element={<ErrorBoundary><LiveFeed /></ErrorBoundary>} />
        <Route path="/events/:id" element={<ErrorBoundary><EventDetail /></ErrorBoundary>} />
        <Route path="/integrity" element={<ErrorBoundary><IntegrityReport /></ErrorBoundary>} />
        <Route path="/agents" element={<ErrorBoundary><AgentManagement /></ErrorBoundary>} />
        <Route path="/escalated" element={<ErrorBoundary><EscalatedReviews /></ErrorBoundary>} />
      </Routes>
      <footer className="dashboard-footer">
        <div style={{ maxWidth: 1320, margin: "0 auto", padding: "0 48px", width: "100%" }}>
          <div className="dashboard-footer-inner">
            <div>
              <p className="dashboard-footer-title">ClearAgent Dashboard</p>
              <p className="dashboard-footer-copy">
                Landing-grade interface for real-time verification, integrity evidence, and human oversight.
              </p>
            </div>
            <div className="dashboard-footer-meta">
              <span>EU AI Act Art. 12</span>
              <span>Art. 14</span>
              <span>Art. 19</span>
            </div>
          </div>
        </div>
      </footer>
    </PageShell>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppFrame />
      <Toaster position="bottom-right" toastOptions={{ style: { background: "#1a1a1a", color: "#fff", border: "1px solid rgba(255,255,255,0.1)" } }} />
    </BrowserRouter>
  );
}
