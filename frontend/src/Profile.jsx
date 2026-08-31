import { useState, useEffect } from "react";
import IssueCard from "./IssueCard";
import "./App.css";

const STATUS_CONFIG = {
  PENDING:     { label: "Pending",     color: "#f59e0b", bg: "rgba(245,158,11,0.12)"  },
  IN_PROGRESS: { label: "In Progress", color: "#3b82f6", bg: "rgba(59,130,246,0.12)"  },
  RESOLVED:    { label: "Resolved",    color: "#10b981", bg: "rgba(16,185,129,0.12)"  },
};

function Profile({
  currentUser,
  onLogout,
  onCardClick,
  onUpvote,
  onLoginPrompt,
  upvotedIds = [],
}) {
  const [myIssues,    setMyIssues]    = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [activeTab,   setActiveTab]   = useState("reported");

  useEffect(() => { fetchMyIssues(); }, [currentUser]);

  async function fetchMyIssues() {
    if (!currentUser) return;
    setLoading(true);
    try {
      const res  = await fetch("http://localhost:5000/api/issues/all");
      const data = await res.json();
      const all  = data.issues || [];

      // Filter by current user
      const mine = all.filter(
        (i) => String(i.reported_by) === String(currentUser.user_id)
      );
      setMyIssues(mine);
    } catch {
      setMyIssues([]);
    } finally {
      setLoading(false);
    }
  }

  // ── STATS ───────────────────────────────────
  const totalReported  = myIssues.length;
  const totalResolved  = myIssues.filter((i) => i.status === "RESOLVED").length;
  const totalPending   = myIssues.filter((i) => i.status === "PENDING").length;
  const totalProgress  = myIssues.filter((i) => i.status === "IN_PROGRESS").length;

  const supported = upvotedIds.length;

  // ── TAB CONTENT ─────────────────────────────
  const displayName =
    currentUser?.name || currentUser?.full_name || "User";

  const initials = displayName
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const roleLabel =
    currentUser?.role === "FACULTY" ? "Faculty" :
    currentUser?.role === "ADMIN"   ? "Admin"   : "Student";

  // Issues shown in "My Issues" tab
  const tabIssues = activeTab === "reported" ? myIssues : [];

  return (
    <div className="profile-page">

      {/* ── AVATAR & NAME ── */}
      <div className="profile-hero">
        <div className="profile-avatar">{initials}</div>

        <div className="profile-info">
          <h2 className="profile-name">{displayName}</h2>
          <div className="profile-role-badge">{roleLabel}</div>
          <p className="profile-email">{currentUser?.email}</p>
        </div>

        <button className="profile-logout-btn" onClick={onLogout}>
          Logout
        </button>
      </div>

      {/* ── STATS ROW ── */}
      <div className="profile-stats">
        <div className="profile-stat">
          <strong>{totalReported}</strong>
          <span>Reported</span>
        </div>
        <div className="profile-stat-divider" />
        <div className="profile-stat">
          <strong>{totalResolved}</strong>
          <span>Resolved</span>
        </div>
        <div className="profile-stat-divider" />
        <div className="profile-stat">
          <strong>{totalPending}</strong>
          <span>Pending</span>
        </div>
        <div className="profile-stat-divider" />
        <div className="profile-stat">
          <strong>{supported}</strong>
          <span>Supported</span>
        </div>
      </div>

      {/* ── TABS ── */}
      <div className="profile-tabs">
        <button
          className={`profile-tab ${activeTab === "reported" ? "active" : ""}`}
          onClick={() => setActiveTab("reported")}
        >
          📋 My Issues
        </button>
        <button
          className={`profile-tab ${activeTab === "supported" ? "active" : ""}`}
          onClick={() => setActiveTab("supported")}
        >
          ▲ Supported
        </button>
      </div>

      {/* ── TAB CONTENT ── */}
      <div className="profile-feed">
        {loading ? (
          <div className="feed-loading">
            <div className="feed-spinner" />
            <p>Loading your issues…</p>
          </div>
        ) : activeTab === "reported" ? (
          myIssues.length === 0 ? (
            <div className="feed-empty">
              <div className="feed-empty-icon">📭</div>
              <h3>No issues reported yet</h3>
              <p>Tap + to report your first campus issue.</p>
            </div>
          ) : (
            myIssues.map((issue) => (
              <IssueCard
                key={issue.issue_id}
                issue={issue}
                currentUser={currentUser}
                onUpvote={onUpvote}
                onCardClick={onCardClick}
                onLoginPrompt={onLoginPrompt}
                upvotedIds={upvotedIds}
              />
            ))
          )
        ) : (
          /* Supported tab */
          upvotedIds.length === 0 ? (
            <div className="feed-empty">
              <div className="feed-empty-icon">▲</div>
              <h3>No supported issues yet</h3>
              <p>Upvote issues in the feed to support them.</p>
            </div>
          ) : (
            <div className="feed-empty">
              <p>You have supported {upvotedIds.length} issue{upvotedIds.length !== 1 ? "s" : ""}.</p>
            </div>
          )
        )}
      </div>

    </div>
  );
}

export default Profile;
