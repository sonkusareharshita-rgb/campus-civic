import { useState, useRef } from "react";
import { useSwipe } from "./useSwipe";
import "./App.css";

// ─────────────────────────────────────────────
// STATUS CONFIG
// ─────────────────────────────────────────────

const STATUS_CONFIG = {
  SUBMITTED:   { label: "Submitted",   color: "#94a3b8", bg: "rgba(148,163,184,0.12)", dot: "#94a3b8" },
  PENDING:     { label: "Pending",     color: "#f59e0b", bg: "rgba(245,158,11,0.12)",  dot: "#f59e0b" },
  VERIFIED:    { label: "Verified",    color: "#8b5cf6", bg: "rgba(139,92,246,0.12)",  dot: "#8b5cf6" },
  IN_PROGRESS: { label: "In Progress", color: "#3b82f6", bg: "rgba(59,130,246,0.12)",  dot: "#3b82f6" },
  RESOLVED:    { label: "Resolved",    color: "#10b981", bg: "rgba(16,185,129,0.12)",  dot: "#10b981" },
  CLOSED:      { label: "Closed",      color: "#4b5563", bg: "rgba(75,85,99,0.12)",    dot: "#4b5563" },
  REJECTED:    { label: "Rejected",    color: "#ef4444", bg: "rgba(239,68,68,0.12)",   dot: "#ef4444" },
};

const PRIORITY_COLORS = {
  CRITICAL: "#ef4444",
  HIGH:     "#f97316",
  MEDIUM:   "#f59e0b",
  LOW:      "#6366f1",
};

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────

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

function getCategoryEmoji(cat) {
  const map = {
    Electricity: "⚡", Electrical: "⚡",
    Water: "💧", Plumbing: "💧",
    Cleanliness: "🧹", Hygiene: "🧹",
    Infrastructure: "🏗️", Construction: "🏗️",
    "Wi-Fi / Internet": "📶", Internet: "📶", WiFi: "📶",
    Security: "🔒", Safety: "🔒",
    Other: "📌",
  };
  return map[cat] || "📋";
}

// ─────────────────────────────────────────────
// ISSUE CARD
// ─────────────────────────────────────────────

const SWIPE_MAX = 80; // px

function IssueCard({
  issue,
  currentUser,
  onUpvote,
  onClick,
  onCardClick,
  onLoginPrompt,
  isUpvoted,
  upvotedIds = [],
}) {
  const status        = STATUS_CONFIG[issue.status] || STATUS_CONFIG.PENDING;
  const isServerUpvoted = currentUser && issue.supporters?.some(s => s.user_id === currentUser.user_id);
  const isLocallyUpvoted = upvotedIds.includes(issue.issue_id);
  const alreadyUpvoted = isUpvoted || isServerUpvoted || isLocallyUpvoted;
  const displayCount = Number(issue.report_count) + ((isLocallyUpvoted && !isServerUpvoted) ? 1 : 0);

  // swipe state
  const [swipeX,     setSwipeX]     = useState(0);
  const [swipeFlash, setSwipeFlash] = useState(false); // green flash on successful swipe
  const [pressed,    setPressed]    = useState(false);  // press-down scale

  const handleUpvote = (e) => {
    e?.stopPropagation?.();
    if (!currentUser) { onLoginPrompt?.(); return; }
    if (alreadyUpvoted) return;
    onUpvote?.(issue.issue_id);
  };

  // Swipe right → upvote, swipe left → (future: dismiss)
  const swipeHandlers = useSwipe({
    onSwipeRight: () => {
      if (!alreadyUpvoted) {
        setSwipeFlash(true);
        handleUpvote();
        setTimeout(() => setSwipeFlash(false), 600);
      }
      setSwipeX(0);
    },
    onSwipeLeft: () => setSwipeX(0),
    onSwipeProgress: (dx) => {
      if (alreadyUpvoted) return;
      const clamped = Math.max(-SWIPE_MAX, Math.min(SWIPE_MAX, dx));
      setSwipeX(clamped);
    },
  });

  return (
    <div
      style={{
        background: "#0f0f0f",
        color: "#fff",
        fontFamily: "Roboto, Arial, sans-serif",
        position: "relative",
        paddingBottom: "12px",
        borderBottom: "1px solid #272727"
      }}
    >
      {/* ── MEDIA (FULL WIDTH, NO ROUNDED CORNERS) ── */}
      <div
        style={{ position: "relative", width: "100%", background: "#111", display: "flex", justifyContent: "center", alignItems: "center", minHeight: (issue.image_url || issue.video_url) ? "150px" : "auto", cursor: "pointer" }}
        onDoubleClick={handleUpvote}
        onClick={() => { onCardClick?.(issue); onClick?.(issue); }}
      >
        {issue.image_url ? (
          <img
            src={`http://localhost:5000${issue.image_url}`}
            alt={issue.title}
            style={{ width: "100%", maxHeight: "300px", objectFit: "cover", display: "block" }}
          />
        ) : issue.video_url ? (
          <video
            src={`http://localhost:5000${issue.video_url}`}
            controls
            style={{ width: "100%", maxHeight: "300px", objectFit: "contain", display: "block" }}
          />
        ) : (
          <div style={{ padding: "40px 20px", textAlign: "center", width: "100%", color: "#aaa", display: "flex", flexDirection: "column", gap: "10px", alignItems: "center" }}>
            <span style={{ fontSize: "40px" }}>{getCategoryEmoji(issue.category_name)}</span>
            <p style={{ margin: 0, fontSize: "14px", lineHeight: "1.5" }}>
              {issue.description?.length > 100 ? issue.description.slice(0, 100) + "…" : issue.description}
            </p>
          </div>
        )}

        {/* STATUS PILL (YT TIMESTAMP STYLE) */}
        <div style={{
          position: "absolute", bottom: "8px", right: "8px",
          padding: "3px 6px", borderRadius: "4px", fontSize: "12px", fontWeight: "600",
          color: "#fff", background: "rgba(0, 0, 0, 0.8)",
          display: "flex", alignItems: "center", gap: "4px",
          border: `1px solid ${status.color}80`
        }}>
          <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: status.dot }} />
          {status.label}
        </div>
      </div>

      {/* ── INFO ROW (AVATAR + TITLE) ── */}
      <div style={{ display: "flex", padding: "12px 12px 0 12px", gap: "12px", alignItems: "flex-start" }}>
        
        {/* AVATAR */}
        <div style={{
          width: "40px", height: "40px", borderRadius: "50%", background: "#272727", flexShrink: 0,
          display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: "bold", fontSize: "16px"
        }}>
          {(issue.reported_by_name || "U")[0].toUpperCase()}
        </div>

        {/* DETAILS */}
        <div style={{ display: "flex", flexDirection: "column", flexGrow: 1, overflow: "hidden" }} onClick={() => { onCardClick?.(issue); onClick?.(issue); }} style={{ cursor: "pointer" }}>
          
          <h3 style={{ margin: "0 0 4px 0", fontSize: "16px", color: "#f1f1f1", fontWeight: "600", lineHeight: "1.3", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
            {issue.title}
          </h3>
          
          <div style={{ fontSize: "13px", color: "#aaaaaa", display: "flex", flexWrap: "wrap", alignItems: "center", gap: "4px" }}>
            <span>{issue.reported_by_name || "Anonymous"}</span>
            <span>•</span>
            <span>{displayCount} supports</span>
            <span>•</span>
            <span>{timeAgo(issue.created_at)}</span>
          </div>

          <div style={{ fontSize: "12px", color: "#888", marginTop: "2px" }}>
            {issue.department_name || issue.location || "Campus"} • {issue.category_name}
          </div>
          
        </div>

        {/* SHARE MENU */}
        <button 
          style={{ background: "none", border: "none", padding: "4px", cursor: "pointer", color: "#f1f1f1", flexShrink: 0 }}
          onClick={(e) => {
             e.stopPropagation();
             if (navigator.share) {
               navigator.share({ title: issue.title, url: window.location.href }).catch(err => {
                 if(err.name !== 'AbortError') {
                   navigator.clipboard.writeText(window.location.href);
                   alert("Link copied!");
                 }
               });
             } else {
               navigator.clipboard.writeText(window.location.href);
               alert("Link copied!");
             }
          }}
        >
          <svg fill="currentColor" height="24" viewBox="0 0 24 24" width="24">
            <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/>
          </svg>
        </button>

      </div>

      {/* ── ACTION BAR (BELOW TITLE) ── */}
      <div style={{ display: "flex", alignItems: "center", gap: "10px", padding: "12px 12px 0 64px", overflowX: "auto" }}>
        
        <button 
          onClick={handleUpvote}
          style={{ 
            background: alreadyUpvoted ? "rgba(255, 255, 255, 0.2)" : "rgba(255, 255, 255, 0.1)", 
            border: "none", padding: "6px 12px", borderRadius: "18px", cursor: "pointer", 
            color: "#f1f1f1", display: "flex", alignItems: "center", gap: "6px",
            transform: pressed ? "scale(0.95)" : "scale(1)", transition: "transform 0.1s ease",
            flexShrink: 0
          }}
          onMouseDown={() => setPressed(true)}
          onMouseUp={() => setPressed(false)}
          onMouseLeave={() => setPressed(false)}
          onTouchStart={() => setPressed(true)}
          onTouchEnd={() => setPressed(false)}
        >
          <svg fill={alreadyUpvoted ? "#f1f1f1" : "transparent"} stroke="currentColor" strokeWidth={alreadyUpvoted ? "0" : "2"} height="18" viewBox="0 0 24 24" width="18">
            <path stroke="none" d={alreadyUpvoted ? "M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" : ""} />
            {!alreadyUpvoted && <path d="M16.792 3.904A4.989 4.989 0 0 1 21.5 9.122c0 3.072-2.652 4.959-5.197 7.222-2.512 2.243-3.865 3.469-4.303 3.752-.477-.309-2.143-1.823-4.303-3.752C5.141 14.072 2.5 12.167 2.5 9.122a4.989 4.989 0 0 1 4.708-5.218 4.21 4.21 0 0 1 3.675 1.941c.84 1.175.98 1.543 1.117 1.543s.277-.368 1.117-1.543a4.21 4.21 0 0 1 3.675-1.941z"/>}
          </svg>
          <span style={{ fontSize: "13px", fontWeight: "500" }}>{alreadyUpvoted ? "Supported" : "Support"} • {displayCount}</span>
        </button>

        <button 
          onClick={() => { 
            onCardClick?.(issue); 
            onClick?.(issue); 
            setTimeout(() => document.querySelector(".comment-input")?.focus(), 100);
          }}
          style={{ 
            background: "rgba(255, 255, 255, 0.1)", border: "none", 
            padding: "6px 12px", borderRadius: "18px", cursor: "pointer", 
            color: "#f1f1f1", display: "flex", alignItems: "center", gap: "6px",
            flexShrink: 0
          }}
        >
          <svg fill="transparent" stroke="currentColor" strokeWidth="2" height="18" viewBox="0 0 24 24" width="18">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" strokeLinejoin="round"></path>
          </svg>
          <span style={{ fontSize: "13px", fontWeight: "500" }}>Comment</span>
        </button>
      </div>

    </div>
  );
}

export default IssueCard;
