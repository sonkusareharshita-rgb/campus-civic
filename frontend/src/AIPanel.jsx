/**
 * AIPanel.jsx — Admin-side AI tools
 *
 * Features:
 *  1. NLP Search — natural language query → filtered results
 *  2. AI Admin Digest — daily narrative + stats
 *  3. Resolution Suggestion — per-issue fix guide
 *  4. Escalation Scanner — scans open issues for escalation candidates
 *  5. Trend Analysis — pattern + hotspot detection
 */
import { useState } from "react";
import "./App.css";

const API = "http://localhost:5000/api/ai";

// ── shared fetch helper ───────────────────────────────────────
async function apiFetch(path, method = "GET", body = null) {
  const opts = {
    method,
    headers: { "Content-Type": "application/json" },
  };
  if (body) opts.body = JSON.stringify(body);
  const r = await fetch(`${API}${path}`, opts);
  return r.json();
}

// ── colour map ────────────────────────────────────────────────
const PRIORITY_COLOR = {
  CRITICAL: "#ef4444", HIGH: "#f97316", MEDIUM: "#f59e0b", LOW: "#6366f1",
};
const STATUS_COLOR = {
  SUBMITTED: "#94a3b8", PENDING: "#f59e0b", VERIFIED: "#8b5cf6",
  IN_PROGRESS: "#3b82f6", RESOLVED: "#10b981", CLOSED: "#4b5563", REJECTED: "#ef4444",
};

// ─────────────────────────────────────────────────────────────
// SECTION WRAPPER
// ─────────────────────────────────────────────────────────────
function Section({ title, emoji, children }) {
  const [open, setOpen] = useState(true);
  return (
    <div style={{ marginBottom: "20px", borderRadius: "14px", border: "1px solid rgba(255,255,255,0.07)", overflow: "hidden" }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: "100%", textAlign: "left", padding: "14px 16px",
          background: "rgba(99,102,241,0.07)", border: "none", cursor: "pointer",
          display: "flex", justifyContent: "space-between", alignItems: "center",
        }}
      >
        <span style={{ fontWeight: "700", fontSize: "14px", color: "#e2e8f0" }}>{emoji} {title}</span>
        <span style={{ color: "#6366f1", fontSize: "12px" }}>{open ? "▲" : "▼"}</span>
      </button>
      {open && <div style={{ padding: "16px", background: "rgba(15,15,25,0.5)" }}>{children}</div>}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// 1. NLP SEARCH
// ─────────────────────────────────────────────────────────────
function NLPSearch() {
  const [query,   setQuery]   = useState("");
  const [results, setResults] = useState(null);
  const [filters, setFilters] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState(null);

  async function handleSearch(e) {
    e.preventDefault();
    if (!query.trim()) return;
    setLoading(true); setError(null);
    try {
      const data = await apiFetch("/search", "POST", { query });
      if (data.success) {
        setResults(data.results);
        setFilters(data.filters);
      } else {
        setError(data.message || "Search failed");
      }
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <form onSubmit={handleSearch} style={{ display: "flex", gap: "8px", marginBottom: "12px" }}>
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder='e.g. "critical water leaks near hostels" or "all resolved WiFi issues"'
          style={{
            flex: 1, padding: "10px 14px", borderRadius: "10px",
            background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.12)",
            color: "#e2e8f0", fontSize: "13px", outline: "none",
          }}
        />
        <button
          type="submit" disabled={loading}
          style={{
            padding: "10px 18px", borderRadius: "10px", border: "none",
            background: loading ? "#374151" : "#6366f1", color: "#fff",
            fontWeight: "700", fontSize: "13px", cursor: loading ? "not-allowed" : "pointer",
          }}
        >
          {loading ? "⏳" : "🔍 Search"}
        </button>
      </form>

      {filters && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginBottom: "12px" }}>
          <span style={{ fontSize: "11px", color: "#94a3b8" }}>AI parsed:</span>
          {filters.intent && <Chip label={`"${filters.intent}"`} color="#6366f1" />}
          {filters.category && <Chip label={`📂 ${filters.category}`} color="#8b5cf6" />}
          {filters.status   && <Chip label={`● ${filters.status}`}   color={STATUS_COLOR[filters.status] || "#6366f1"} />}
          {filters.priority && <Chip label={`⚡ ${filters.priority}`} color={PRIORITY_COLOR[filters.priority] || "#6366f1"} />}
          {filters.location && <Chip label={`📍 ${filters.location}`} color="#06b6d4" />}
          {filters.keywords?.length > 0 && filters.keywords.slice(0,4).map(k => <Chip key={k} label={k} color="#374151" />)}
        </div>
      )}

      {error && <p style={{ color: "#fca5a5", fontSize: "13px" }}>⚠ {error}</p>}

      {results && (
        <div>
          <p style={{ fontSize: "12px", color: "#94a3b8", marginBottom: "8px" }}>
            {results.length} result{results.length !== 1 ? "s" : ""} found
          </p>
          {results.length === 0 && <p style={{ color: "#64748b", fontSize: "13px" }}>No issues match your query.</p>}
          {results.map(issue => (
            <div key={issue.issue_id} style={{
              padding: "10px 12px", borderRadius: "10px", marginBottom: "8px",
              background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)",
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div style={{ fontWeight: "700", fontSize: "13px", color: "#e2e8f0" }}>{issue.title}</div>
                <div style={{ display: "flex", gap: "6px" }}>
                  {issue.priority && <Chip label={issue.priority} color={PRIORITY_COLOR[issue.priority]} small />}
                  <Chip label={issue.status} color={STATUS_COLOR[issue.status] || "#94a3b8"} small />
                </div>
              </div>
              <div style={{ fontSize: "12px", color: "#64748b", marginTop: "4px" }}>
                📍 {issue.location} · {issue.category_name}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// 2. ADMIN DIGEST
// ─────────────────────────────────────────────────────────────
function AdminDigest() {
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState(null);

  async function loadDigest() {
    setLoading(true); setError(null);
    try {
      const res = await apiFetch("/digest");
      if (res.success) setData(res);
      else setError(res.message || "Digest failed");
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <button onClick={loadDigest} disabled={loading} style={btnStyle(loading)}>
        {loading ? "⏳ Generating…" : "✨ Generate Today's Digest"}
      </button>

      {error && <p style={{ color: "#fca5a5", fontSize: "13px", marginTop: "10px" }}>⚠ {error}</p>}

      {data && (
        <div style={{ marginTop: "14px" }}>
          {/* Stats row */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: "8px", marginBottom: "14px" }}>
            {[
              { label: "Open",           value: data.stats.pending,         color: "#f59e0b" },
              { label: "Critical",       value: data.stats.critical,        color: "#ef4444" },
              { label: "New Today",      value: data.stats.new_today,       color: "#3b82f6" },
              { label: "Resolved Today", value: data.stats.resolved_today,  color: "#10b981" },
            ].map(s => (
              <div key={s.label} style={{
                padding: "10px", borderRadius: "10px", textAlign: "center",
                background: "rgba(255,255,255,0.03)", border: `1px solid ${s.color}33`,
              }}>
                <div style={{ fontSize: "20px", fontWeight: "800", color: s.color }}>{s.value ?? 0}</div>
                <div style={{ fontSize: "11px", color: "#94a3b8" }}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* AI narrative */}
          <div style={{
            padding: "14px", borderRadius: "12px",
            background: "rgba(99,102,241,0.08)", border: "1px solid rgba(99,102,241,0.2)",
          }}>
            <div style={{ fontSize: "11px", color: "#6366f1", fontWeight: "700", marginBottom: "8px" }}>
              🤖 AI ASSESSMENT
            </div>
            <p style={{ fontSize: "13px", color: "#cbd5e1", lineHeight: "1.6", margin: 0 }}>{data.digest}</p>
          </div>
          <div style={{ fontSize: "11px", color: "#475569", marginTop: "8px", textAlign: "right" }}>
            Generated at {new Date(data.generated_at).toLocaleTimeString()}
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// 3. ESCALATION SCANNER
// ─────────────────────────────────────────────────────────────
function EscalationScanner() {
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState(null);

  async function runScan() {
    setLoading(true); setError(null);
    try {
      const res = await apiFetch("/escalate-scan");
      if (res.success) setData(res);
      else setError(res.message || "Scan failed");
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <button onClick={runScan} disabled={loading} style={btnStyle(loading, "#ef4444")}>
        {loading ? "⏳ Scanning…" : "🚨 Scan for Escalation Candidates"}
      </button>

      {error && <p style={{ color: "#fca5a5", fontSize: "13px", marginTop: "10px" }}>⚠ {error}</p>}

      {data && (
        <div style={{ marginTop: "14px" }}>
          <p style={{ fontSize: "12px", color: "#94a3b8", marginBottom: "10px" }}>
            Scanned {data.scanned} open issues · {data.candidates.length} need escalation
          </p>

          {data.candidates.length === 0 && (
            <div style={{
              padding: "12px", borderRadius: "10px", textAlign: "center",
              background: "rgba(16,185,129,0.06)", border: "1px solid rgba(16,185,129,0.2)",
              color: "#6ee7b7", fontSize: "13px",
            }}>
              ✅ No escalation needed — all issues are within acceptable thresholds.
            </div>
          )}

          {data.candidates.map((c, i) => (
            <div key={i} style={{
              padding: "12px", borderRadius: "10px", marginBottom: "8px",
              background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.2)",
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div style={{ fontWeight: "700", fontSize: "13px", color: "#fca5a5" }}>#{c.issue_id} — {c.title}</div>
                <Chip label={c.priority} color={PRIORITY_COLOR[c.priority]} small />
              </div>
              <div style={{ fontSize: "12px", color: "#94a3b8", margin: "4px 0" }}>📍 {c.location} · {c.category}</div>
              <div style={{ fontSize: "12px", color: "#fcd34d" }}>⚠ {c.reason}</div>
              {c.escalateTo && (
                <div style={{ fontSize: "12px", color: "#e2e8f0", marginTop: "4px" }}>
                  → Escalate to: <strong>{c.escalateTo}</strong>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// 4. TREND ANALYSIS
// ─────────────────────────────────────────────────────────────
function TrendAnalysis() {
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState(null);

  async function loadTrends() {
    setLoading(true); setError(null);
    try {
      const res = await apiFetch("/trends");
      if (res.success) setData(res);
      else setError(res.message || "Trend analysis failed");
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <button onClick={loadTrends} disabled={loading} style={btnStyle(loading, "#8b5cf6")}>
        {loading ? "⏳ Analysing…" : "📊 Analyse Trends (Last 30 Days)"}
      </button>

      {error && <p style={{ color: "#fca5a5", fontSize: "13px", marginTop: "10px" }}>⚠ {error}</p>}

      {data && (
        <div style={{ marginTop: "14px" }}>
          <p style={{ fontSize: "12px", color: "#94a3b8", marginBottom: "12px" }}>
            Analysed {data.issueCount} issues from the last 30 days
          </p>

          {/* Trends */}
          {data.trends.length > 0 && (
            <div style={{ marginBottom: "14px" }}>
              <div style={{ fontSize: "12px", fontWeight: "700", color: "#a5b4fc", marginBottom: "8px" }}>
                🔁 RECURRING PATTERNS
              </div>
              {data.trends.map((t, i) => (
                <div key={i} style={{
                  padding: "10px 12px", borderRadius: "10px", marginBottom: "6px",
                  background: "rgba(99,102,241,0.06)", border: "1px solid rgba(99,102,241,0.15)",
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                }}>
                  <div>
                    <div style={{ fontSize: "13px", color: "#e2e8f0", fontWeight: "600" }}>{t.pattern}</div>
                    <div style={{ fontSize: "11px", color: "#64748b" }}>{t.category}</div>
                  </div>
                  <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                    <Chip label={`${t.count}x`} color="#6366f1" small />
                    <Chip label={t.severity} color={PRIORITY_COLOR[t.severity] || "#6366f1"} small />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Hotspots */}
          {data.hotspots.length > 0 && (
            <div style={{ marginBottom: "14px" }}>
              <div style={{ fontSize: "12px", fontWeight: "700", color: "#f97316", marginBottom: "8px" }}>
                🔥 PROBLEM HOTSPOTS
              </div>
              {data.hotspots.map((h, i) => (
                <div key={i} style={{
                  padding: "10px 12px", borderRadius: "10px", marginBottom: "6px",
                  background: "rgba(249,115,22,0.06)", border: "1px solid rgba(249,115,22,0.15)",
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                }}>
                  <div>
                    <div style={{ fontSize: "13px", color: "#e2e8f0", fontWeight: "600" }}>📍 {h.location}</div>
                    <div style={{ fontSize: "11px", color: "#64748b" }}>{h.primaryCategory}</div>
                  </div>
                  <Chip label={`${h.issueCount} issues`} color="#f97316" small />
                </div>
              ))}
            </div>
          )}

          {/* Recommendation */}
          {data.recommendation && (
            <div style={{
              padding: "12px 14px", borderRadius: "10px",
              background: "rgba(16,185,129,0.07)", border: "1px solid rgba(16,185,129,0.2)",
            }}>
              <div style={{ fontSize: "11px", color: "#10b981", fontWeight: "700", marginBottom: "6px" }}>
                💡 ADMIN RECOMMENDATION
              </div>
              <p style={{ fontSize: "13px", color: "#6ee7b7", margin: 0 }}>{data.recommendation}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// 5. RESOLUTION SUGGESTION (per-issue, inline)
// ─────────────────────────────────────────────────────────────
export function ResolutionPanel({ issueId }) {
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState(null);

  async function load() {
    setLoading(true); setError(null);
    try {
      const res = await apiFetch(`/resolution/${issueId}`, "POST");
      if (res.success) setData(res.resolution);
      else setError(res.message || "Failed to get suggestions");
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }

  if (!data) return (
    <button onClick={load} disabled={loading} style={{ ...btnStyle(loading, "#10b981"), fontSize: "12px", padding: "7px 12px" }}>
      {loading ? "⏳ AI thinking…" : "🤖 Get AI Resolution Guide"}
    </button>
  );

  return (
    <div style={{
      padding: "12px", borderRadius: "12px", marginTop: "10px",
      background: "rgba(16,185,129,0.06)", border: "1px solid rgba(16,185,129,0.2)",
    }}>
      <div style={{ fontSize: "11px", color: "#10b981", fontWeight: "700", marginBottom: "10px" }}>
        🤖 AI RESOLUTION GUIDE
      </div>

      {data.rootCause && (
        <div style={{ marginBottom: "10px" }}>
          <div style={{ fontSize: "11px", color: "#94a3b8", marginBottom: "4px" }}>ROOT CAUSE</div>
          <p style={{ fontSize: "13px", color: "#d1fae5", margin: 0 }}>{data.rootCause}</p>
        </div>
      )}

      {data.steps?.length > 0 && (
        <div style={{ marginBottom: "10px" }}>
          <div style={{ fontSize: "11px", color: "#94a3b8", marginBottom: "6px" }}>ACTION STEPS</div>
          {data.steps.map((s, i) => (
            <div key={i} style={{ display: "flex", gap: "8px", marginBottom: "5px", alignItems: "flex-start" }}>
              <span style={{ color: "#10b981", fontWeight: "700", fontSize: "13px", flexShrink: 0 }}>{i + 1}.</span>
              <span style={{ fontSize: "13px", color: "#a7f3d0" }}>{s}</span>
            </div>
          ))}
        </div>
      )}

      <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
        {data.escalateTo && (
          <div style={{ fontSize: "12px", color: "#fcd34d" }}>
            📤 Escalate to: <strong>{data.escalateTo}</strong>
          </div>
        )}
        {data.estimatedTime && (
          <div style={{ fontSize: "12px", color: "#94a3b8" }}>
            ⏱ Est. time: <strong>{data.estimatedTime}</strong>
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// UTILITY COMPONENTS
// ─────────────────────────────────────────────────────────────
function Chip({ label, color, small }) {
  return (
    <span style={{
      padding: small ? "2px 7px" : "4px 10px",
      borderRadius: "6px",
      fontSize: small ? "10px" : "11px",
      fontWeight: "700",
      color: "#fff",
      background: `${color}22`,
      border: `1px solid ${color}55`,
      whiteSpace: "nowrap",
    }}>
      {label}
    </span>
  );
}

function btnStyle(loading, color = "#6366f1") {
  return {
    padding: "10px 18px", borderRadius: "10px", border: "none",
    background: loading ? "rgba(255,255,255,0.06)" : `${color}22`,
    color: loading ? "#64748b" : color,
    fontWeight: "700", fontSize: "13px", cursor: loading ? "not-allowed" : "pointer",
    border: `1px solid ${color}44`, transition: "all 0.2s",
  };
}

// ─────────────────────────────────────────────────────────────
// MAIN AIPanel COMPONENT
// ─────────────────────────────────────────────────────────────
function AIPanel() {
  return (
    <div style={{ padding: "0 0 20px" }}>
      <div style={{ marginBottom: "16px" }}>
        <div style={{
          display: "inline-flex", alignItems: "center", gap: "8px",
          padding: "6px 12px", borderRadius: "20px",
          background: "rgba(99,102,241,0.1)", border: "1px solid rgba(99,102,241,0.3)",
          fontSize: "11px", fontWeight: "700", color: "#6366f1",
          marginBottom: "8px",
        }}>
          🤖 POWERED BY GEMINI 2.5 FLASH
        </div>
        <h2 style={{ margin: 0, fontSize: "20px", fontWeight: "800", color: "#e2e8f0" }}>
          AI Command Centre
        </h2>
        <p style={{ margin: "4px 0 0", fontSize: "13px", color: "#64748b" }}>
          Intelligent tools to understand, search, and resolve campus issues faster.
        </p>
      </div>

      <Section emoji="🔍" title="Natural Language Search">
        <NLPSearch />
      </Section>

      <Section emoji="📋" title="Admin Digest">
        <AdminDigest />
      </Section>

      <Section emoji="🚨" title="Escalation Scanner">
        <EscalationScanner />
      </Section>

      <Section emoji="📈" title="Trend & Hotspot Analysis">
        <TrendAnalysis />
      </Section>
    </div>
  );
}

export default AIPanel;
