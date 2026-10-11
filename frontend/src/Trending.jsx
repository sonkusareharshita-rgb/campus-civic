import { useEffect, useState } from "react";
import IssueCard from "./IssueCard";
import "./App.css";

const API = "http://localhost:5000";

function Trending({ currentUser, onCardClick, onLoginPrompt, onUpvote, upvotedIds }) {
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

  return (
    <div className="feed-page" style={{ padding: 0, gap: 0, background: "#000" }}>
      {/* ── HEADER ── */}
      <div style={{ padding: "16px", background: "#0f0f0f", borderBottom: "1px solid #272727" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{ fontSize: "20px" }}>🔥</span>
          <span className="feed-logo">Trending Now</span>
        </div>
        <div style={{ color: "#aaa", fontSize: "12px", marginTop: "4px" }}>
          Sorted by upvote velocity — fastest rising issues
        </div>
      </div>

      {loading ? (
        <div className="feed-loading" style={{ paddingTop: "40px" }}>
          <div className="feed-spinner" />
          <p>Loading trending issues…</p>
        </div>
      ) : issues.length === 0 ? (
        <div className="feed-empty" style={{ paddingTop: "40px" }}>
          <div className="feed-empty-icon">📭</div>
          <h3>No trending issues</h3>
          <p>Be the first to report something — it might go trending!</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", paddingBottom: "80px" }}>
          {issues.map((issue, idx) => {
            const velocity = parseFloat(issue.velocity || 0).toFixed(1);
            return (
              <IssueCard
                key={issue.issue_id}
                issue={issue}
                currentUser={currentUser}
                onCardClick={onCardClick}
                onUpvote={onUpvote}
                onLoginPrompt={onLoginPrompt}
                upvotedIds={upvotedIds}
                trendingData={{ rank: idx + 1, velocity }}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

export default Trending;
