import { useEffect, useState } from "react";
import "./App.css";

const API = "http://localhost:5000";

const PRIORITY_COLOR = {
  CRITICAL: { bg: "rgba(239,68,68,0.15)",  text: "#ef4444", dot: "#ef4444"  },
  HIGH:     { bg: "rgba(249,115,22,0.15)", text: "#f97316", dot: "#f97316" },
  MEDIUM:   { bg: "rgba(245,158,11,0.15)", text: "#f59e0b", dot: "#f59e0b" },
  LOW:      { bg: "rgba(99,102,241,0.15)", text: "#6366f1", dot: "#6366f1"  },
};

function timeAgo(d) {
  const s = Math.floor((Date.now() - new Date(d)) / 1000);
  if (s < 60)  return "just now";
  if (s < 3600) return `${Math.floor(s/60)}m ago`;
  if (s < 86400) return `${Math.floor(s/3600)}h ago`;
  return `${Math.floor(s/86400)}d ago`;
}

function Trending({ currentUser, onCardClick, onLoginPrompt }) {
  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTrending();
  }, []);

  async function fetchTrending() {
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/issues/trending`);
      const data = await res.json();
      if (data.success) setIssues(data.issues || []);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }

  const handleClick = (issue) => {
    if (!currentUser) { onLoginPrompt?.(); return; }
    onCardClick?.(issue);
  };

  return (
    <div className="feed-page">

      {/* ── HEADER ── */}
      <div className="feed-header" style={{ flexDirection: "column", alignItems: "flex-start", gap: "4px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{ fontSize: "20px" }}>🔥</span>
          <span className="feed-logo">Trending Now</span>
        </div>
        <span className="feed-tagline" style={{ marginLeft: "28px" }}>
          Sorted by upvote velocity — fastest rising issues
        </span>
      </div>

      {loading ? (
        <div className="feed-loading">
          <div className="feed-spinner" />
          <p>Loading trending issues…</p>
        </div>
      ) : issues.length === 0 ? (
        <div className="feed-empty">
          <div className="feed-empty-icon">📭</div>
          <h3>No trending issues</h3>
          <p>Be the first to report something — it might go trending!</p>
        </div>
      ) : (
        <div className="feed-list">
          {issues.map((issue, idx) => {
            const pc = PRIORITY_COLOR[issue.priority] || PRIORITY_COLOR.MEDIUM;
            const velocity = parseFloat(issue.velocity || 0).toFixed(1);
            return (
              <article
                key={issue.issue_id}
                className="issue-card"
                onClick={() => handleClick(issue)}
                style={{ cursor: "pointer" }}
              >
                {/* Rank badge */}
                <div style={{
                  position: "absolute",
                  top: "14px", right: "14px",
                  background: idx < 3 ? "linear-gradient(135deg,#f59e0b,#ef4444)" : "rgba(255,255,255,0.07)",
                  borderRadius: "50%",
                  width: "32px", height: "32px",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontWeight: "700", fontSize: "13px",
                  color: idx < 3 ? "#fff" : "#888",
                }}>
                  #{idx + 1}
                </div>

                {/* Category & Time */}
                <div className="issue-card-meta-row">
                  <span className="issue-category-badge">{issue.category_name}</span>
                  <span className="issue-time">{timeAgo(issue.created_at)}</span>
                </div>

                {/* Title */}
                <h3 className="issue-card-title">{issue.title}</h3>
                <p className="issue-card-desc">{issue.description}</p>

                {/* Footer */}
                <div className="issue-card-footer">
                  <span
                    className="priority-badge"
                    style={{ background: pc.bg, color: pc.text }}
                  >
                    <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: pc.dot, display: "inline-block", marginRight: "5px" }} />
                    {issue.priority}
                  </span>

                  <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
                    {/* Velocity */}
                    <span style={{
                      display: "flex", alignItems: "center", gap: "4px",
                      color: "#f59e0b", fontWeight: "600", fontSize: "13px",
                    }}>
                      🔥 {velocity}/hr
                    </span>

                    {/* Support count */}
                    <span style={{
                      display: "flex", alignItems: "center", gap: "4px",
                      color: "#6366f1", fontSize: "13px",
                    }}>
                      ▲ {issue.support_count}
                    </span>
                  </div>
                </div>

                {/* Reporter */}
                <div style={{ fontSize: "12px", color: "#555", marginTop: "8px" }}>
                  📍 {issue.location} · 👤 {issue.reported_by_name || "Anonymous"}
                </div>
              </article>
            );
          })}
        </div>
      )}

    </div>
  );
}

export default Trending;
