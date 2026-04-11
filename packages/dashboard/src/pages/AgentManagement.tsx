import { useEffect, useState } from "react";
import { getAgents, registerAgent, updateAgentStatus, type Agent } from "../lib/api.ts";
import { BODY, HEADING, SectionHeading, SectionLabel, contentWidth, LoadingState } from "../theme.tsx";

const statusTone: Record<string, string> = {
  active: "dashboard-badge dashboard-badge-success",
  suspended: "dashboard-badge dashboard-badge-danger",
  flagged: "dashboard-badge dashboard-badge-warning",
};

function RegisterForm({ onSuccess }: { onSuccess: (apiKey: string, name: string) => void }) {
  const [name, setName] = useState("");
  const [externalId, setExternalId] = useState("");
  const [modelProvider, setModelProvider] = useState("");
  const [modelId, setModelId] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
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
    <form onSubmit={handleSubmit} className="dashboard-card dashboard-form-card">
      <div style={{ marginBottom: 18 }}>
        <SectionLabel>Register</SectionLabel>
        <div style={{ ...HEADING, fontSize: "clamp(24px, 3vw, 34px)", marginBottom: 10 }}>New operator identity.</div>
        <p className="dashboard-card-copy">Provision an agent and issue a one-time API key within the same polished product shell.</p>
      </div>

      <div className="dashboard-form-grid">
        <div>
          <label className="dashboard-field-label">Name *</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Payment Agent"
            className="dashboard-input"
          />
        </div>
        <div>
          <label className="dashboard-field-label">External ID *</label>
          <input
            type="text"
            value={externalId}
            onChange={(e) => setExternalId(e.target.value)}
            placeholder="agent-001"
            className="dashboard-input"
          />
        </div>
        <div>
          <label className="dashboard-field-label">Model Provider</label>
          <select value={modelProvider} onChange={(e) => setModelProvider(e.target.value)} className="dashboard-select">
            <option value="">Select provider</option>
            <option value="anthropic">Anthropic</option>
            <option value="openai">OpenAI</option>
            <option value="google">Google</option>
            <option value="other">Other</option>
          </select>
        </div>
        <div>
          <label className="dashboard-field-label">Model ID</label>
          <input
            type="text"
            value={modelId}
            onChange={(e) => setModelId(e.target.value)}
            placeholder="gpt-5.4"
            className="dashboard-input"
          />
        </div>
      </div>

      <div style={{ marginTop: 16 }}>
        <label className="dashboard-field-label">Description</label>
        <input
          type="text"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Optional description"
          className="dashboard-input"
        />
      </div>

      {error ? <p className="dashboard-error-copy">{error}</p> : null}

      <div className="dashboard-actions">
        <button
          type="submit"
          disabled={!name.trim() || !externalId.trim() || submitting}
          className="btn-black dashboard-button-reset"
        >
          {submitting ? "Registering..." : "Register Agent"}
        </button>
      </div>
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

  useEffect(() => {
    loadAgents();
  }, []);

  async function handleStatusChange(agentId: string, status: "active" | "suspended") {
    try {
      const updated = await updateAgentStatus(agentId, status);
      setAgents((prev) => prev.map((agent) => (agent.id === agentId ? { ...agent, status: updated.status as Agent["status"] } : agent)));
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
    if (!newApiKey) return;
    navigator.clipboard.writeText(newApiKey.key).then(() => {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    });
  }

  if (loading) {
    return <LoadingState label="Loading registered agents..." />;
  }

  return (
    <section className="dashboard-page">
      <div style={contentWidth()}>
        <div className="dashboard-page-intro dashboard-page-intro-split">
          <div>
            <SectionLabel>Agent management</SectionLabel>
            <SectionHeading line1="Human oversight" line2="and stop controls" />
            <p style={{ ...BODY, maxWidth: 620 }}>
              Register new agents, issue API credentials, and suspend autonomous activity when operators need to intervene.
            </p>
          </div>
          <button type="button" onClick={() => setShowForm((value) => !value)} className="btn-black dashboard-button-reset">
            {showForm ? "Close form" : "Register Agent"}
          </button>
        </div>

        {newApiKey ? (
          <div className="dashboard-card dashboard-success-card">
            <p className="dashboard-success-title">Agent “{newApiKey.name}” registered</p>
            <p className="dashboard-card-copy">API key shown once. Copy it now and store it securely.</p>
            <div className="dashboard-key-row">
              <code className="dashboard-hash dashboard-hash-full">{newApiKey.key}</code>
              <button type="button" onClick={copyKey} className="btn-outline dashboard-button-reset">
                {copied ? "Copied!" : "Copy"}
              </button>
            </div>
            <button type="button" onClick={() => setNewApiKey(null)} className="dashboard-text-link">
              Dismiss
            </button>
          </div>
        ) : null}

        {showForm ? <RegisterForm onSuccess={handleRegisterSuccess} /> : null}

        {error ? <p className="dashboard-error-copy" style={{ marginBottom: 20 }}>{error}</p> : null}

        <div className="dashboard-card dashboard-table-card">
          <div style={{ marginBottom: 20 }}>
            <SectionLabel>Registry</SectionLabel>
            <div style={{ ...HEADING, fontSize: "clamp(26px, 3vw, 36px)" }}>Registered agents.</div>
          </div>
          <div className="dashboard-table-wrap">
            <table className="dashboard-table">
              <thead>
                <tr>
                  <th>Agent</th>
                  <th>External ID</th>
                  <th>Model</th>
                  <th>Status</th>
                  <th>Registered</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {agents.length === 0 ? (
                  <tr>
                    <td colSpan={6}>
                      <div className="dashboard-empty-table">No agents registered yet.</div>
                    </td>
                  </tr>
                ) : (
                  agents.map((agent) => (
                    <tr key={agent.id}>
                      <td>
                        <div className="dashboard-primary-cell">{agent.name}</div>
                        <div className="dashboard-secondary-cell">{agent.id.slice(0, 8)}...</div>
                      </td>
                      <td className="dashboard-secondary-cell">{agent.externalId}</td>
                      <td className="dashboard-secondary-cell">
                        {agent.modelProvider ? `${agent.modelProvider}${agent.modelId ? ` / ${agent.modelId}` : ""}` : "—"}
                      </td>
                      <td>
                        <span className={statusTone[agent.status] || "dashboard-badge dashboard-badge-neutral"}>
                          {agent.status}
                        </span>
                      </td>
                      <td className="dashboard-secondary-cell">{new Date(agent.registeredAt).toLocaleDateString()}</td>
                      <td>
                        {agent.status === "suspended" ? (
                          <button
                            type="button"
                            onClick={() => setPendingAction({ agentId: agent.id, name: agent.name, action: "activate" })}
                            className="dashboard-text-link"
                          >
                            Reactivate
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setPendingAction({ agentId: agent.id, name: agent.name, action: "suspend" })}
                            className="dashboard-text-link dashboard-text-link-danger"
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

        {pendingAction ? (
          <div className="dashboard-modal-backdrop">
            <div className="dashboard-modal-card">
              <SectionLabel>Oversight action</SectionLabel>
              <div style={{ ...HEADING, fontSize: "clamp(24px, 3vw, 34px)", marginBottom: 12 }}>
                {pendingAction.action === "suspend" ? "Suspend agent." : "Reactivate agent."}
              </div>
              <p style={{ ...BODY, fontSize: 15, marginBottom: 24 }}>
                {pendingAction.action === "suspend"
                  ? `Suspending “${pendingAction.name}” will prevent it from submitting new verification events.`
                  : `Reactivating “${pendingAction.name}” restores its ability to submit verification events.`}
              </p>
              <div className="dashboard-actions">
                <button type="button" onClick={() => setPendingAction(null)} className="btn-outline dashboard-button-reset">
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() =>
                    handleStatusChange(pendingAction.agentId, pendingAction.action === "suspend" ? "suspended" : "active")
                  }
                  className="btn-black dashboard-button-reset"
                >
                  {pendingAction.action === "suspend" ? "Suspend" : "Reactivate"}
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}
