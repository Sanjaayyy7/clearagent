import { BrowserRouter, Routes, Route, NavLink } from "react-router-dom";
import LiveFeed from "./pages/LiveFeed.tsx";
import EventDetail from "./pages/EventDetail.tsx";
import IntegrityReport from "./pages/IntegrityReport.tsx";
import AgentManagement from "./pages/AgentManagement.tsx";

function Sidebar() {
  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `block px-4 py-2.5 rounded-lg text-sm transition-colors ${
      isActive
        ? "bg-brand-accent/10 text-brand-accent font-medium"
        : "text-brand-muted hover:text-brand-text hover:bg-brand-surface"
    }`;

  return (
    <aside className="w-56 border-r border-brand-border p-4 flex flex-col gap-1">
      <div className="mb-6 px-2">
        <h1 className="text-lg font-bold text-brand-text">ClearAgent</h1>
        <p className="text-xs text-brand-muted mt-0.5">Verification Dashboard</p>
      </div>
      <nav className="flex flex-col gap-0.5">
        <NavLink to="/" className={linkClass} end>
          Live Feed
        </NavLink>
        <NavLink to="/integrity" className={linkClass}>
          Integrity Report
        </NavLink>
        <NavLink to="/agents" className={linkClass}>
          Agent Management
        </NavLink>
      </nav>
      <div className="mt-auto pt-4 border-t border-brand-border px-2">
        <p className="text-xs text-brand-muted">EU AI Act Compliant</p>
        <p className="text-xs text-brand-muted">Art. 12, 14, 19</p>
      </div>
    </aside>
  );
}

function App() {
  return (
    <BrowserRouter>
      <div className="flex h-screen bg-brand-bg">
        <Sidebar />
        <main className="flex-1 overflow-auto p-6">
          <Routes>
            <Route path="/" element={<LiveFeed />} />
            <Route path="/events/:id" element={<EventDetail />} />
            <Route path="/integrity" element={<IntegrityReport />} />
            <Route path="/agents" element={<AgentManagement />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

export default App;
