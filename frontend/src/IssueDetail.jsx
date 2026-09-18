import { useState, useEffect } from "react";
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
  APPROVED:    { label: "Approved",    color: "#8b5cf6", bg: "rgba(139,92,246,0.12)" },
  REJECTED:    { label: "Rejected",    color: "#ef4444", bg: "rgba(239,68,68,0.12)" },
};

function timeAgo(dateString) {
  const now  = new Date();
  const past = new Date(dateString);
  const diff = Math.floor((now - past) / 1000);

  if (diff < 60)     return "just now";
  if (diff < 3600)   return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400)  return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;

  return past.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
  });
}

function IssueDetail({
  issue,
  currentUser,
  onBack,
  onUpvote,
  onLoginPrompt,
  upvotedIds = [],
}) {
  const statusConf     = STATUS_CONFIG[issue.status] || STATUS_CONFIG.PENDING;
  const alreadyUpvoted = upvotedIds.includes(issue.issue_id);
  const currentStepIdx = STATUS_ORDER.indexOf(issue.status);

  // ── COMMENTS STATE ────────────────────────────────
  const [comments, setComments] = useState([]);
  const [commentText, setCommentText] = useState("");
  const [loadingComments, setLoadingComments] = useState(true);
  const [postingComment, setPostingComment] = useState(false);

  // ── FEEDBACK STATE ────────────────────────────────
  const [feedbackRating, setFeedbackRating] = useState(0);
  const [feedbackComment, setFeedbackComment] = useState("");
  const [feedbackExists, setFeedbackExists] = useState(false);
  const [feedbackLoading, setFeedbackLoading] = useState(false);
  const [feedbackSubmitting, setFeedbackSubmitting] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState("");

  // ── FETCH COMMENTS ────────────────────────────────
  useEffect(() => {
    async function fetchComments() {
      setLoadingComments(true);

      try {
        const res = await fetch(
          `http://localhost:5000/api/issues/${issue.issue_id}/comments`
        );

        const data = await res.json();

        if (res.ok) {
          setComments(data.comments || []);
        }
      } catch {
        // silently fail — comments are supplementary
      } finally {
        setLoadingComments(false);
      }
    }

    fetchComments();
  }, [issue.issue_id]);

  // ── FETCH EXISTING FEEDBACK ───────────────────────
  useEffect(() => {
    async function fetchFeedback() {
      if (!currentUser?.user_id || issue.status !== "RESOLVED") {
        setFeedbackExists(false);
        return;
      }

      setFeedbackLoading(true);

      try {
        const res = await fetch(
          `http://localhost:5000/api/issues/${issue.issue_id}/feedback/${currentUser.user_id}`
        );

        const data = await res.json();

        if (res.ok && data.exists) {
          setFeedbackExists(true);

          if (data.feedback) {
            setFeedbackRating(Number(data.feedback.rating) || 0);
            setFeedbackComment(data.feedback.comment || "");
          }
        } else {
          setFeedbackExists(false);
        }
      } catch {
        setFeedbackExists(false);
      } finally {
        setFeedbackLoading(false);
      }
    }

    fetchFeedback();
  }, [issue.issue_id, issue.status, currentUser?.user_id]);

  // ── UPVOTE ─────────────────────────────────────────
  const handleUpvote = () => {
    if (!currentUser) {
      onLoginPrompt?.();
      return;
    }

    if (alreadyUpvoted) return;

    onUpvote?.(issue.issue_id);
  };

  // ── POST COMMENT ──────────────────────────────────
  const handlePostComment = async (e) => {
    e.preventDefault();

    if (!currentUser) {
      onLoginPrompt?.();
      return;
    }

    if (!commentText.trim()) return;

    setPostingComment(true);

    try {
      const res = await fetch(
        `http://localhost:5000/api/issues/${issue.issue_id}/comments`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            user_id: currentUser.user_id,
            comment: commentText.trim(),
          }),
        }
      );

      const data = await res.json();

      if (res.ok) {
        setComments((prev) => [...prev, data.comment]);
        setCommentText("");
      }
    } catch {
      // fail silently
    } finally {
      setPostingComment(false);
    }
  };

  // ── SUBMIT FEEDBACK ───────────────────────────────
  const handleSubmitFeedback = async (e) => {
    e.preventDefault();

    if (!currentUser) {
      onLoginPrompt?.();
      return;
    }

    if (!feedbackRating) {
      setFeedbackMessage("Please select a rating.");
      return;
    }

    setFeedbackSubmitting(true);
    setFeedbackMessage("");

    try {
      const res = await fetch(
        `http://localhost:5000/api/issues/${issue.issue_id}/feedback`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            user_id: currentUser.user_id,
            rating: feedbackRating,
            comment: feedbackComment.trim(),
          }),
        }
      );

      const data = await res.json();

      if (res.ok) {
        setFeedbackExists(true);
        setFeedbackMessage(
          data.message || "Thank you for your feedback!"
        );
      } else {
        setFeedbackMessage(
          data.message || "Unable to submit feedback."
        );
      }
    } catch {
      setFeedbackMessage(
        "Unable to submit feedback. Please try again."
      );
    } finally {
      setFeedbackSubmitting(false);
    }
  };

  const roleLabel = (role) => {
    if (role === "FACULTY") return "Faculty";
    if (role === "ADMIN") return "Admin";
    return "Student";
  };

  return (
    <div className="detail-page">

      {/* ── BACK HEADER ── */}
      <div className="detail-header">
        <button
          className="detail-back"
          onClick={onBack}
          aria-label="Go back"
        >
          ←
        </button>

        <span className="detail-header-title">
          Issue Details
        </span>

        <div
          className="detail-status-badge"
          style={{
            color: statusConf.color,
            background: statusConf.bg,
          }}
        >
          {statusConf.label}
        </div>
      </div>

      {/* ── IMAGE ── */}
      {issue.image_url && (
        <div className="detail-image-wrap">
          <img
            src={issue.image_url}
            alt={issue.title}
            className="detail-image"
          />
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

        <h1 className="detail-title">
          {issue.title}
        </h1>

        {/* Meta */}
        <div className="detail-meta">
          <span>📍 {issue.location}</span>

          <span>
            👤 {issue.reported_by_name || "Anonymous"}
          </span>

          <span>
            🕐 {timeAgo(issue.created_at)}
          </span>
        </div>

        <p className="detail-desc">
          {issue.description}
        </p>

        {/* ── UPVOTE ── */}
        <button
          className={`detail-upvote-btn ${
            alreadyUpvoted ? "upvoted" : ""
          }`}
          onClick={handleUpvote}
        >
          <span>▲</span>

          <span>
            {Number(issue.report_count) || 0} Support
            {(Number(issue.report_count) || 0) !== 1 ? "s" : ""}
          </span>

          {alreadyUpvoted && (
            <span className="detail-upvoted-badge">
              ✓ You supported this
            </span>
          )}
        </button>

        {/* ── STATUS TIMELINE ── */}
        <div className="detail-timeline">
          <h3 className="detail-section-title">
            Progress
          </h3>

          <div className="timeline-steps">
            {STATUS_STEPS.map((step, idx) => {
              const done = idx <= currentStepIdx;
              const current = idx === currentStepIdx;

              return (
                <div
                  key={step.key}
                  className={`timeline-step ${
                    done ? "done" : ""
                  } ${current ? "current" : ""}`}
                >
                  <div className="timeline-icon-wrap">
                    <div className="timeline-icon">
                      {step.icon}
                    </div>

                    {idx < STATUS_STEPS.length - 1 && (
                      <div
                        className={`timeline-line ${
                          done && idx < currentStepIdx
                            ? "done"
                            : ""
                        }`}
                      />
                    )}
                  </div>

                  <span className="timeline-label">
                    {step.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── RESOLUTION NOTE + PROOF ── */}
        {issue.status === "RESOLVED" && (
          <div className="detail-resolution">

            <h3 className="detail-section-title">
              Resolution
            </h3>

            {issue.resolution_note && (
              <p>{issue.resolution_note}</p>
            )}

            {issue.resolution_image_url && (
              <img
                src={
  issue.resolution_image_url
    ? `http://localhost:5000${issue.resolution_image_url}`
    : ""
}
                alt="Resolution proof"
                className="detail-resolution-img"
              />
            )}

            {!issue.resolution_note &&
              !issue.resolution_image_url && (
                <p>
                  This issue has been marked as resolved.
                </p>
              )}
          </div>
        )}

        {/* ── FEEDBACK ── */}
        {issue.status === "RESOLVED" && currentUser && (
          <div className="detail-resolution">

            <h3 className="detail-section-title">
              {feedbackExists
                ? "Your Feedback"
                : "Share Your Feedback"}
            </h3>

            {feedbackLoading ? (
              <div className="comments-loading">
                Checking feedback…
              </div>
            ) : (
              <form onSubmit={handleSubmitFeedback}>

                {/* Rating */}
                <div
  style={{
    display: "flex",
    gap: "6px",
    alignItems: "center",
  }}
>
  {[1, 2, 3, 4, 5].map((star) => (
    <button
      key={star}
      type="button"
      onClick={() => {
        if (!feedbackExists) {
          setFeedbackRating(star);
          setFeedbackMessage("");
        }
      }}
      disabled={feedbackExists}
      aria-label={`${star} star`}
      style={{
        border: "none",
        background: "transparent",
        cursor: feedbackExists ? "default" : "pointer",
        fontSize: "28px",
        padding: "2px",

        /* ⭐ Selected stars yellow */
        color: feedbackRating >= star ? "#FFD700" : "#555",

        opacity: feedbackRating >= star ? 1 : 0.35,
      }}
    >
      ★
    </button>
  ))}
</div>

                {/* Comment */}
                <textarea
                  className="comment-input"
                  placeholder="Tell us about the resolution…"
                  value={feedbackComment}
                  onChange={(e) => {
                    if (!feedbackExists) {
                      setFeedbackComment(e.target.value);
                    }
                  }}
                  disabled={feedbackExists}
                  rows={3}
                  maxLength={500}
                  style={{
                    width: "100%",
                    resize: "vertical",
                    marginBottom: "8px",
                  }}
                />

                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: "10px",
                  }}
                >
                  <span
                    style={{
                      fontSize: "12px",
                      opacity: 0.6,
                    }}
                  >
                    {feedbackComment.length}/500
                  </span>

                  {!feedbackExists && (
                    <button
                      type="submit"
                      className="comment-submit-btn"
                      disabled={
                        feedbackSubmitting || !feedbackRating
                      }
                    >
                      {feedbackSubmitting
                        ? "Submitting…"
                        : "Submit Feedback"}
                    </button>
                  )}
                </div>

                {feedbackMessage && (
                  <p
                    style={{
                      marginTop: "10px",
                      fontSize: "13px",
                      color: feedbackMessage
                        .toLowerCase()
                        .includes("unable")
                        ? "#ef4444"
                        : "#10b981",
                    }}
                  >
                    {feedbackMessage}
                  </p>
                )}
              </form>
            )}
          </div>
        )}

        {/* ── COMMENTS ── */}
        <div className="detail-comments">

          <h3 className="detail-section-title">
            Comments

            {comments.length > 0 && (
              <span className="comments-count">
                {comments.length}
              </span>
            )}
          </h3>

          {/* Comment list */}
          {loadingComments ? (
            <div className="comments-loading">
              Loading comments…
            </div>
          ) : comments.length === 0 ? (
            <div className="comments-empty">
              <span>💬</span>
              <p>
                No comments yet. Be the first to add
                context or an update.
              </p>
            </div>
          ) : (
            <div className="comments-list">
              {comments.map((c) => (
                <div
                  key={c.comment_id}
                  className="comment-item"
                >
                  <div className="comment-avatar">
                    {(c.commenter_name || "?")[0].toUpperCase()}
                  </div>

                  <div className="comment-body">

                    <div className="comment-header">

                      <strong className="comment-name">
                        {c.commenter_name}
                      </strong>

                      <span
                        className="comment-role-badge"
                        data-role={c.commenter_role}
                      >
                        {roleLabel(c.commenter_role)}
                      </span>

                      <span className="comment-time">
                        {timeAgo(c.created_at)}
                      </span>

                    </div>

                    <p className="comment-text">
                      {c.comment}
                    </p>

                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Post a comment */}
          {currentUser ? (
            <form
              className="comment-form"
              onSubmit={handlePostComment}
            >
              <div className="comment-input-wrap">

                <div className="comment-form-avatar">
                  {(currentUser.name || "?")[0].toUpperCase()}
                </div>

                <textarea
                  className="comment-input"
                  placeholder="Add a comment…"
                  value={commentText}
                  onChange={(e) =>
                    setCommentText(e.target.value)
                  }
                  rows={2}
                  maxLength={500}
                />

              </div>

              <div className="comment-form-actions">

                <span className="comment-char-count">
                  {commentText.length}/500
                </span>

                <button
                  type="submit"
                  className="comment-submit-btn"
                  disabled={
                    !commentText.trim() || postingComment
                  }
                >
                  {postingComment
                    ? "Posting…"
                    : "Post Comment"}
                </button>

              </div>
            </form>
          ) : (
            <button
              className="comment-login-prompt"
              onClick={() => onLoginPrompt?.()}
            >
              🔐 Login to add a comment
            </button>
          )}

        </div>

      </div>
    </div>
  );
}

export default IssueDetail;