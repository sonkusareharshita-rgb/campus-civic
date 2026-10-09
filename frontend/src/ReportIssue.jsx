import { useEffect, useState } from "react";
import "./App.css";

const LOCATIONS = [
  "Main Building",
  "Library",
  "Block A",
  "Block B",
  "Block C",
  "Computer Lab",
  "Canteen",
  "Auditorium",
  "Sports Ground",
  "Hostel Block",
  "Admin Office",
  "Parking Area",
  "Other",
];

const CATEGORIES = [
  { id: 1, name: "Electricity", emoji: "⚡" },
  { id: 2, name: "Water", emoji: "💧" },
  { id: 3, name: "Cleanliness", emoji: "🧹" },
  { id: 4, name: "Infrastructure", emoji: "🏗️" },
  { id: 5, name: "Wi-Fi / Internet", emoji: "📶" },
  { id: 6, name: "Security", emoji: "🔒" },
  { id: 7, name: "Other", emoji: "📌" },
];

function ReportIssue({ user, onBack, onSuccess, onIssueClick }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [extraDetail, setExtraDetail] = useState("");
  const [categoryId, setCategoryId] = useState(null);
  const [visibility, setVisibility] = useState("PUBLIC");
  const [isAnonymous, setIsAnonymous] = useState(false);

  const [image, setImage] = useState(null);
  const [video, setVideo] = useState(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // =========================================================
  // DUPLICATE CHECK STATES
  // =========================================================

  const [duplicateIssue, setDuplicateIssue] = useState(null);
  const [aiChecking, setAiChecking]         = useState(false);
  const [aiChecked, setAiChecked]           = useState(false);
  const [forwarding, setForwarding]         = useState(false);

  // ── Post-submit success screen ─────────────────────────────────
  const [submitted, setSubmitted]           = useState(false);   // show success screen
  const [submittedIssue, setSubmittedIssue] = useState(null);    // the newly created issue
  const [similarScanning, setSimilarScanning] = useState(false); // AI scanning after post
  const [similarAfterPost, setSimilarAfterPost] = useState(null); // { found: bool, issues: [] }

  // ── AI Quality Gate ───────────────────────────────────────
  const [aiValidation, setAiValidation]     = useState(null);   // { isValid, issues[], suggestion }
  const [aiValidating, setAiValidating]     = useState(false);

  // ── AI Live Suggestions (student-facing: category + quality only) ─────
  const [aiCategorySuggestion, setAiCategorySuggestion] = useState(null); // { categoryName, confidence }
  const [aiSentiment, setAiSentiment]                   = useState(null); // { sentiment, urgencyFlag }

  // =========================================================
  // FILE HANDLERS
  // =========================================================

  const handleImageChange = (e) => {
    const file = e.target.files?.[0];

    if (!file) return;

    setImage(file);
  };

  const handleVideoChange = (e) => {
    const file = e.target.files?.[0];

    if (!file) return;

    setVideo(file);
  };

  // =========================================================
  // FULL LOCATION
  // =========================================================

  const getFullLocation = () => {
    return extraDetail.trim()
      ? `${location} — ${extraDetail.trim()}`
      : location;
  };

  // =========================================================
  // AUTOMATIC AI DUPLICATE CHECK
  // =========================================================

  useEffect(() => {
    console.log("[DUPLICATE] Checking fields:", {
      categoryId,
      title,
      description,
      location,
      extraDetail,
    });

    // Required fields complete nahi hain
    if (
      !categoryId ||
      !title.trim() ||
      !description.trim() ||
      !location
    ) {
      setDuplicateIssue(null);
      setAiChecked(false);
      setAiChecking(false);
      return;
    }

    // User typing stop karne ke 700ms baad check hoga
    const timer = setTimeout(async () => {
      setAiChecking(true);
      setAiChecked(false);
      setDuplicateIssue(null);
      setError(null);

      try {
        const fullLocation = getFullLocation();

        console.log(
          "[AI] Sending duplicate check request..."
        );

        const response = await fetch(
          "http://localhost:5000/api/issues/analyze",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              title: title.trim(),
              description: description.trim(),
              location: fullLocation,
            }),
          }
        );

        const data = await response.json();

        console.log(
          "[AI] Duplicate check response:",
          data
        );

        if (!response.ok) {
          throw new Error(
            data.message ||
              "Duplicate check failed"
          );
        }

        // =====================================================
        // DUPLICATE FOUND
        // =====================================================

        if (
          data.duplicate_check?.isDuplicate === true &&
          data.existing_issue
        ) {
          console.log(
            "[AI] DUPLICATE FOUND:",
            data.existing_issue
          );

          setDuplicateIssue(
            data.existing_issue
          );
        }

        // =====================================================
        // NO DUPLICATE
        // =====================================================

        else {
          console.log(
            "[AI] NO DUPLICATE FOUND"
          );

          setDuplicateIssue(null);
        }

        setAiChecked(true);

      } catch (err) {
        console.error(
          "[AI] Duplicate check error:",
          err
        );

        /*
         * Agar AI API fail hoti hai to user ko false
         * duplicate nahi dikhayenge.
         *
         * Backend /api/issues me bhi duplicate safety
         * check already hai.
         */

        setDuplicateIssue(null);
        setAiChecked(true);

      } finally {
        setAiChecking(false);
      }
    }, 700);

    return () => clearTimeout(timer);

  }, [
    categoryId,
    title,
    description,
    location,
    extraDetail,
  ]);

  // =========================================================
  // AI LIVE SUGGESTIONS (debounced — fires 800ms after typing stops)
  // =========================================================

  useEffect(() => {
    const hasEnoughContent = title.trim().length > 10 && description.trim().length > 20;
    if (!hasEnoughContent) {
      setAiCategorySuggestion(null);
      setAiSentiment(null);
      setAiValidation(null);
      return;
    }

    const timer = setTimeout(async () => {
      const body = { title: title.trim(), description: description.trim() };

      // Run in parallel — category + sentiment + quality gate
      const [catRes, sentRes, valRes] = await Promise.allSettled([
        fetch("http://localhost:5000/api/ai/category-suggest", {
          method:  "POST",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify(body),
        }).then(r => r.json()).catch(() => null),

        fetch("http://localhost:5000/api/ai/sentiment", {
          method:  "POST",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify(body),
        }).then(r => r.json()).catch(() => null),

        fetch("http://localhost:5000/api/ai/validate", {
          method:  "POST",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify({ ...body, location: location || "" }),
        }).then(r => r.json()).catch(() => null),
      ]);

      if (catRes.status === "fulfilled" && catRes.value?.success) {
        setAiCategorySuggestion(catRes.value);
      }
      if (sentRes.status === "fulfilled" && sentRes.value?.success) {
        setAiSentiment(sentRes.value);
      }
      if (valRes.status === "fulfilled" && valRes.value) {
        setAiValidation(valRes.value);
      }
    }, 800);

    return () => clearTimeout(timer);
  }, [title, description, location]);

  // =========================================================
  // FORWARD EXISTING COMPLAINT
  // =========================================================

  const handleForwardExisting = async () => {
    if (!duplicateIssue?.issue_id) {
      setError(
        "Existing complaint information is missing."
      );
      return;
    }

    if (!user) {
      setError(
        "User information is missing. Please login again."
      );
      return;
    }

    const userId = user.user_id || user.id;

    if (!userId) {
      setError(
        "User ID is missing. Please login again."
      );
      return;
    }

    setForwarding(true);
    setError(null);

    try {
      console.log(
        "[ISSUE] Forwarding existing complaint:",
        duplicateIssue.issue_id
      );

      const response = await fetch(
        `http://localhost:5000/api/issues/${duplicateIssue.issue_id}/support`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            reported_by: userId,
          }),
        }
      );

      const data = await response.json();

      console.log(
        "[ISSUE] Forward response:",
        data
      );

      if (!response.ok) {
        throw new Error(
          data.message ||
            "Failed to forward existing complaint."
        );
      }

      alert(
        "Your report has been added to the existing complaint."
      );

      onSuccess?.();

    } catch (err) {
      console.error(
        "[ISSUE] Forward error:",
        err
      );

      setError(
        err.message ||
          "Failed to forward existing complaint."
      );

    } finally {
      setForwarding(false);
    }
  };

  // =========================================================
  // SUBMIT NEW ISSUE
  // =========================================================

  const handleSubmit = async (e, forceCreate = false) => {
    e?.preventDefault();

    if (!title.trim()) {
      setError("Please enter a title for the issue.");
      document.getElementById("report-title-input")?.focus();
      return;
    }

    if (!categoryId) {
      setError("Please select a category for the issue.");
      document.getElementById("category-section")?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }

    if (!location) {
      setError("Please select a location for the issue.");
      document.getElementById("location-select")?.focus();
      return;
    }

    if (!description.trim()) {
      setError("Please enter a description of the problem.");
      document.getElementById("report-desc-textarea")?.focus();
      return;
    }

    const resolvedUser = user || JSON.parse(localStorage.getItem("campus_civic_user") || "null");
    const userId = resolvedUser?.user_id || resolvedUser?.id;

    if (!userId) {
      setError(
        "You must be logged in to submit a complaint. Please log in first."
      );
      return;
    }

    // If duplicate was found and user hasn't explicitly clicked to post anyway
    if (duplicateIssue && !forceCreate) {
      setError(
        "A similar report already exists. If yours is different, click 'Post Anyway' to submit."
      );
      return;
    }

    // AI quality gate — only block explicit severe spam
    if (aiValidation && !aiValidation.isValid && !forceCreate) {
      const blockers = (aiValidation.issues || []).filter(i => ["SPAM","OFFENSIVE"].includes(i));
      if (blockers.length > 0) {
        setError(
          `Your report was flagged: ${blockers.join(", ")}. ${aiValidation.suggestion || "Please revise or click Post Anyway."}`
        );
        return;
      }
    }

    setLoading(true);
    setError(null);

    const fullLocation = getFullLocation();

    try {
      // =====================================================
      // FORM DATA
      // =====================================================

      const formData = new FormData();

      formData.append(
        "reported_by",
        userId
      );

      formData.append(
        "category_id",
        categoryId
      );

      formData.append(
        "title",
        title.trim()
      );

      formData.append(
        "description",
        description.trim()
      );

      formData.append(
        "location",
        fullLocation
      );

      formData.append(
        "visibility",
        visibility
      );

      formData.append(
        "force_create",
        forceCreate ? "true" : "false"
      );

      formData.append(
        "is_anonymous",
        isAnonymous ? "true" : "false"
      );

      // =====================================================
      // FILES
      // =====================================================

      if (image) {
        formData.append(
          "image",
          image
        );
      }

      if (video) {
        formData.append(
          "video",
          video
        );
      }

      // =====================================================
      // CREATE ISSUE
      // =====================================================

      console.log(
        "[ISSUE] Creating new complaint..."
      );

      const response = await fetch(
        "http://localhost:5000/api/issues",
        {
          method: "POST",
          body: formData,
        }
      );

      const data = await response.json();

      console.log(
        "[ISSUE] Create response:",
        data
      );

      // =====================================================
      // BACKEND DUPLICATE SAFETY CHECK
      // =====================================================

      if (
        response.status === 409 &&
        data.duplicate
      ) {
        if (data.existing_issue) {
          setDuplicateIssue(
            data.existing_issue
          );
        }

        setAiChecked(true);

        setError(
          "A similar complaint was found. You can view it below or click 'Post Anyway' to submit."
        );

        return;
      }

      // =====================================================
      // OTHER ERROR
      // =====================================================

      if (!response.ok) {
        throw new Error(
          data.message ||
            "Failed to submit issue."
        );
      }

      // =====================================================
      // SUCCESS — issue saved, show banner immediately
      // =====================================================

      const newIssue = data.issue || {};

      setSubmittedIssue(newIssue);
      setSubmitted(true);

      // No blocking scan here — the backend runs AI in the background
      // and will push a notification to the user's Alerts tab if it
      // finds a similar existing report.
      setSimilarAfterPost(null);
      setSimilarScanning(false);

    } catch (err) {
      console.error(
        "[ISSUE] Submit error:",
        err
      );

      setError(
        err.message ||
          "Something went wrong. Please try again."
      );

    } finally {
      setLoading(false);
    }
  };

  // =========================================================
  // CATEGORY ICONS
  // =========================================================

  const categoryIcons = {
    Electricity: "⚡",
    Water: "💧",
    Cleanliness: "🧹",
    Infrastructure: "🏗️",
    "Wi-Fi / Internet": "📶",
    Security: "🔒",
    Other: "📌",
  };

  // =========================================================
  // RENDER
  // =========================================================

  return (
    <div
      className="report-page"
      style={{
        minHeight: "100vh",
        background: "#09090f",
        color: "#f8fafc",
        display: "flex",
        justifyContent: "center",
        padding: "0",
        boxSizing: "border-box",
      }}
    >
      <div
        className="report-form"
        style={{
          width: "100%",
          maxWidth: "560px",
          minHeight: "100vh",
          background: "#0d0d15",
          boxSizing: "border-box",
          padding: "18px 18px 110px",
        }}
      >

        {/* =================================================
            SUCCESS SCREEN — shown after post
        ================================================= */}
        {submitted && (
          <div style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            minHeight: "80vh",
            gap: "20px",
            padding: "24px",
            textAlign: "center",
          }}>

            {/* Big checkmark */}
            <div style={{
              width: "72px", height: "72px",
              borderRadius: "50%",
              background: "rgba(16,185,129,0.12)",
              border: "2px solid rgba(16,185,129,0.4)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: "32px",
            }}>
              ✅
            </div>

            <div>
              <div style={{ fontSize: "20px", fontWeight: "800", color: "#f8fafc", marginBottom: "6px" }}>
                Report Posted!
              </div>
              {submittedIssue?.title && (
                <div style={{ fontSize: "13px", color: "#9ca3af", maxWidth: "280px" }}>
                  "{submittedIssue.title}"
                </div>
              )}
            </div>

            {/* Similar-report notice — always shown, clean and instant */}
            <div style={{
              width: "100%",
              padding: "14px 16px",
              borderRadius: "14px",
              background: "rgba(99,102,241,0.06)",
              border: "1px solid rgba(99,102,241,0.18)",
              display: "flex",
              alignItems: "flex-start",
              gap: "12px",
            }}>
              <span style={{ fontSize: "20px", flexShrink: 0 }}>🔔</span>
              <div style={{ textAlign: "left" }}>
                <div style={{ fontSize: "13px", fontWeight: "600", color: "#a5b4fc", marginBottom: "4px" }}>
                  Checking for similar reports…
                </div>
                <div style={{ fontSize: "12px", color: "#64748b", lineHeight: 1.5 }}>
                  If we find one, we'll notify you in your{" "}
                  <span style={{ color: "#818cf8", fontWeight: 600 }}>Alerts</span> tab.
                </div>
              </div>
            </div>

            {/* Action buttons */}
            <div style={{ display: "flex", gap: "10px", width: "100%" }}>
              <button
                type="button"
                onClick={() => onSuccess?.()}
                style={{
                  flex: 1,
                  padding: "12px",
                  borderRadius: "11px",
                  border: "1px solid rgba(255,255,255,0.1)",
                  background: "rgba(255,255,255,0.05)",
                  color: "#9ca3af",
                  fontSize: "14px",
                  fontWeight: "600",
                  cursor: "pointer",
                }}
              >
                Go to Feed
              </button>
              {submittedIssue?.issue_id && onIssueClick && (
                <button
                  type="button"
                  onClick={() => onIssueClick(submittedIssue)}
                  style={{
                    flex: 1,
                    padding: "12px",
                    borderRadius: "11px",
                    border: "none",
                    background: "#7661f5",
                    color: "#fff",
                    fontSize: "14px",
                    fontWeight: "700",
                    cursor: "pointer",
                  }}
                >
                  View My Report
                </button>
              )}
            </div>

          </div>
        )}

        {/* Main form — hidden after submit */}
        {!submitted && (
        <>

        {/* =================================================
            HEADER
        ================================================= */}

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: "28px",
          }}
        >

          <button
            type="button"
            onClick={onBack}
            aria-label="Close"
            style={{
              width: "38px",
              height: "38px",
              borderRadius: "50%",
              border: "1px solid #252532",
              background: "#14141d",
              color: "#9ca3af",
              fontSize: "24px",
              lineHeight: 1,
              cursor: "pointer",
            }}
          >
            ×
          </button>

          <h1
            style={{
              margin: 0,
              fontSize: "20px",
              fontWeight: 700,
              color: "#f8fafc",
            }}
          >
            Report an Issue
          </h1>

          {/* =================================================
              POST BUTTON
          ================================================= */}

          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>

            {/* Subtle AI checking indicator next to button */}
            {aiChecking && (
              <span style={{ fontSize: "11px", color: "#6366f1", whiteSpace: "nowrap" }}>
                ⏳ checking…
              </span>
            )}

            <button
              type="button"
              onClick={handleSubmit}
              disabled={loading}
              style={{
                border: "none",
                borderRadius: "11px",
                padding: "10px 24px",
                background: loading ? "rgba(118,97,245,0.5)" : "#7661f5",
                color: "#fff",
                fontSize: "15px",
                fontWeight: 700,
                cursor: loading ? "not-allowed" : "pointer",
                opacity: loading ? 0.7 : 1,
                transition: "all 0.2s",
              }}
            >
              {loading ? "Posting…" : "Post Report"}
            </button>

          </div>

        </div>

        {/* =================================================
            ERROR
        ================================================= */}

        {error && (
          <div
            style={{
              marginBottom: "18px",
              padding: "11px 13px",
              borderRadius: "10px",
              background: "#32171b",
              color: "#fca5a5",
              border: "1px solid #5b252b",
              fontSize: "13px",
            }}
          >
            ⚠️ {error}
          </div>
        )}

        {/* Quality gate warning — shown near top only if content is problematic */}
        {aiValidation && !aiValidation.isValid && aiValidation.suggestion && (
          <div style={{
            marginBottom: "14px",
            padding: "10px 13px",
            borderRadius: "10px",
            background: "rgba(245,158,11,0.08)",
            border: "1px solid rgba(245,158,11,0.3)",
            fontSize: "13px",
            color: "#fcd34d",
          }}>
            💡 {aiValidation.suggestion}
          </div>
        )}

        <form onSubmit={handleSubmit}>

          {/* =================================================
              VISIBILITY
          ================================================= */}

          <div style={{ marginBottom: "24px" }}>

            <label
              style={{
                display: "block",
                marginBottom: "10px",
                fontSize: "12px",
                fontWeight: 700,
                letterSpacing: "0.04em",
                color: "#9ca3af",
              }}
            >
              POST VISIBILITY{" "}
              <span style={{ color: "#ef4444" }}>
                *
              </span>
            </label>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                border: "1px solid #2a2a36",
                borderRadius: "10px",
                overflow: "hidden",
                background: "#15151e",
              }}
            >

              <button
                type="button"
                onClick={() =>
                  setVisibility("PUBLIC")
                }
                style={{
                  padding: "12px 8px",
                  border: "none",
                  borderRight:
                    "1px solid #2a2a36",
                  background:
                    visibility === "PUBLIC"
                      ? "#f8fafc"
                      : "#15151e",
                  color:
                    visibility === "PUBLIC"
                      ? "#111827"
                      : "#9ca3af",
                  cursor: "pointer",
                  fontWeight: 600,
                  fontSize: "13px",
                }}
              >
                🌐 <span>Public</span>

                <div
                  style={{
                    fontSize: "11px",
                    fontWeight: 400,
                    marginTop: 2,
                  }}
                >
                  Everyone can view this issue
                </div>
              </button>

              <button
                type="button"
                onClick={() =>
                  setVisibility("PRIVATE")
                }
                style={{
                  padding: "12px 8px",
                  border: "none",
                  background:
                    visibility === "PRIVATE"
                      ? "#f8fafc"
                      : "#15151e",
                  color:
                    visibility === "PRIVATE"
                      ? "#111827"
                      : "#9ca3af",
                  cursor: "pointer",
                  fontWeight: 600,
                  fontSize: "13px",
                }}
              >
                🔒 <span>Private</span>

                <div
                  style={{
                    fontSize: "11px",
                    fontWeight: 400,
                    marginTop: 2,
                  }}
                >
                  Only you and administrators can view it
                </div>
              </button>

            </div>
          </div>

          {/* =================================================
              ANONYMOUS REPORTING
          ================================================= */}

          <div style={{ marginBottom: "24px" }}>

            <div
              onClick={() => setIsAnonymous(a => !a)}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                background: isAnonymous ? "rgba(99,102,241,0.12)" : "#15151e",
                border: `1px solid ${isAnonymous ? "#6366f1" : "#2a2a36"}`,
                borderRadius: "12px",
                padding: "14px 16px",
                cursor: "pointer",
                transition: "all 0.2s",
              }}
            >
              <div>
                <div style={{ fontWeight: 700, color: isAnonymous ? "#818cf8" : "#9ca3af", fontSize: "14px", marginBottom: "2px" }}>
                  🕵️ Post Anonymously
                </div>
                <div style={{ fontSize: "12px", color: "#555" }}>
                  {isAnonymous
                    ? "Your name will be hidden — shown as \"Anonymous\""
                    : "Your name will be shown with this issue"}
                </div>
              </div>

              {/* Toggle */}
              <div style={{
                width: "42px", height: "24px",
                borderRadius: "12px",
                background: isAnonymous ? "#6366f1" : "#2a2a36",
                position: "relative",
                transition: "background 0.2s",
                flexShrink: 0,
              }}>
                <div style={{
                  position: "absolute",
                  top: "3px",
                  left: isAnonymous ? "21px" : "3px",
                  width: "18px", height: "18px",
                  borderRadius: "50%",
                  background: "#fff",
                  transition: "left 0.2s",
                  boxShadow: "0 1px 4px rgba(0,0,0,0.4)",
                }} />
              </div>
            </div>
          </div>

          {/* =================================================
              CATEGORY
          ================================================= */}

          <div style={{ marginBottom: "24px" }}>

            <label
              style={{
                display: "block",
                marginBottom: "11px",
                fontSize: "12px",
                fontWeight: 700,
                letterSpacing: "0.04em",
                color: "#9ca3af",
              }}
            >
              CATEGORY{" "}
              <span style={{ color: "#ef4444" }}>
                *
              </span>
            </label>

            <div
              id="category-section"
              style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(4, 1fr)",
                gap: "9px",
              }}
            >

              {CATEGORIES.map((category) => {

                const selected =
                  categoryId === category.id;

                return (
                  <button
                    key={category.id}
                    type="button"
                    onClick={() => {
                      setCategoryId(
                        category.id
                      );

                      setDuplicateIssue(null);
                      setAiChecked(false);
                    }}
                    style={{
                      minHeight: "70px",
                      padding: "8px 5px",
                      borderRadius: "12px",
                      border: selected
                        ? "1px solid #7661f5"
                        : "1px solid #252532",
                      background: selected
                        ? "#16162a"
                        : "#12121a",
                      color: selected
                        ? "#e5e7eb"
                        : "#777b89",
                      cursor: "pointer",
                      boxShadow: selected
                        ? "0 0 0 1px rgba(118,97,245,.15)"
                        : "none",
                    }}
                  >

                    <div
                      style={{
                        fontSize: "22px",
                        marginBottom: "6px",
                      }}
                    >
                      {categoryIcons[
                        category.name
                      ] || category.emoji}
                    </div>

                    <div
                      style={{
                        fontSize: "11px",
                        lineHeight: 1.15,
                      }}
                    >
                      {category.name}
                    </div>

                  </button>
                );
              })}

            </div>
          </div>

          {/* =================================================
              TITLE
          ================================================= */}

          <div style={{ marginBottom: "20px" }}>

            <label
              style={{
                display: "block",
                marginBottom: "9px",
                fontSize: "12px",
                fontWeight: 700,
                letterSpacing: "0.04em",
                color: "#9ca3af",
              }}
            >
              TITLE{" "}
              <span style={{ color: "#ef4444" }}>
                *
              </span>
            </label>

            <input
              id="report-title-input"
              type="text"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                setAiChecked(false);
                setDuplicateIssue(null);
              }}
              placeholder="e.g. Broken fan in Room 204"
              maxLength={150}
              style={{
                width: "100%",
                height: "48px",
                padding: "0 14px",
                boxSizing: "border-box",
                borderRadius: "11px",
                border: "1px solid #252532",
                outline: "none",
                background: "#12121a",
                color: "#f8fafc",
                fontSize: "14px",
              }}
            />

          </div>

          {/* =================================================
              DESCRIPTION
          ================================================= */}

          <div style={{ marginBottom: "20px" }}>

            <label
              style={{
                display: "block",
                marginBottom: "9px",
                fontSize: "12px",
                fontWeight: 700,
                letterSpacing: "0.04em",
                color: "#9ca3af",
              }}
            >
              DESCRIPTION{" "}
              <span style={{ color: "#ef4444" }}>
                *
              </span>
            </label>

            <textarea
              id="report-desc-textarea"
              value={description}
              onChange={(e) => {
                setDescription(
                  e.target.value
                );

                setAiChecked(false);
                setDuplicateIssue(null);
              }}
              placeholder="Describe the issue in detail..."
              rows={5}
              style={{
                width: "100%",
                minHeight: "108px",
                padding: "14px",
                boxSizing: "border-box",
                resize: "vertical",
                borderRadius: "11px",
                border: "1px solid #252532",
                outline: "none",
                background: "#12121a",
                color: "#f8fafc",
                fontSize: "14px",
                fontFamily: "inherit",
              }}
            />

            {/* ── AI checking micro-state ───────────────────────────── */}
            {aiChecking && (
              <div style={{
                marginTop: "10px",
                display: "flex", alignItems: "center", gap: "7px",
                fontSize: "12px", color: "#6366f1",
              }}>
                <span style={{ animation: "spin 1s linear infinite", display: "inline-block" }}>⏳</span>
                Checking for similar reports…
              </div>
            )}

            {/* ── Similar report found ──────────────────────────────── */}
            {duplicateIssue && (
              <div style={{
                marginTop: "10px",
                padding: "12px 14px",
                borderRadius: "12px",
                background: "rgba(16,185,129,0.06)",
                border: "1px solid rgba(16,185,129,0.25)",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: "10px",
              }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: "11px", color: "#10b981", fontWeight: "700", marginBottom: "4px", letterSpacing: "0.4px" }}>
                    🔗 SIMILAR REPORT EXISTS
                  </div>
                  <div style={{ fontSize: "13px", color: "#d1fae5", fontWeight: "600", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {duplicateIssue.title || "Similar complaint"}
                  </div>
                  {duplicateIssue.location && (
                    <div style={{ fontSize: "11px", color: "#6ee7b7", marginTop: "2px" }}>
                      📍 {duplicateIssue.location}
                    </div>
                  )}
                </div>
                <div style={{ display: "flex", gap: "8px", flexShrink: 0, flexWrap: "wrap" }}>
                  <button
                    type="button"
                    onClick={() => {
                      // Navigate to existing issue — use onIssueClick prop if available
                      if (onIssueClick && duplicateIssue.issue_id) {
                        onIssueClick(duplicateIssue);
                      }
                    }}
                    style={{
                      flexShrink: 0,
                      padding: "7px 14px",
                      borderRadius: "9px",
                      background: "rgba(16,185,129,0.15)",
                      border: "1px solid rgba(16,185,129,0.4)",
                      color: "#34d399",
                      fontSize: "12px",
                      fontWeight: "700",
                      cursor: "pointer",
                      whiteSpace: "nowrap",
                    }}
                  >
                    View Report →
                  </button>
                  <button
                    type="button"
                    onClick={(e) => handleSubmit(e, true)}
                    disabled={loading}
                    style={{
                      flexShrink: 0,
                      padding: "7px 14px",
                      borderRadius: "9px",
                      background: "rgba(99,102,241,0.2)",
                      border: "1px solid rgba(99,102,241,0.5)",
                      color: "#818cf8",
                      fontSize: "12px",
                      fontWeight: "700",
                      cursor: loading ? "not-allowed" : "pointer",
                      whiteSpace: "nowrap",
                    }}
                  >
                    Post Anyway
                  </button>
                </div>
              </div>
            )}

          </div>

          {/* =================================================
              LOCATION
          ================================================= */}

          <div style={{ marginBottom: "20px" }}>

            <label
              style={{
                display: "block",
                marginBottom: "9px",
                fontSize: "12px",
                fontWeight: 700,
                letterSpacing: "0.04em",
                color: "#9ca3af",
              }}
            >
              LOCATION{" "}
              <span style={{ color: "#ef4444" }}>
                *
              </span>
            </label>

            <select
              id="location-select"
              value={location}
              onChange={(e) => {
                setLocation(e.target.value);
                setAiChecked(false);
                setDuplicateIssue(null);
              }}
              style={{
                width: "100%",
                height: "48px",
                padding: "0 14px",
                borderRadius: "11px",
                border: "1px solid #252532",
                background: "#12121a",
                color: location
                  ? "#f8fafc"
                  : "#6b7280",
                fontSize: "14px",
                outline: "none",
              }}
            >

              <option value="">
                Select location...
              </option>

              {LOCATIONS.map((loc) => (
                <option
                  key={loc}
                  value={loc}
                >
                  {loc}
                </option>
              ))}

            </select>

          </div>

          {/* =================================================
              EXTRA LOCATION
          ================================================= */}

          {location && (
            <div style={{ marginBottom: "20px" }}>

              <label
                style={{
                  display: "block",
                  marginBottom: "9px",
                  fontSize: "12px",
                  fontWeight: 700,
                  letterSpacing: "0.04em",
                  color: "#9ca3af",
                }}
              >
                MORE LOCATION DETAILS{" "}
                <span
                  style={{
                    color: "#6b7280",
                    fontWeight: 400,
                  }}
                >
                  (optional)
                </span>
              </label>

              <input
                type="text"
                value={extraDetail}
                onChange={(e) => {
                  setExtraDetail(
                    e.target.value
                  );

                  setAiChecked(false);
                  setDuplicateIssue(null);
                }}
                placeholder="e.g. 2nd floor, Room 204"
                style={{
                  width: "100%",
                  height: "48px",
                  padding: "0 14px",
                  boxSizing: "border-box",
                  borderRadius: "11px",
                  border: "1px solid #252532",
                  background: "#12121a",
                  color: "#f8fafc",
                  fontSize: "14px",
                  outline: "none",
                }}
              />

            </div>
          )}

          {/* =================================================
              PHOTO
          ================================================= */}

          <div style={{ marginBottom: "18px" }}>

            <label
              style={{
                display: "block",
                marginBottom: "9px",
                fontSize: "12px",
                fontWeight: 700,
                letterSpacing: "0.04em",
                color: "#9ca3af",
              }}
            >
              📷 PHOTO PROOF{" "}
              <span
                style={{
                  color: "#6b7280",
                  fontWeight: 400,
                }}
              >
                (OPTIONAL)
              </span>
            </label>

            <label
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                minHeight: "70px",
                padding: "10px",
                boxSizing: "border-box",
                borderRadius: "12px",
                border: "1px dashed #333344",
                background: "#111119",
                color: "#777b89",
                cursor: "pointer",
                fontSize: "13px",
              }}
            >

              <input
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                style={{ display: "none" }}
              />

              {image
                ? `✓ ${image.name}`
                : "Tap to add a photo"}

            </label>
          </div>

          {/* =================================================
              VIDEO
          ================================================= */}

          <div style={{ marginBottom: "22px" }}>

            <label
              style={{
                display: "block",
                marginBottom: "9px",
                fontSize: "12px",
                fontWeight: 700,
                letterSpacing: "0.04em",
                color: "#9ca3af",
              }}
            >
              🎥 VIDEO{" "}
              <span
                style={{
                  color: "#6b7280",
                  fontWeight: 400,
                }}
              >
                (OPTIONAL)
              </span>
            </label>

            <label
              style={{
                display: "flex",
                alignItems: "center",
                minHeight: "48px",
                padding: "0 14px",
                boxSizing: "border-box",
                borderRadius: "11px",
                border: "1px solid #252532",
                background: "#12121a",
                color: "#9ca3af",
                cursor: "pointer",
                fontSize: "13px",
              }}
            >

              <input
                type="file"
                accept="video/*"
                onChange={handleVideoChange}
                style={{ display: "none" }}
              />

              {video
                ? `✓ ${video.name}`
                : "Add video proof (optional)"}

            </label>
          </div>

          {/* =================================================
              SUBMIT & ACTIONS (BOTTOM OF FORM)
          ================================================= */}

          {error && (
            <div
              style={{
                marginTop: "16px",
                marginBottom: "16px",
                padding: "13px 16px",
                borderRadius: "11px",
                background: "rgba(239,68,68,0.12)",
                border: "1px solid rgba(239,68,68,0.35)",
                color: "#fca5a5",
                fontSize: "14px",
                display: "flex",
                alignItems: "center",
                gap: "10px",
              }}
            >
              <span style={{ fontSize: "16px" }}>⚠️</span>
              <span style={{ flex: 1 }}>{error}</span>
              {duplicateIssue && (
                <button
                  type="button"
                  onClick={(e) => handleSubmit(e, true)}
                  disabled={loading}
                  style={{
                    padding: "6px 12px",
                    borderRadius: "8px",
                    background: "#6366f1",
                    border: "none",
                    color: "#fff",
                    fontSize: "12px",
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  Post Anyway
                </button>
              )}
            </div>
          )}

          <div
            style={{
              marginTop: "24px",
              paddingTop: "20px",
              borderTop: "1px solid #1a1a24",
              display: "flex",
              alignItems: "center",
              justifyContent: "flex-end",
              gap: "12px",
            }}
          >
            {onBack && (
              <button
                type="button"
                onClick={onBack}
                style={{
                  padding: "12px 24px",
                  borderRadius: "11px",
                  border: "1px solid #252532",
                  background: "#161622",
                  color: "#9ca3af",
                  fontSize: "14px",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>
            )}

            <button
              type="submit"
              disabled={loading}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                padding: "12px 32px",
                borderRadius: "11px",
                border: "none",
                background: loading
                  ? "rgba(118,97,245,0.5)"
                  : "linear-gradient(135deg, #7661f5 0%, #6366f1 100%)",
                color: "#fff",
                fontSize: "15px",
                fontWeight: 700,
                cursor: loading ? "not-allowed" : "pointer",
                boxShadow: "0 4px 16px rgba(118,97,245,0.35)",
              }}
            >
              {loading ? "Posting…" : "🚀 Post Report"}
            </button>
          </div>

        </form>

        </> /* end !submitted Fragment */
        )} {/* end !submitted */}

      </div>
    </div>
  );
}

export default ReportIssue;