import { BrowserRouter, Route, Routes } from "react-router-dom";
import { useEffect } from "react";
import LiveFeed from "./pages/LiveFeed.tsx";
import EventDetail from "./pages/EventDetail.tsx";
import IntegrityReport from "./pages/IntegrityReport.tsx";
import AgentManagement from "./pages/AgentManagement.tsx";
import EscalatedReviews from "./pages/EscalatedReviews.tsx";
import { CustomCursor, DashboardNav, PageShell } from "./theme.tsx";

function AppFrame() {
  useEffect(() => {
    document.title = "ClearAgent Dashboard — Verification Console";
  }, []);

  return (
    <PageShell>
      <CustomCursor />
      <DashboardNav />
      <Routes>
        <Route path="/" element={<LiveFeed />} />
        <Route path="/events/:id" element={<EventDetail />} />
        <Route path="/integrity" element={<IntegrityReport />} />
        <Route path="/agents" element={<AgentManagement />} />
        <Route path="/escalated" element={<EscalatedReviews />} />
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
    </BrowserRouter>
  );
}
