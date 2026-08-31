import { useState } from "react";
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
  { id: 1, name: "Electricity",      emoji: "⚡" },
  { id: 2, name: "Water",            emoji: "💧" },
  { id: 3, name: "Cleanliness",      emoji: "🧹" },
  { id: 4, name: "Infrastructure",   emoji: "🏗️" },
  { id: 5, name: "Wi-Fi / Internet", emoji: "📶" },
  { id: 6, name: "Security",         emoji: "🔒" },
  { id: 7, name: "Other",            emoji: "📌" },
];

function ReportIssue({ user, onBack, onSuccess }) {
  const [title,       setTitle]       = useState("");
  const [description, setDescription] = useState("");
  const [location,    setLocation]    = useState("");
  const [extraDetail, setExtraDetail] = useState("");
  const [categoryId,  setCategoryId]  = useState(null);
  const [image,       setImage]       = useState(null);
  const [loading,     setLoading]     = useState(false);
  const [error,       setError]       = useState(null);

  // ── SUBMIT ──────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!title || !description || !location || !categoryId) {
      setError("Please fill in all required fields.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const fullLocation = extraDetail
        ? `${location} — ${extraDetail}`
        : location;

      const res = await fetch("http://localhost:5000/api/issues", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reported_by:   user.user_id,
          category_id:   categoryId,
          title,
          description,
          location:      fullLocation,
          image_url:     null,   // image upload coming in future
          force_create:  false,
        }),
      });

      const data = await res.json();

      // Duplicate found
      if (res.status === 409 && data.duplicate) {
        const confirm = window.confirm(
          `A similar issue already exists:\n"${data.existing_issue.title}" (${data.existing_issue.status})\n\nDo you still want to create a new report?`
        );
        if (!confirm) { setLoading(false); return; }

        // Force create
        const res2 = await fetch("http://localhost:5000/api/issues", {
          method:  "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            reported_by:  user.user_id,
            category_id:  categoryId,
            title,
            description,
            location:     fullLocation,
            image_url:    null,
            force_create: true,
          }),
        });
        const data2 = await res2.json();
        if (!res2.ok) throw new Error(data2.message);
        onSuccess?.();
        return;
      }

      if (!res.ok) throw new Error(data.message || "Failed to submit");

      onSuccess?.();
    } catch (err) {
      setError(err.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="report-sheet">

      {/* ── HEADER ── */}
      <div className="report-sheet-header">
        <button className="report-sheet-back" onClick={onBack} aria-label="Cancel">
          ✕
        </button>
        <h2 className="report-sheet-title">Report an Issue</h2>
        <button
          className="report-sheet-submit-btn"
          onClick={handleSubmit}
          disabled={loading}
        >
          {loading ? "…" : "Post"}
        </button>
      </div>

      <form className="report-sheet-form" onSubmit={handleSubmit}>

        {error && <div className="report-error">{error}</div>}

        {/* ── CATEGORY ── */}
        <div className="report-field">
          <label className="report-label">Category *</label>
          <div className="report-category-grid">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                type="button"
                className={`report-cat-btn ${categoryId === cat.id ? "active" : ""}`}
                onClick={() => setCategoryId(cat.id)}
              >
                <span>{cat.emoji}</span>
                <small>{cat.name}</small>
              </button>
            ))}
          </div>
        </div>

        {/* ── TITLE ── */}
        <div className="report-field">
          <label className="report-label">Title *</label>
          <input
            className="report-input"
            type="text"
            placeholder="e.g. Broken fan in Room 204"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={100}
            required
          />
        </div>

        {/* ── DESCRIPTION ── */}
        <div className="report-field">
          <label className="report-label">Description *</label>
          <textarea
            className="report-textarea"
            placeholder="Describe the issue in detail — what, when, how bad…"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
            required
          />
        </div>

        {/* ── LOCATION ── */}
        <div className="report-field">
          <label className="report-label">Location *</label>
          <select
            className="report-select"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            required
          >
            <option value="">Select location…</option>
            {LOCATIONS.map((loc) => (
              <option key={loc} value={loc}>{loc}</option>
            ))}
          </select>
        </div>

        {/* ── EXTRA DETAIL ── */}
        {location && (
          <div className="report-field">
            <label className="report-label">Room / Floor / Extra detail</label>
            <input
              className="report-input"
              type="text"
              placeholder="e.g. Room 204, 3rd floor"
              value={extraDetail}
              onChange={(e) => setExtraDetail(e.target.value)}
            />
          </div>
        )}

        {/* ── PHOTO ── */}
        <div className="report-field">
          <label className="report-label">Photo (optional)</label>
          <label className="report-photo-area">
            <input
              type="file"
              accept="image/*"
              style={{ display: "none" }}
              onChange={(e) => setImage(e.target.files[0])}
            />
            <span className="report-photo-icon">📷</span>
            <span>{image ? image.name : "Tap to add a photo"}</span>
          </label>
        </div>

        {/* ── SUBMIT (bottom) ── */}
        <button
          type="submit"
          className="report-submit-full"
          disabled={loading}
        >
          {loading ? "Submitting…" : "Submit Issue"}
        </button>

      </form>
    </div>
  );
}

export default ReportIssue;