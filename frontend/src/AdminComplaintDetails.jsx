import { useState } from "react";
import "./App.css";

function AdminComplaintDetails({ complaint, onBack, currentUser }) {
  const [status, setStatus] = useState(
    complaint?.status || "PENDING"
  );

  const [resolutionNote, setResolutionNote] = useState(
    complaint?.resolution_note || ""
  );
  const [proofImage, setProofImage]   = useState(null);
  const [saving,     setSaving]       = useState(false);
  const [saveError,  setSaveError]    = useState(null);
  const [savedOk,    setSavedOk]      = useState(false);

  const handleProofUpload = (e) => {
    const file = e.target.files[0];
    if (file) setProofImage(file);
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    setSaveError(null);
    setSavedOk(false);

    // ── LOCAL VALIDATION ────────────────────────
    if (status === "RESOLVED") {
      if (!resolutionNote.trim()) {
        setSaveError("Please enter a resolution note before marking as Resolved.");
        return;
      }
    }

    setSaving(true);

    try {
      const res = await fetch(
        `http://localhost:5000/api/issues/${complaint.issue_id}/status`,
        {
          method:  "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            status,
            resolution_note:      resolutionNote || null,
            resolution_image_url: null,          // image upload in Phase 5
            changed_by:           currentUser?.user_id || null,
          }),
        }
      );

      const data = await res.json();

      if (!res.ok) {
        setSaveError(data.message || "Failed to update complaint.");
        return;
      }

      setSavedOk(true);

      // Go back to dashboard after short delay
      setTimeout(() => onBack(), 1200);

    } catch (err) {
      setSaveError("Could not connect to server. Is the backend running?");
    } finally {
      setSaving(false);
    }
  };

  const complaintTitle =
    complaint?.title || "Library AC not working";

  const complaintId =
    complaint?.issue_id || "024";

  const reporterName =
    complaint?.reported_by_name || "Rahul Sharma";

  const department =
    complaint?.department_name ||
    "Information Technology";

  const category =
    complaint?.category_name || "Electricity";

  const location =
    complaint?.location || "Central Library";

  const description =
    complaint?.description ||
    "The AC in the central library has not been working for the last two days. Students are facing difficulty while studying.";

  const statusText = status.replace("_", " ");

  return (
    <div className="admin-details-page">

      {/* =================================================
          NAVBAR
      ================================================= */}

      <nav className="admin-navbar">

        <div className="admin-logo">
          <div className="admin-logo-icon">
            🛡️
          </div>

          <div>
            <strong>Campus Civic</strong>
            <span>Administration Portal</span>
          </div>
        </div>

        <div className="admin-nav-right">

          <div className="admin-profile">

            <div className="admin-profile-avatar">
              A
            </div>

            <div>
              <strong>Administrator</strong>
              <span>Campus Admin</span>
            </div>

          </div>

        </div>

      </nav>


      {/* =================================================
          MAIN CONTENT
      ================================================= */}

      <main className="admin-details-content">

        {/* BACK */}

        <button
          className="details-back-btn"
          onClick={onBack}
        >
          <span>←</span>
          Back to Complaints
        </button>


        {/* =================================================
            COMPLAINT HEADER
        ================================================= */}

        <section className="complaint-detail-header">

          <div className="complaint-header-left">

            <div className="complaint-breadcrumb">
              ADMIN PANEL
              <span>/</span>
              COMPLAINT DETAILS
            </div>

            <div className="complaint-title-row">

              <div className="complaint-main-icon">
                📢
              </div>

              <div>

                <h1>
                  {complaintTitle}
                </h1>

                <div className="complaint-meta">

                  <span>
                    Complaint #{complaintId}
                  </span>

                  <span className="meta-dot">
                    •
                  </span>

                  <span>
                    Campus Issue
                  </span>

                </div>

              </div>

            </div>

          </div>


          <div className="complaint-header-right">

            <span
              className={`status ${status.toLowerCase()}`}
            >
              <span className="status-dot"></span>
              {statusText}
            </span>

          </div>

        </section>


        {/* =================================================
            QUICK INFO
        ================================================= */}

        <div className="complaint-quick-info">

          <div className="quick-info-item">

            <div className="quick-icon">
              👤
            </div>

            <div>
              <span>Reported By</span>
              <strong>{reporterName}</strong>
            </div>

          </div>


          <div className="quick-info-item">

            <div className="quick-icon">
              📁
            </div>

            <div>
              <span>Category</span>
              <strong>{category}</strong>
            </div>

          </div>


          <div className="quick-info-item">

            <div className="quick-icon">
              📍
            </div>

            <div>
              <span>Location</span>
              <strong>{location}</strong>
            </div>

          </div>


          <div className="quick-info-item">

            <div className="quick-icon">
              ⚡
            </div>

            <div>
              <span>Priority</span>
              <strong className="high-text">
                High
              </strong>
            </div>

          </div>

        </div>


        {/* =================================================
            MAIN GRID
        ================================================= */}

        <div className="complaint-detail-grid">


          {/* =================================================
              LEFT COLUMN
          ================================================= */}

          <div className="details-left-column">


            {/* REPORTER INFORMATION */}

            <section className="detail-card">

              <div className="detail-card-header">

                <div className="detail-heading-icon">
                  👤
                </div>

                <div>

                  <h2>
                    Reporter Information
                  </h2>

                  <p>
                    Details about the person who reported this issue
                  </p>

                </div>

              </div>


              <div className="reporter-profile">

                <div className="reporter-avatar">
                  {reporterName.charAt(0)}
                </div>

                <div className="reporter-main">

                  <strong>
                    {reporterName}
                  </strong>

                  <span>
                    Student
                  </span>

                </div>

              </div>


              <div className="detail-info-grid">

                <div className="info-item">

                  <span>Department</span>

                  <strong>
                    {department}
                  </strong>

                </div>


                <div className="info-item">

                  <span>Year</span>

                  <strong>
                    3rd Year
                  </strong>

                </div>


                <div className="info-item">

                  <span>Category</span>

                  <strong>
                    {category}
                  </strong>

                </div>


                <div className="info-item">

                  <span>Location</span>

                  <strong>
                    {location}
                  </strong>

                </div>

              </div>

            </section>


            {/* DESCRIPTION */}

            <section className="detail-card">

              <div className="detail-card-header">

                <div className="detail-heading-icon">
                  📝
                </div>

                <div>

                  <h2>
                    Complaint Description
                  </h2>

                  <p>
                    Issue details provided by the reporter
                  </p>

                </div>

              </div>


              <div className="description-box">

                <p>
                  {description}
                </p>

              </div>

            </section>


            {/* PRIORITY */}

            <section className="detail-card">

              <div className="detail-card-header">

                <div className="detail-heading-icon">
                  ⚡
                </div>

                <div>

                  <h2>
                    Priority Level
                  </h2>

                  <p>
                    Current priority assigned to this complaint
                  </p>

                </div>

              </div>


              <div className="priority-display">

                <div className="priority-indicator">
                  !
                </div>

                <div>

                  <strong>
                    High Priority
                  </strong>

                  <span>
                    Requires prompt attention from the administration.
                  </span>

                </div>

              </div>

            </section>


            {/* RESOLUTION PROOF */}

            <section className="detail-card">

              <div className="detail-card-header">

                <div className="detail-heading-icon">
                  📷
                </div>

                <div>

                  <h2>
                    Resolution Proof
                  </h2>

                  <p>
                    Upload evidence after resolving the complaint
                  </p>

                </div>

              </div>


              <label className="proof-upload">

                <input
                  type="file"
                  accept="image/*"
                  onChange={handleProofUpload}
                />

                {proofImage ? (

                  <div className="uploaded-file">

                    <div className="uploaded-icon">
                      📷
                    </div>

                    <div>

                      <strong>
                        {proofImage.name}
                      </strong>

                      <small>
                        Proof photo selected successfully
                      </small>

                    </div>

                    <span className="upload-check">
                      ✓
                    </span>

                  </div>

                ) : (

                  <div className="upload-placeholder">

                    <div className="upload-icon">
                      ⬆
                    </div>

                    <strong>
                      Upload Resolution Photo
                    </strong>

                    <small>
                      Click to browse • JPG, PNG or WEBP
                    </small>

                  </div>

                )}

              </label>

            </section>

          </div>


          {/* =================================================
              RIGHT COLUMN
          ================================================= */}

          <aside className="details-right-column">


            {/* ADMIN ACTION */}

            <section className="action-card">

              <div className="action-card-header">

                <div className="action-icon">
                  ⚙️
                </div>

                <div>

                  <h2>
                    Admin Action
                  </h2>

                  <p>
                    Manage complaint status
                  </p>

                </div>

              </div>


              <form onSubmit={handleUpdate}>

                <div className="form-group">

                  <label>
                    Complaint Status
                  </label>

                  <select
                    value={status}
                    onChange={(e) =>
                      setStatus(e.target.value)
                    }
                  >

                    <option value="PENDING">
                      Pending
                    </option>

                    <option value="IN_PROGRESS">
                      In Progress
                    </option>

                    <option value="RESOLVED">
                      Resolved
                    </option>

                    <option value="REJECTED">
                      Rejected
                    </option>

                  </select>

                </div>


                <div className="form-group">

                  <label>
                    Resolution Note
                  </label>

                  <textarea
                    placeholder="Describe the action taken to resolve this complaint..."
                    value={resolutionNote}
                    onChange={(e) =>
                      setResolutionNote(e.target.value)
                    }
                    rows="6"
                  />

                  <small className="textarea-hint">
                    Explain what was done to address the issue.
                  </small>

                </div>


                {status === "RESOLVED" && (

                  <div className="required-message">

                    <strong>
                      ⚠ Resolution requirements
                    </strong>

                    <span>
                      A resolution note and proof photo are required before marking this complaint as resolved.
                    </span>

                  </div>

                )}



                {/* ERROR / SUCCESS FEEDBACK */}
                {saveError && (
                  <div className="required-message" style={{ borderColor: "#ef4444", background: "rgba(239,68,68,0.08)" }}>
                    <strong>⚠ Error</strong>
                    <span>{saveError}</span>
                  </div>
                )}

                {savedOk && (
                  <div className="required-message" style={{ borderColor: "#10b981", background: "rgba(16,185,129,0.08)" }}>
                    <strong>✅ Saved!</strong>
                    <span>Complaint updated successfully. Returning to dashboard…</span>
                  </div>
                )}

                <button
                  type="submit"
                  className="update-complaint-btn"
                  disabled={saving || savedOk}
                  style={{ opacity: (saving || savedOk) ? 0.7 : 1 }}
                >
                  <span>{saving ? "⏳" : savedOk ? "✅" : "✓"}</span>
                  {saving ? "Saving…" : savedOk ? "Saved!" : "Update Complaint"}
                </button>

              </form>

            </section>


            {/* ASSIGNMENT */}

            <section className="assignment-card">

              <div className="assignment-header">

                <div>
                  <h3>
                    Assigned Department
                  </h3>

                  <p>
                    Responsible for resolving this issue
                  </p>
                </div>

              </div>


              <div className="assigned-admin">

                <div className="admin-avatar">
                  E
                </div>

                <div>

                  <strong>
                    Electrical Department
                  </strong>

                  <span>
                    Campus Maintenance
                  </span>

                </div>

              </div>

            </section>


            {/* COMPLAINT TIMELINE */}

            <section className="timeline-card">

              <h3>
                Complaint Timeline
              </h3>

              <div className="timeline">

                <div className="timeline-item active">

                  <div className="timeline-dot">
                    ✓
                  </div>

                  <div>

                    <strong>
                      Complaint Reported
                    </strong>

                    <span>
                      Issue submitted by student
                    </span>

                  </div>

                </div>


                <div className="timeline-item active">

                  <div className="timeline-dot">
                    ✓
                  </div>

                  <div>

                    <strong>
                      Under Review
                    </strong>

                    <span>
                      Administration reviewing complaint
                    </span>

                  </div>

                </div>


                <div className="timeline-item current">

                  <div className="timeline-dot">
                    •
                  </div>

                  <div>

                    <strong>
                      Current Status
                    </strong>

                    <span>
                      {statusText}
                    </span>

                  </div>

                </div>

              </div>

            </section>

          </aside>

        </div>

      </main>

    </div>
  );
}

export default AdminComplaintDetails;