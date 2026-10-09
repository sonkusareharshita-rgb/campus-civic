import { useEffect, useState } from "react";
import "./App.css";

const API = "http://localhost:5000";

function Leaderboard() {
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab]         = useState("reporters"); // reporters | supporters | departments

  useEffect(() => {
    fetch(`${API}/api/issues/leaderboard`)
      .then(r => r.json())
      .then(d => { if (d.success) setData(d); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const MEDAL = ["🥇", "🥈", "🥉"];

  return (
    <div className="feed-page">

      {/* ── HEADER ── */}
      <div className="feed-header" style={{ flexDirection: "column", alignItems: "flex-start", gap: "4px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{ fontSize: "20px" }}>🏆</span>
          <span className="feed-logo">Leaderboard</span>
        </div>
        <span className="feed-tagline" style={{ marginLeft: "28px" }}>
          Top reporters, supporters & fastest categories
        </span>
      </div>

      {/* ── TABS ── */}
      <div style={{
        display: "flex", gap: "8px", padding: "0 16px 16px",
        borderBottom: "1px solid rgba(255,255,255,0.06)", marginBottom: "16px"
      }}>
        {[
          { id: "reporters",   label: "Top Reporters" },
          { id: "supporters",  label: "Top Supporters" },
          { id: "departments", label: "Categories" },
        ].map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            style={{
              padding: "7px 16px",
              borderRadius: "20px",
              border: "1px solid",
              borderColor: tab === t.id ? "#6366f1" : "rgba(255,255,255,0.1)",
              background: tab === t.id ? "rgba(99,102,241,0.15)" : "transparent",
              color: tab === t.id ? "#818cf8" : "#666",
              fontSize: "13px", fontWeight: "600", cursor: "pointer",
              transition: "all 0.2s",
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="feed-loading">
          <div className="feed-spinner" />
          <p>Loading leaderboard…</p>
        </div>
      ) : !data ? (
        <div className="feed-empty">
          <div className="feed-empty-icon">📊</div>
          <h3>No data yet</h3>
        </div>
      ) : (
        <div style={{ padding: "0 16px", display: "flex", flexDirection: "column", gap: "10px" }}>

          {/* TOP REPORTERS */}
          {tab === "reporters" && data.top_reporters.map((r, i) => (
            <div key={r.user_id} style={{
              background: "rgba(255,255,255,0.04)",
              border: i < 3 ? "1px solid rgba(99,102,241,0.3)" : "1px solid rgba(255,255,255,0.07)",
              borderRadius: "14px", padding: "14px 16px",
              display: "flex", alignItems: "center", gap: "14px",
            }}>
              <span style={{ fontSize: "24px", width: "32px", textAlign: "center" }}>
                {MEDAL[i] || `#${i + 1}`}
              </span>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: "700", color: "#e2e8f0", fontSize: "15px" }}>{r.name}</div>
                <div style={{ color: "#555", fontSize: "12px" }}>
                  {r.role} {r.department_name ? `· ${r.department_name}` : ""}
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ color: "#6366f1", fontWeight: "700", fontSize: "18px" }}>
                  {r.issues_reported}
                </div>
                <div style={{ color: "#555", fontSize: "11px" }}>reported</div>
                <div style={{ color: "#10b981", fontSize: "12px" }}>
                  {r.issues_resolved} resolved
                </div>
              </div>
            </div>
          ))}

          {/* TOP SUPPORTERS */}
          {tab === "supporters" && (
            data.top_supporters.length === 0 ? (
              <div className="feed-empty">
                <div className="feed-empty-icon">👆</div>
                <h3>No upvotes yet</h3>
                <p>Start upvoting issues to appear here!</p>
              </div>
            ) : data.top_supporters.map((s, i) => (
              <div key={s.user_id} style={{
                background: "rgba(255,255,255,0.04)",
                border: i < 3 ? "1px solid rgba(245,158,11,0.3)" : "1px solid rgba(255,255,255,0.07)",
                borderRadius: "14px", padding: "14px 16px",
                display: "flex", alignItems: "center", gap: "14px",
              }}>
                <span style={{ fontSize: "24px", width: "32px", textAlign: "center" }}>
                  {MEDAL[i] || `#${i + 1}`}
                </span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: "700", color: "#e2e8f0", fontSize: "15px" }}>{s.name}</div>
                  <div style={{ color: "#555", fontSize: "12px" }}>{s.role}</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ color: "#f59e0b", fontWeight: "700", fontSize: "18px" }}>
                    {s.supports_given}
                  </div>
                  <div style={{ color: "#555", fontSize: "11px" }}>upvotes given</div>
                </div>
              </div>
            ))
          )}

          {/* TOP DEPARTMENTS/CATEGORIES */}
          {tab === "departments" && data.top_departments.map((d, i) => (
            <div key={d.department} style={{
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.07)",
              borderRadius: "14px", padding: "14px 16px",
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                <div style={{ fontWeight: "700", color: "#e2e8f0" }}>
                  {MEDAL[i] || `#${i + 1}`} {d.department}
                </div>
                <div style={{ color: "#10b981", fontWeight: "700" }}>
                  {d.resolved_count} / {d.total_issues} resolved
                </div>
              </div>
              {/* Progress bar */}
              <div style={{ background: "rgba(255,255,255,0.07)", borderRadius: "4px", height: "6px", overflow: "hidden" }}>
                <div style={{
                  width: `${d.total_issues > 0 ? (d.resolved_count / d.total_issues) * 100 : 0}%`,
                  background: "linear-gradient(90deg,#10b981,#6366f1)",
                  height: "100%", borderRadius: "4px",
                  transition: "width 0.6s ease",
                }} />
              </div>
              {d.avg_resolution_hours && (
                <div style={{ color: "#555", fontSize: "12px", marginTop: "6px" }}>
                  Avg resolution: {d.avg_resolution_hours}h
                </div>
              )}
            </div>
          ))}

        </div>
      )}
    </div>
  );
}

export default Leaderboard;
