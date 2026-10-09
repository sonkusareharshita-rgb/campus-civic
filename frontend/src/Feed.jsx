import { useState, useEffect, useRef } from "react";
import IssueCard from "./IssueCard";
import { usePullToRefresh } from "./usePullToRefresh";
import "./App.css";

const GUEST_LIMIT = 4;

function Feed({ currentUser, onCardClick, onLoginPrompt, onUpvote, upvotedIds }) {
  const [issues, setIssues]           = useState([]);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState(null);
  const [newCount, setNewCount]       = useState(0);   // new issues since last refresh

  const containerRef = useRef(null);
  const { isPulling, pullProgress, isRefreshing } = usePullToRefresh(
    fetchIssues,
    containerRef
  );

  // ── FETCH ISSUES ──────────────────────────────────────────
  useEffect(() => {
    fetchIssues();
  }, []);

  async function fetchIssues() {
    setLoading(true);
    setError(null);
    setNewCount(0);

    try {
      const res  = await fetch("http://localhost:5000/api/issues/all");
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to fetch");
      setIssues(data.issues || []);
    } catch {
      setError("Could not load issues. Is the backend running?");
    } finally {
      setLoading(false);
    }
  }


  // ── DETERMINE VISIBLE ISSUES ──────────────────────────────
  const isGuest      = !currentUser;
  const visibleIssues = isGuest ? issues.slice(0, GUEST_LIMIT) : issues;
  const hiddenCount   = isGuest ? Math.max(0, issues.length - GUEST_LIMIT) : 0;

  // ── LOADING ───────────────────────────────────────────────
  if (loading) {
    return (
      <div className="feed-page">
        <div className="feed-loading">
          <div className="feed-spinner" />
          <p>Loading issues…</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="feed-page">
        <div className="feed-error">
          <span>⚠️</span>
          <p>{error}</p>
          <button className="feed-retry-btn" onClick={fetchIssues}>Retry</button>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="feed-page"
      style={{ overflowY: "auto", height: "100vh", position: "relative" }}
    >

      {/* ── PULL TO REFRESH INDICATOR ── */}
      {(isPulling || isRefreshing) && (
        <div style={{
          display: "flex", justifyContent: "center", alignItems: "center",
          height: `${Math.max(pullProgress * 60, isRefreshing ? 52 : 0)}px`,
          overflow: "hidden", transition: "height 0.2s ease",
          color: pullProgress >= 1 ? "#6366f1" : "#555",
          fontSize: "13px", fontWeight: "700", gap: "8px",
        }}>
          <span style={{
            display: "inline-block",
            transform: isRefreshing
              ? "rotate(0deg)"
              : `rotate(${Math.min(pullProgress * 180, 180)}deg)`,
            transition: "transform 0.2s",
            animation: isRefreshing ? "spin 0.7s linear infinite" : "none",
            fontSize: "18px",
          }}>
            {isRefreshing ? "↻" : "↓"}
          </span>
          {isRefreshing ? "Refreshing…" : pullProgress >= 1 ? "Release to refresh" : "Pull to refresh"}
        </div>
      )}

      {/* ── HEADER ── */}
      <div className="feed-header">
        <span className="feed-logo">🏫 Campus Civic</span>
      </div>


      {/* ── NEW ISSUES BANNER ── */}
      {newCount > 0 && (
        <button
          onClick={fetchIssues}
          style={{
            display: "block", width: "calc(100% - 32px)",
            margin: "0 16px 10px",
            padding: "10px",
            background: "linear-gradient(135deg, rgba(99,102,241,0.2), rgba(139,92,246,0.2))",
            border: "1px solid rgba(99,102,241,0.4)",
            borderRadius: "12px",
            color: "#a5b4fc",
            fontWeight: "700", fontSize: "13px",
            cursor: "pointer",
            animation: "slideDown 0.3s ease",
          }}
        >
          ↑ {newCount} new issue{newCount > 1 ? "s" : ""} — tap to refresh
        </button>
      )}

      {/* ── EMPTY STATE ── */}
      {issues.length === 0 && (
        <div className="feed-empty">
          <div className="feed-empty-icon">📭</div>
          <h3>No issues reported yet</h3>
          <p>Be the first to report a campus issue.</p>
        </div>
      )}

      {/* ── CARDS ── */}
      <div className="feed-list" style={{ display: "flex", flexDirection: "column", gap: "0", background: "#0f0f0f", padding: "0" }}>
        {visibleIssues.map((issue) => (
          <IssueCard
            key={issue.issue_id}
            issue={issue}
            currentUser={currentUser}
            onClick={() => onCardClick(issue)}
            onUpvote={onUpvote}
            isUpvoted={upvotedIds?.includes(issue.issue_id)}
            onLoginPrompt={onLoginPrompt}
          />
        ))}
      </div>

      {/* ── GUEST BLUR PROMPT ── */}
      {isGuest && hiddenCount > 0 && (
        <div className="feed-blur-prompt">
          <div className="feed-blur-overlay" />
          <div className="feed-blur-content">
            <div className="feed-blur-icon">🔒</div>
            <h3>+{hiddenCount} more issues</h3>
            <p>Sign in to see all campus issues and upvote the ones that matter most.</p>
            <button className="feed-blur-btn" onClick={onLoginPrompt}>
              Sign In to See All
            </button>
          </div>
        </div>
      )}

    </div>
  );
}

export default Feed;
