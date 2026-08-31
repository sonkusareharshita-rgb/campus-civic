import "./App.css";

const STATUS_STEPS = [
  { key: "PENDING",     label: "Reported",    icon: "📝" },
  { key: "APPROVED",    label: "Approved",    icon: "✅" },
  { key: "IN_PROGRESS", label: "In Progress", icon: "🔧" },
  { key: "RESOLVED",    label: "Resolved",    icon: "🎉" },
];

const STATUS_ORDER = ["PENDING", "APPROVED", "IN_PROGRESS", "RESOLVED"];

const STATUS_CONFIG = {
  PENDING:     { label: "Pending",     color: "#f59e0b", bg: "rgba(245,158,11,0.12)" },
  IN_PROGRESS: { label: "In Progress", color: "#3b82f6", bg: "rgba(59,130,246,0.12)" },
  RESOLVED:    { label: "Resolved",    color: "#10b981", bg: "rgba(16,185,129,0.12)" },
};

function timeAgo(dateString) {
  const now  = new Date();
  const past = new Date(dateString);
  const diff = Math.floor((now - past) / 1000);
  if (diff < 60)     return "just now";
  if (diff < 3600)   return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400)  return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return past.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

function IssueDetail({
  issue,
  currentUser,
  onBack,
  onUpvote,
  onLoginPrompt,
  upvotedIds = [],
}) {
  const statusConf      = STATUS_CONFIG[issue.status] || STATUS_CONFIG.PENDING;
  const alreadyUpvoted  = upvotedIds.includes(issue.issue_id);
  const currentStepIdx  = STATUS_ORDER.indexOf(issue.status);

  const handleUpvote = () => {
    if (!currentUser) { onLoginPrompt?.(); return; }
    if (alreadyUpvoted) return;
    onUpvote?.(issue.issue_id);
  };

  return (
    <div className="detail-page">

      {/* ── BACK HEADER ── */}
      <div className="detail-header">
        <button className="detail-back" onClick={onBack} aria-label="Go back">
          ←
        </button>
        <span className="detail-header-title">Issue Details</span>
        <div
          className="detail-status-badge"
          style={{ color: statusConf.color, background: statusConf.bg }}
        >
          {statusConf.label}
        </div>
      </div>

      {/* ── IMAGE ── */}
      {issue.image_url && (
        <div className="detail-image-wrap">
          <img src={issue.image_url} alt={issue.title} className="detail-image" />
        </div>
      )}

      {/* ── MAIN CONTENT ── */}
      <div className="detail-content">

        {/* Tags row */}
        <div className="detail-tags">
          <span className="detail-tag detail-tag-cat">
            {issue.category_name || "General"}
          </span>
          {issue.department_name && (
            <span className="detail-tag detail-tag-dept">
              {issue.department_name}
            </span>
          )}
        </div>

        <h1 className="detail-title">{issue.title}</h1>

        {/* Meta */}
        <div className="detail-meta">
          <span>📍 {issue.location}</span>
          <span>👤 {issue.reported_by_name || "Anonymous"}</span>
          <span>🕐 {timeAgo(issue.created_at)}</span>
        </div>

        <p className="detail-desc">{issue.description}</p>

        {/* ── UPVOTE ── */}
        <button
          className={`detail-upvote-btn ${alreadyUpvoted ? "upvoted" : ""}`}
          onClick={handleUpvote}
        >
          <span>▲</span>
          <span>{Number(issue.report_count) || 0} Support{(Number(issue.report_count) || 0) !== 1 ? "s" : ""}</span>
          {alreadyUpvoted && <span className="detail-upvoted-badge">✓ You supported this</span>}
        </button>

        {/* ── STATUS TIMELINE ── */}
        <div className="detail-timeline">
          <h3 className="detail-section-title">Progress</h3>
          <div className="timeline-steps">
            {STATUS_STEPS.map((step, idx) => {
              const done    = idx <= currentStepIdx;
              const current = idx === currentStepIdx;
              return (
                <div key={step.key} className={`timeline-step ${done ? "done" : ""} ${current ? "current" : ""}`}>
                  <div className="timeline-icon-wrap">
                    <div className="timeline-icon">{step.icon}</div>
                    {idx < STATUS_STEPS.length - 1 && (
                      <div className={`timeline-line ${done && idx < currentStepIdx ? "done" : ""}`} />
                    )}
                  </div>
                  <span className="timeline-label">{step.label}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── RESOLUTION NOTE ── */}
        {issue.status === "RESOLVED" && issue.resolution_note && (
          <div className="detail-resolution">
            <h3 className="detail-section-title">Resolution Note</h3>
            <p>{issue.resolution_note}</p>
            {issue.resolution_image_url && (
              <img
                src={issue.resolution_image_url}
                alt="Resolution proof"
                className="detail-resolution-img"
              />
            )}
          </div>
        )}

      </div>
    </div>
  );
}

export default IssueDetail;
