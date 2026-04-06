import { useEffect, useState } from "react";
import { getAgents, registerAgent, updateAgentStatus, type Agent } from "../lib/api.ts";

const statusColors: Record<string, string> = {
  active: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  suspended: "bg-red-500/15 text-red-400 border-red-500/30",
  flagged: "bg-amber-500/15 text-amber-400 border-amber-500/30",
};

function RegisterForm({ onSuccess }: { onSuccess: (apiKey: string, name: string) => void }) {
  const [name, setName] = useState("");
  const [externalId, setExternalId] = useState("");
  const [modelProvider, setModelProvider] = useState("");
  const [modelId, setModelId] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !externalId.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      const result = await registerAgent({
        name: name.trim(),
        externalId: externalId.trim(),
        modelProvider: modelProvider.trim() || undefined,
        modelId: modelId.trim() || undefined,
        description: description.trim() || undefined,
      });
      onSuccess(result.apiKey, name.trim());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to register agent");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="bg-brand-surface border border-brand-border rounded-xl p-5 space-y-3">
      <h3 className="font-semibold text-brand-text">Register New Agent</h3>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-brand-muted uppercase tracking-wide block mb-1">Name *</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Payment Agent"
            className="w-full bg-brand-bg border border-brand-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-accent"
          />
        </div>
        <div>
          <label className="text-xs text-brand-muted uppercase tracking-wide block mb-1">External ID *</label>
          <input
            type="text"
            value={externalId}
            onChange={(e) => setExternalId(e.target.value)}
            placeholder="agent-001"
            className="w-full bg-brand-bg border border-brand-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-accent"
          />
        </div>
        <div>
          <label className="text-xs text-brand-muted uppercase tracking-wide block mb-1">Model Provider</label>
          <select
            value={modelProvider}
            onChange={(e) => setModelProvider(e.target.value)}
            className="w-full bg-brand-bg border border-brand-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-accent"
          >
            <option value="">— select —</option>
            <option value="anthropic">Anthropic</option>
            <option value="openai">OpenAI</option>
            <option value="google">Google</option>
            <option value="other">Other</option>
          </select>
        </div>
        <div>
          <label className="text-xs text-brand-muted uppercase tracking-wide block mb-1">Model ID</label>
          <input
            type="text"
            value={modelId}
            onChange={(e) => setModelId(e.target.value)}
            placeholder="claude-sonnet-4-6"
            className="w-full bg-brand-bg border border-brand-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-accent"
          />
        </div>
      </div>
      <div>
        <label className="text-xs text-brand-muted uppercase tracking-wide block mb-1">Description</label>
        <input
          type="text"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Optional description"
          className="w-full bg-brand-bg border border-brand-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-accent"
        />
      </div>
      {error && <p className="text-red-400 text-sm">{error}</p>}
      <button
        type="submit"
        disabled={!name.trim() || !externalId.trim() || submitting}
        className="bg-brand-accent text-white rounded-lg px-4 py-2 text-sm font-medium hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-opacity"
      >
        {submitting ? "Registering..." : "Register Agent"}
      </button>
    </form>
  );
}

export default function AgentManagement() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [newApiKey, setNewApiKey] = useState<{ key: string; name: string } | null>(null);
  const [pendingAction, setPendingAction] = useState<{ agentId: string; name: string; action: "suspend" | "activate" } | null>(null);
  const [copied, setCopied] = useState(false);

  function loadAgents() {
    return getAgents()
      .then((res) => setAgents(res.agents))
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load agents"))
      .finally(() => setLoading(false));
  }

  useEffect(() => { loadAgents(); }, []);

  async function handleStatusChange(agentId: string, status: "active" | "suspended") {
    try {
      const updated = await updateAgentStatus(agentId, status);
      setAgents((prev) => prev.map((a) => a.id === agentId ? { ...a, status: updated.status as Agent["status"] } : a));
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to update agent status");
    } finally {
      setPendingAction(null);
    }
  }

  function handleRegisterSuccess(apiKey: string, name: string) {
    setNewApiKey({ key: apiKey, name });
    setShowForm(false);
    loadAgents();
  }

  function copyKey() {
    if (newApiKey) {
      navigator.clipboard.writeText(newApiKey.key).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      });
    }
  }

  if (loading) {
    return <div className="flex items-center justify-center h-full text-brand-muted">Loading agents...</div>;
  }

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">Agent Management</h2>
          <p className="text-sm text-brand-muted mt-0.5">Art. 14 — Human oversight and stop button</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-brand-accent text-white rounded-lg px-4 py-2 text-sm font-medium hover:opacity-90 transition-opacity"
        >
          {showForm ? "Cancel" : "Register Agent"}
        </button>
      </div>

      {/* New API key reveal */}
      {newApiKey && (
        <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4">
          <p className="text-emerald-400 text-sm font-medium mb-1">Agent "{newApiKey.name}" registered</p>
          <p className="text-xs text-brand-muted mb-2">API key shown once — copy it now.</p>
          <div className="flex items-center gap-2">
            <code className="text-xs font-mono text-emerald-400 bg-brand-bg border border-brand-border rounded px-3 py-2 flex-1 break-all">
              {newApiKey.key}
            </code>
            <button
              onClick={copyKey}
              className="text-xs bg-brand-surface border border-brand-border rounded px-3 py-2 hover:bg-brand-border transition-colors"
            >
              {copied ? "Copied!" : "Copy"}
            </button>
          </div>
          <button onClick={() => setNewApiKey(null)} className="text-xs text-brand-muted mt-2 hover:text-brand-text">
            Dismiss
          </button>
        </div>
      )}

      {/* Register form */}
      {showForm && <RegisterForm onSuccess={handleRegisterSuccess} />}

      {/* Confirm dialog */}
      {pendingAction && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-brand-surface border border-brand-border rounded-xl p-6 max-w-sm w-full mx-4">
            <h3 className="font-semibold text-brand-text mb-2">
              {pendingAction.action === "suspend" ? "Suspend Agent" : "Reactivate Agent"}
            </h3>
            <p className="text-sm text-brand-muted mb-4">
              {pendingAction.action === "suspend"
                ? `Suspending "${pendingAction.name}" will prevent it from submitting new verification events (EU AI Act Art. 14).`
                : `Reactivate "${pendingAction.name}" to allow it to submit verification events again.`}
            </p>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setPendingAction(null)}
                className="px-4 py-2 text-sm border border-brand-border rounded-lg hover:bg-brand-border transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleStatusChange(pendingAction.agentId, pendingAction.action === "suspend" ? "suspended" : "active")}
                className={`px-4 py-2 text-sm rounded-lg text-white ${pendingAction.action === "suspend" ? "bg-red-500 hover:bg-red-600" : "bg-emerald-600 hover:bg-emerald-700"} transition-colors`}
              >
                {pendingAction.action === "suspend" ? "Suspend" : "Reactivate"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Agent table */}
      {error && <p className="text-red-400 text-sm">{error}</p>}

      <div className="bg-brand-surface border border-brand-border rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-brand-border text-brand-muted text-xs uppercase tracking-wide">
              <th className="text-left p-3 pl-4">Agent</th>
              <th className="text-left p-3">External ID</th>
              <th className="text-left p-3">Model</th>
              <th className="text-left p-3">Status</th>
              <th className="text-left p-3">Registered</th>
              <th className="text-left p-3 pr-4">Actions</th>
            </tr>
          </thead>
          <tbody>
            {agents.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-6 text-center text-brand-muted text-sm">
                  No agents registered yet.
                </td>
              </tr>
            ) : (
              agents.map((agent) => (
                <tr key={agent.id} className="border-b border-brand-border/50 hover:bg-brand-border/20 transition-colors">
                  <td className="p-3 pl-4">
                    <p className="font-medium text-brand-text">{agent.name}</p>
                    <code className="text-xs text-brand-muted font-mono">{agent.id.slice(0, 8)}...</code>
                  </td>
                  <td className="p-3 text-brand-muted text-xs font-mono">{agent.externalId}</td>
                  <td className="p-3 text-xs text-brand-muted">
                    {agent.modelProvider ? `${agent.modelProvider}${agent.modelId ? ` / ${agent.modelId}` : ""}` : "—"}
                  </td>
                  <td className="p-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${statusColors[agent.status] || "bg-gray-500/15 text-gray-400 border-gray-500/30"}`}>
                      {agent.status}
                    </span>
                  </td>
                  <td className="p-3 text-xs text-brand-muted">
                    {new Date(agent.registeredAt).toLocaleDateString()}
                  </td>
                  <td className="p-3 pr-4">
                    {agent.status === "suspended" ? (
                      <button
                        onClick={() => setPendingAction({ agentId: agent.id, name: agent.name, action: "activate" })}
                        className="text-xs text-emerald-400 hover:text-emerald-300 transition-colors"
                      >
                        Reactivate
                      </button>
                    ) : (
                      <button
                        onClick={() => setPendingAction({ agentId: agent.id, name: agent.name, action: "suspend" })}
                        className="text-xs text-red-400 hover:text-red-300 transition-colors"
                      >
                        Suspend
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
