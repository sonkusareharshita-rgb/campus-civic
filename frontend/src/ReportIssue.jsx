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

function ReportIssue({ user, onBack, onSuccess }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [extraDetail, setExtraDetail] = useState("");
  const [categoryId, setCategoryId] = useState(null);
  const [visibility, setVisibility] = useState("PUBLIC");

  const [image, setImage] = useState(null);
  const [video, setVideo] = useState(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // =========================================================
  // DUPLICATE CHECK STATES
  // =========================================================

  const [duplicateIssue, setDuplicateIssue] = useState(null);
  const [aiChecking, setAiChecking] = useState(false);
  const [aiChecked, setAiChecked] = useState(false);
  const [forwarding, setForwarding] = useState(false);

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

  const handleSubmit = async (e) => {
    e?.preventDefault();

    if (
      !title.trim() ||
      !description.trim() ||
      !location ||
      !categoryId
    ) {
      setError(
        "Please fill in all required fields."
      );
      return;
    }

    if (!user) {
      setError(
        "User information is missing. Please login again."
      );
      return;
    }

    // AI check chal raha hai
    if (aiChecking) {
      setError(
        "Please wait while AI checks for similar complaints."
      );
      return;
    }

    // AI check abhi hua hi nahi
    if (!aiChecked) {
      setError(
        "Please wait for the duplicate check to complete."
      );
      return;
    }

    // Duplicate already found
    if (duplicateIssue) {
      setError(
        "A similar complaint already exists. Please use 'Forward Existing'."
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
        "false"
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
          "A similar complaint was found. You can forward the existing complaint."
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
      // SUCCESS
      // =====================================================

      console.log(
        "[ISSUE] Issue created successfully:",
        data.issue
      );

      alert(
        "Issue submitted successfully!"
      );

      onSuccess?.();

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
              POST / FORWARD BUTTON
          ================================================= */}

          {duplicateIssue ? (

            <button
              type="button"
              onClick={handleForwardExisting}
              disabled={forwarding}
              style={{
                border: "none",
                borderRadius: "11px",
                padding: "10px 16px",
                background: "#22c55e",
                color: "#fff",
                fontSize: "14px",
                fontWeight: 700,
                cursor: forwarding
                  ? "not-allowed"
                  : "pointer",
                opacity: forwarding
                  ? 0.65
                  : 1,
              }}
            >
              {forwarding
                ? "..."
                : "Forward Existing"}
            </button>

          ) : (

            <button
              type="button"
              onClick={handleSubmit}
              disabled={
                loading ||
                aiChecking ||
                !aiChecked
              }
              style={{
                border: "none",
                borderRadius: "11px",
                padding: "10px 22px",
                background: "#7661f5",
                color: "#fff",
                fontSize: "15px",
                fontWeight: 700,
                cursor:
                  loading ||
                  aiChecking ||
                  !aiChecked
                    ? "not-allowed"
                    : "pointer",
                opacity:
                  loading ||
                  aiChecking ||
                  !aiChecked
                    ? 0.65
                    : 1,
              }}
            >
              {loading
                ? "..."
                : aiChecking
                ? "Checking..."
                : "Post"}
            </button>

          )}

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

        {/* =================================================
            DUPLICATE RESULT
        ================================================= */}

        {duplicateIssue && (
          <div
            style={{
              marginBottom: "20px",
              padding: "15px",
              borderRadius: "12px",
              background: "#18251c",
              border: "1px solid #2f6b3d",
              color: "#d1fae5",
            }}
          >

            <div
              style={{
                fontSize: "15px",
                fontWeight: 700,
                marginBottom: "8px",
              }}
            >
              ⚠️ Similar complaint already exists
            </div>

            <div
              style={{
                fontSize: "13px",
                color: "#a7f3d0",
                marginBottom: "10px",
              }}
            >
              Instead of creating a duplicate complaint,
              you can forward/support the existing one.
            </div>

            <div
              style={{
                padding: "10px",
                borderRadius: "9px",
                background: "#101914",
                marginBottom: "8px",
              }}
            >
              <div
                style={{
                  fontSize: "12px",
                  color: "#86efac",
                  marginBottom: "4px",
                }}
              >
                Existing Complaint
              </div>

              <div
                style={{
                  fontSize: "14px",
                  fontWeight: 700,
                  color: "#f8fafc",
                }}
              >
                {duplicateIssue.title ||
                  "Similar complaint"}
              </div>
            </div>

            <div
              style={{
                fontSize: "12px",
                color: "#9ca3af",
              }}
            >
              📍 {duplicateIssue.location}
            </div>

            {duplicateIssue.issue_id && (
              <div
                style={{
                  marginTop: "4px",
                  fontSize: "12px",
                  color: "#9ca3af",
                }}
              >
                Issue ID: #{duplicateIssue.issue_id}
              </div>
            )}

          </div>
        )}

        {/* =================================================
            AI CHECK STATUS
        ================================================= */}

        {!duplicateIssue &&
          aiChecking && (
            <div
              style={{
                marginBottom: "18px",
                padding: "10px 13px",
                borderRadius: "10px",
                background: "#17152a",
                border: "1px solid #302b55",
                color: "#c4b5fd",
                fontSize: "12px",
              }}
            >
              🤖 AI is checking for similar complaints...
            </div>
          )}

        {!duplicateIssue &&
          aiChecked &&
          !aiChecking &&
          title.trim() &&
          description.trim() &&
          location &&
          categoryId && (
            <div
              style={{
                marginBottom: "18px",
                padding: "10px 13px",
                borderRadius: "10px",
                background: "#122019",
                border: "1px solid #245333",
                color: "#86efac",
                fontSize: "12px",
              }}
            >
              ✓ No similar complaint found. You can post this issue.
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
              HIDDEN SUBMIT
          ================================================= */}

          <button
            type="submit"
            disabled={loading}
            style={{
              display: "none",
            }}
          >
            Submit
          </button>

        </form>
      </div>
    </div>
  );
}

export default ReportIssue;