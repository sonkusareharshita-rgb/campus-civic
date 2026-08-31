import "./App.css";

// ─────────────────────────────────────────────
// STATUS CONFIG
// ─────────────────────────────────────────────

const STATUS_CONFIG = {
  PENDING: {
    label: "Pending",
    color: "#f59e0b",
    bg: "rgba(245,158,11,0.12)",
    dot: "#f59e0b",
  },
  IN_PROGRESS: {
    label: "In Progress",
    color: "#3b82f6",
    bg: "rgba(59,130,246,0.12)",
    dot: "#3b82f6",
  },
  RESOLVED: {
    label: "Resolved",
    color: "#10b981",
    bg: "rgba(16,185,129,0.12)",
    dot: "#10b981",
  },
};

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────

function timeAgo(dateString) {
  const now = new Date();
  const past = new Date(dateString);
  const diff = Math.floor((now - past) / 1000);

  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return past.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

function getCategoryEmoji(cat) {
  const map = {
    Electricity: "⚡",
    Electrical: "⚡",
    Water: "💧",
    Plumbing: "💧",
    Cleanliness: "🧹",
    Infrastructure: "🏗️",
    "Wi-Fi / Internet": "📶",
    Internet: "📶",
    Security: "🔒",
    HVAC: "❄️",
    IT: "💻",
    Other: "📌",
  };
  return map[cat] || "📌";
}

// ─────────────────────────────────────────────
// ISSUE CARD
// ─────────────────────────────────────────────

function IssueCard({
  issue,
  currentUser,
  onUpvote,
  onCardClick,
  onLoginPrompt,
  upvotedIds = [],
}) {
  const status = STATUS_CONFIG[issue.status] || STATUS_CONFIG.PENDING;
  const alreadyUpvoted = upvotedIds.includes(issue.issue_id);

  const handleUpvote = (e) => {
    e.stopPropagation();

    if (!currentUser) {
      onLoginPrompt?.();
      return;
    }

    if (alreadyUpvoted) return;

    onUpvote?.(issue.issue_id);
  };

  return (
    <div
      className="issue-card"
      onClick={() => onCardClick?.(issue)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === "Enter" && onCardClick?.(issue)}
    >
      {/* ── HEADER ── */}
      <div className="issue-card-header">
        <div className="issue-card-avatar">
          {(issue.reported_by_name || "U")[0].toUpperCase()}
        </div>

        <div className="issue-card-meta">
          <span className="issue-card-reporter">
            {issue.reported_by_name || "Anonymous"}
          </span>
          <span className="issue-card-time">
            📍 {issue.location} · {timeAgo(issue.created_at)}
          </span>
        </div>

        {/* STATUS PILL */}
        <div
          className="issue-status-pill"
          style={{ color: status.color, background: status.bg }}
        >
          <span
            className="status-dot"
            style={{ background: status.dot }}
          />
          {status.label}
        </div>
      </div>

      {/* ── IMAGE ── */}
      {issue.image_url && (
        <div className="issue-card-image-wrap">
          <img
            src={issue.image_url}
            alt={issue.title}
            className="issue-card-image"
          />
        </div>
      )}

      {/* ── BODY ── */}
      <div className="issue-card-body">
        {/* Category tag */}
        <div className="issue-category-tag">
          <span>{getCategoryEmoji(issue.category_name)}</span>
          <span>{issue.category_name || "General"}</span>
        </div>

        <h3 className="issue-card-title">{issue.title}</h3>

        <p className="issue-card-desc">
          {issue.description?.length > 120
            ? issue.description.slice(0, 120) + "…"
            : issue.description}
        </p>
      </div>

      {/* ── FOOTER ── */}
      <div className="issue-card-footer">
        {/* UPVOTE */}
        <button
          className={`upvote-btn ${alreadyUpvoted ? "upvoted" : ""}`}
          onClick={handleUpvote}
          aria-label="Upvote this issue"
        >
          <span className="upvote-arrow">▲</span>
          <span className="upvote-count">
            {Number(issue.report_count) || 0}
          </span>
          <span className="upvote-label">
            {alreadyUpvoted ? "Supported" : "Support"}
          </span>
        </button>

        <span className="issue-card-dept">
          {issue.department_name || ""}
        </span>
      </div>
    </div>
  );
}

export default IssueCard;
