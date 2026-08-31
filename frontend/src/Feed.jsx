import { useState, useEffect } from "react";
import IssueCard from "./IssueCard";
import "./App.css";

const GUEST_LIMIT = 4;

function Feed({ currentUser, onCardClick, onLoginPrompt, onUpvote, upvotedIds }) {
  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // ── FETCH ISSUES ──────────────────────────────
  useEffect(() => {
    fetchIssues();
  }, []);

  async function fetchIssues() {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("http://localhost:5000/api/issues/all");
      const data = await res.json();

      if (!res.ok) throw new Error(data.message || "Failed to fetch");

      setIssues(data.issues || []);
    } catch (err) {
      setError("Could not load issues. Is the backend running?");
    } finally {
      setLoading(false);
    }
  }

  // ── DETERMINE VISIBLE ISSUES ─────────────────
  const isGuest = !currentUser;
  const visibleIssues = isGuest ? issues.slice(0, GUEST_LIMIT) : issues;
  const hiddenCount = isGuest ? Math.max(0, issues.length - GUEST_LIMIT) : 0;

  // ── RENDER ────────────────────────────────────
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
          <button className="feed-retry-btn" onClick={fetchIssues}>
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="feed-page">

      {/* ── HEADER ── */}
      <div className="feed-header">
        <span className="feed-logo">🏫 Campus Civic</span>
        <span className="feed-tagline">
          {issues.length} issues · {issues.filter(i => i.status === "PENDING").length} open
        </span>
      </div>

      {/* ── EMPTY STATE ── */}
      {issues.length === 0 && (
        <div className="feed-empty">
          <div className="feed-empty-icon">📭</div>
          <h3>No issues reported yet</h3>
          <p>Be the first to report a campus issue.</p>
        </div>
      )}

      {/* ── CARDS ── */}
      <div className="feed-list">
        {visibleIssues.map((issue) => (
          <IssueCard
            key={issue.issue_id}
            issue={issue}
            currentUser={currentUser}
            onUpvote={onUpvote}
            onCardClick={onCardClick}
            onLoginPrompt={onLoginPrompt}
            upvotedIds={upvotedIds}
          />
        ))}
      </div>

      {/* ── GUEST BLUR BANNER ── */}
      {isGuest && hiddenCount > 0 && (
        <div className="feed-guest-gate">
          <div className="feed-guest-blur" />
          <div className="feed-guest-card">
            <div className="feed-guest-icon">🔒</div>
            <h3>+{hiddenCount} more issues</h3>
            <p>Login to see all campus issues and upvote the ones that matter to you.</p>
            <button
              className="feed-guest-login-btn"
              onClick={onLoginPrompt}
            >
              Login to Continue
            </button>
          </div>
        </div>
      )}

    </div>
  );
}

export default Feed;
