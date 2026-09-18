import { useEffect, useState } from "react";
import "./ApproverDashboard.css";

function AdminComplaintDetails({ complaint, onBack }) {
  const [status, setStatus] = useState(
    complaint?.status || "PENDING"
  );

  const [resolutionNote, setResolutionNote] = useState("");
  const [proofImage, setProofImage] = useState(null);

  const [feedback, setFeedback] = useState(null);
  const [feedbackLoading, setFeedbackLoading] = useState(true);

  /* =====================================================
     FETCH FEEDBACK
  ===================================================== */

  useEffect(() => {
    const fetchFeedback = async () => {
      if (!complaint?.issue_id) {
        setFeedbackLoading(false);
        return;
      }

      setFeedbackLoading(true);

      try {
        const response = await fetch(
          `http://localhost:5000/api/issues/${complaint.issue_id}/feedback`
        );

        const data = await response.json();

        if (response.ok && data.feedback) {
          setFeedback(data.feedback);
        } else {
          setFeedback(null);
        }
      } catch (error) {
        console.error("FEEDBACK FETCH ERROR:", error);
        setFeedback(null);
      } finally {
        setFeedbackLoading(false);
      }
    };

    fetchFeedback();
  }, [complaint?.issue_id]);

  if (!complaint) {
    return (
      <div className="admin-detail-page">
        <div className="admin-detail-empty">
          <h2>Complaint not found</h2>

          <button
            className="detail-back-btn"
            onClick={onBack}
          >
            ← Back to Complaints
          </button>
        </div>
      </div>
    );
  }

  const isResolved = complaint.status === "RESOLVED";

  /* =====================================================
     STATUS
  ===================================================== */

  const formattedStatus =
    complaint.status === "IN_PROGRESS"
      ? "IN PROGRESS"
      : complaint.status;

  /* =====================================================
     UPDATE COMPLAINT
  ===================================================== */
const handleUpdate = async () => {
  if (
    status === "RESOLVED" &&
    (!resolutionNote.trim() || !proofImage)
  ) {
    alert("Resolution note and proof photo are required.");
    return;
  }

  try {
    const formData = new FormData();

    formData.append("status", status);
    formData.append("resolution_note", resolutionNote);

    if (proofImage) {
      formData.append("resolution_image", proofImage);
    }

    const response = await fetch(
      `http://localhost:5000/api/issues/${complaint.issue_id}/status`,
      {
        method: "PUT",
        body: formData,
      }
    );

    const data = await response.json();

    console.log("UPDATE RESPONSE:", data);

    if (response.ok) {
      alert("Complaint updated successfully.");
      onBack();
    } else {
      alert(data.message || "Failed to update complaint.");
    }
  } catch (error) {
    console.error("UPDATE COMPLAINT ERROR:", error);
    alert("Something went wrong while updating complaint.");
  }
};
 

  /* =====================================================
     RESOLUTION IMAGE
  ===================================================== */

  const resolutionImage = complaint.resolution_image_url
    ? complaint.resolution_image_url.startsWith("http")
      ? complaint.resolution_image_url
      : `http://localhost:5000${complaint.resolution_image_url}`
    : null;

  return (
    <div className="admin-detail-page">

      {/* =================================================
          NAVBAR
      ================================================= */}

      <nav className="detail-navbar">

        <div className="detail-brand">
          <div className="detail-brand-icon">
            🛡️
          </div>

          <div className="detail-brand-text">
            <strong>Campus Civic</strong>
            <span>Administration Portal</span>
          </div>
        </div>

        <div className="detail-user">

          <div className="detail-avatar">
            A
          </div>

          <div className="detail-user-text">
            <strong>Administrator</strong>
            <span>Campus Admin</span>
          </div>

        </div>

      </nav>


      {/* =================================================
          MAIN
      ================================================= */}

      <main className="detail-content">

        {/* BACK */}

        <button
          className="detail-back-btn"
          onClick={onBack}
        >
          ← Back to Complaints
        </button>


        {/* =================================================
            HERO
        ================================================= */}

        <section className="complaint-hero">

          <div className="hero-left">

            <div className="hero-topline">

              <span className="hero-label">
                COMPLAINT #{complaint.issue_id}
              </span>

              <span className="hero-separator">
                •
              </span>

              <span className="hero-type">
                CAMPUS ISSUE
              </span>

            </div>

            <h1>
              {complaint.title}
            </h1>

            <div className="hero-tags">

              <span>
                {complaint.category_name || "General"}
              </span>

              <span>
                {complaint.location ||
                  "Location not specified"}
              </span>

              <span
                className={`priority-pill ${
                  complaint.priority?.toLowerCase() ||
                  "medium"
                }`}
              >
                {complaint.priority || "MEDIUM"}
              </span>

            </div>

          </div>

          <div
            className={`hero-status ${
              complaint.status
                ?.toLowerCase()
                .replace("_", "-")
            }`}
          >
            <span className="status-dot"></span>

            {formattedStatus}
          </div>

        </section>


        {/* =================================================
            INFORMATION STRIP
        ================================================= */}

        <section className="complaint-info-strip">

          <div className="info-item">

            <div className="info-icon">
              👤
            </div>

            <div>
              <small>REPORTED BY</small>

              <strong>
                {complaint.reporter_name ||
                  "Test Student"}
              </strong>
            </div>

          </div>


          <div className="info-item">

            <div className="info-icon">
              📍
            </div>

            <div>
              <small>LOCATION</small>

              <strong>
                {complaint.location ||
                  "Not specified"}
              </strong>
            </div>

          </div>


          <div className="info-item">

            <div className="info-icon">
              ⚡
            </div>

            <div>
              <small>PRIORITY</small>

              <strong
                className={`priority-text ${
                  complaint.priority?.toLowerCase() ||
                  "medium"
                }`}
              >
                {complaint.priority || "MEDIUM"}
              </strong>
            </div>

          </div>


          <div className="info-item">

            <div className="info-icon">
              🏢
            </div>

            <div>
              <small>DEPARTMENT</small>

              <strong>
                {complaint.department_name ||
                  "Campus Maintenance"}
              </strong>
            </div>

          </div>

        </section>


        {/* =================================================
            FULL WIDTH COMPLAINT AREA
        ================================================= */}

        <div className="admin-detail-full-layout">


          {/* =================================================
              COMPLAINT DESCRIPTION
          ================================================= */}

          <section className="detail-card complaint-main-card">

            <div className="section-heading">

              <div className="section-icon">
                📝
              </div>

              <div>
                <span>COMPLAINT</span>

                <h2>
                  Issue Description
                </h2>
              </div>

            </div>

            <div className="complaint-description">
              {complaint.description ||
                "No description provided."}
            </div>

          </section>


          {/* =================================================
              INFORMATION ROW
          ================================================= */}

          <div className="detail-info-row">


            {/* REPORTER */}

            <section className="detail-card reporter-card">

              <div className="section-heading">

                <div className="section-icon">
                  👤
                </div>

                <div>
                  <span>REPORTER</span>

                  <h2>
                    Submitted By
                  </h2>
                </div>

              </div>

              <div className="reporter-main">

                <div className="reporter-avatar-large">
                  {(complaint.reporter_name ||
                    "T")
                    .charAt(0)
                    .toUpperCase()}
                </div>

                <div className="reporter-name">

                  <strong>
                    {complaint.reporter_name ||
                      "Test Student"}
                  </strong>

                  <span>
                    Student
                  </span>

                </div>

              </div>

              <div className="reporter-meta">

                <div>
                  <small>Department</small>

                  <strong>
                    {complaint.reporter_department ||
                      complaint.department_name ||
                      "Information Technology"}
                  </strong>
                </div>

                <div>
                  <small>Year</small>

                  <strong>
                    {complaint.year ||
                      "3rd Year"}
                  </strong>
                </div>

              </div>

            </section>


            {/* CASE STATUS */}

            <section className="detail-card status-card">

              <div className="section-heading">

                <div className="section-icon">
                  ◉
                </div>

                <div>
                  <span>CASE STATUS</span>

                  <h2>
                    Complaint Progress
                  </h2>
                </div>

              </div>

              <div className="case-timeline">

                <div className="case-step completed">

                  <div className="case-marker">
                    ✓
                  </div>

                  <div className="case-step-content">

                    <strong>
                      Complaint Reported
                    </strong>

                    <span>
                      Issue submitted by student
                    </span>

                  </div>

                </div>

                <div className="case-line"></div>

                <div className="case-step completed">

                  <div className="case-marker">
                    ✓
                  </div>

                  <div className="case-step-content">

                    <strong>
                      Under Review
                    </strong>

                    <span>
                      Administration reviewed
                      the complaint
                    </span>

                  </div>

                </div>

                <div className="case-line"></div>

                <div
                  className={`case-step ${
                    isResolved
                      ? "completed"
                      : "current"
                  }`}
                >

                  <div className="case-marker">
                    {isResolved ? "✓" : "•"}
                  </div>

                  <div className="case-step-content">

                    <strong>
                      {isResolved
                        ? "Resolved"
                        : formattedStatus}
                    </strong>

                    <span>
                      {isResolved
                        ? "Complaint successfully completed"
                        : "Current complaint status"}
                    </span>

                  </div>

                </div>

              </div>

            </section>


            {/* ASSIGNMENT */}

            <section className="detail-card department-card">

              <div className="section-heading">

                <div className="section-icon">
                  🏢
                </div>

                <div>
                  <span>ASSIGNMENT</span>

                  <h2>
                    Responsible Department
                  </h2>
                </div>

              </div>

              <div className="department-row">

                <div className="department-letter">
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

          </div>


          {/* =================================================
              FEEDBACK + RESOLUTION
          ================================================= */}

          <div className="detail-bottom-row">


            {/* FEEDBACK */}

            <section className="detail-card feedback-card">

              <div className="section-heading">

                <div className="section-icon feedback-section-icon">
                  ★
                </div>

                <div>
                  <span>USER FEEDBACK</span>

                  <h2>
                    Reporter Response
                  </h2>
                </div>

              </div>

              {feedbackLoading ? (

                <div className="feedback-loading">
                  Loading feedback...
                </div>

              ) : feedback ? (

                <div className="feedback-result">

                  <div className="feedback-score">

                    <div className="feedback-stars">

                      {[1, 2, 3, 4, 5].map(
                        (star) => (
                          <span
                            key={star}
                            className={
                              Number(
                                feedback.rating
                              ) >= star
                                ? "star-active"
                                : "star-inactive"
                            }
                          >
                            ★
                          </span>
                        )
                      )}

                    </div>

                    <strong>
                      {feedback.rating}/5
                    </strong>

                  </div>

                  {feedback.comment ? (

                    <div className="feedback-comment">
                      “{feedback.comment}”
                    </div>

                  ) : (

                    <div className="feedback-no-comment">
                      No written comment provided.
                    </div>

                  )}

                </div>

              ) : (

                <div className="feedback-empty">

                  <div className="feedback-empty-icon">
                    ★
                  </div>

                  <strong>
                    No feedback yet
                  </strong>

                  <p>
                    The reporter has not submitted
                    a rating or written feedback.
                  </p>

                </div>

              )}

            </section>


            {/* RESOLUTION */}

            <section className="detail-card resolution-card">

              <div className="section-heading">

                <div className="section-icon resolution-section-icon">
                  ✓
                </div>

                <div>
                  <span>RESOLUTION</span>

                  <h2>
                    Resolution Details
                  </h2>
                </div>

              </div>

              {isResolved ? (

                <>

                  <div className="resolved-message">

                    <div className="resolved-check">
                      ✓
                    </div>

                    <div>

                      <strong>
                        Complaint Resolved
                      </strong>

                      <p>
                        This complaint has been
                        successfully resolved by
                        the administration.
                      </p>

                    </div>

                  </div>

                  {complaint.resolution_note && (

                    <div className="resolution-note">

                      <small>
                        RESOLUTION NOTE
                      </small>

                      <p>
                        {complaint.resolution_note}
                      </p>

                    </div>

                  )}

                  {resolutionImage ? (

                    <div className="resolution-image-wrapper">

                      <div className="resolution-image-label">
                        RESOLUTION PROOF
                      </div>
                      <img
  src={
    complaint.resolution_image_url
      ? `http://localhost:5000${complaint.resolution_image_url}`
      : ""
  }
  alt="Resolution proof"
  className="resolution-proof-image"
/>

                    </div>

                  ) : (

                    <div className="no-proof-small">

                      <span>📷</span>

                      <div>

                        <strong>
                          No proof image uploaded
                        </strong>

                        <p>
                          No resolution photo is
                          available for this complaint.
                        </p>

                      </div>

                    </div>

                  )}

                </>

              ) : (

                <div className="pending-resolution">

                  <span>⏳</span>

                  <div>

                    <strong>
                      Resolution pending
                    </strong>

                    <p>
                      Resolution details will appear
                      here after the complaint is
                      completed.
                    </p>

                  </div>

                </div>

              )}

            </section>

          </div>


          {/* =================================================
              ADMIN ACTION - FULL WIDTH
          ================================================= */}

          {!isResolved && (

            <section className="detail-card admin-action-card admin-action-full-width">

              <div className="section-heading">

                <div className="section-icon">
                  ⚙
                </div>

                <div>

                  <span>
                    ADMIN ACTION
                  </span>

                  <h2>
                    Update Complaint
                  </h2>

                </div>

              </div>


              {/* STATUS + NOTE */}

              <div className="admin-form-top-row">


                <div className="admin-form-field">

                  <label htmlFor="complaint-status">
                    Status
                  </label>

                  <select
                    id="complaint-status"
                    value={status}
                    onChange={(e) =>
                      setStatus(e.target.value)
                    }
                  >

                    <option value="VERIFIED">
                      Verified
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


                {status === "RESOLVED" && (

                  <div className="admin-form-field admin-note-field">

                    <label htmlFor="resolution-note">
                      Resolution Note
                    </label>

                    <textarea
                      id="resolution-note"
                      value={resolutionNote}
                      onChange={(e) =>
                        setResolutionNote(e.target.value)
                      }
                      placeholder="Explain how the complaint was resolved..."
                    />

                  </div>

                )}

              </div>


              {/* PROOF + BUTTON */}

              {status === "RESOLVED" && (

                <div className="admin-proof-action-row">

                  <div className="admin-form-field">

                    <label>
                      Resolution Proof
                    </label>

                    <label className="admin-upload-box">

                      <input
                        type="file"
                        accept=".jpg,.jpeg,.png,.webp"
                        onChange={(e) =>
                          setProofImage(
                            e.target.files?.[0] || null
                          )
                        }
                      />

                      <span className="admin-upload-icon">
                        ↑
                      </span>

                      <strong>
                        {proofImage
                          ? proofImage.name
                          : "Upload proof photo"}
                      </strong>

                      <small>
                        JPG, PNG or WEBP
                      </small>

                    </label>

                  </div>


                  <div className="admin-action-button-area">

                    <button
                      type="button"
                      className="admin-update-button"
                      onClick={handleUpdate}
                    >
                      ✓ Update Complaint
                    </button>

                  </div>

                </div>

              )}


              {/* NON RESOLVED */}

              {status !== "RESOLVED" && (

                <div className="admin-non-resolved-action">

                  <button
                    type="button"
                    className="admin-update-button"
                    onClick={handleUpdate}
                  >
                    ✓ Update Complaint
                  </button>

                </div>

              )}

            </section>

          )}

        </div>

      </main>

    </div>
  );
}

export default AdminComplaintDetails;