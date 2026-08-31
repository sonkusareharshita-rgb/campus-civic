import { useState, useEffect } from "react";
import IssueCard from "./IssueCard";
import "./App.css";

const CATEGORIES = [
  "All",
  "Electricity",
  "Water",
  "Cleanliness",
  "Infrastructure",
  "Wi-Fi / Internet",
  "Security",
  "Other",
];

const STATUSES = [
  { value: "ALL",         label: "All Status"   },
  { value: "PENDING",     label: "Pending"       },
  { value: "IN_PROGRESS", label: "In Progress"   },
  { value: "RESOLVED",    label: "Resolved"      },
];

function Explore({ currentUser, onCardClick, onUpvote, onLoginPrompt, upvotedIds }) {
  const [issues, setIssues]         = useState([]);
  const [loading, setLoading]       = useState(true);
  const [search, setSearch]         = useState("");
  const [category, setCategory]     = useState("All");
  const [status, setStatus]         = useState("ALL");

  useEffect(() => { fetchIssues(); }, []);

  async function fetchIssues() {
    setLoading(true);
    try {
      const res  = await fetch("http://localhost:5000/api/issues/all");
      const data = await res.json();
      setIssues(data.issues || []);
    } catch {
      setIssues([]);
    } finally {
      setLoading(false);
    }
  }

  // ── FILTER ───────────────────────────────────
  const filtered = issues.filter((issue) => {
    const matchSearch =
      !search ||
      issue.title?.toLowerCase().includes(search.toLowerCase()) ||
      issue.description?.toLowerCase().includes(search.toLowerCase()) ||
      issue.location?.toLowerCase().includes(search.toLowerCase());

    const matchCat =
      category === "All" || issue.category_name === category;

    const matchStatus =
      status === "ALL" || issue.status === status;

    return matchSearch && matchCat && matchStatus;
  });

  return (
    <div className="feed-page explore-page">

      {/* ── SEARCH BAR ── */}
      <div className="explore-search-wrap">
        <span className="explore-search-icon">🔍</span>
        <input
          className="explore-search"
          type="text"
          placeholder="Search issues, locations…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        {search && (
          <button className="explore-clear" onClick={() => setSearch("")}>✕</button>
        )}
      </div>

      {/* ── CATEGORY CHIPS ── */}
      <div className="explore-chips">
        {CATEGORIES.map((c) => (
          <button
            key={c}
            className={`explore-chip ${category === c ? "active" : ""}`}
            onClick={() => setCategory(c)}
          >
            {c}
          </button>
        ))}
      </div>

      {/* ── STATUS TABS ── */}
      <div className="explore-status-tabs">
        {STATUSES.map((s) => (
          <button
            key={s.value}
            className={`explore-status-tab ${status === s.value ? "active" : ""}`}
            onClick={() => setStatus(s.value)}
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* ── RESULTS COUNT ── */}
      <div className="explore-count">
        {loading ? "Loading…" : `${filtered.length} issue${filtered.length !== 1 ? "s" : ""} found`}
      </div>

      {/* ── CARDS ── */}
      {loading ? (
        <div className="feed-loading">
          <div className="feed-spinner" />
          <p>Loading…</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="feed-empty">
          <div className="feed-empty-icon">🔎</div>
          <h3>No issues found</h3>
          <p>Try a different search or filter.</p>
        </div>
      ) : (
        <div className="feed-list">
          {filtered.map((issue) => (
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
      )}

    </div>
  );
}

export default Explore;
