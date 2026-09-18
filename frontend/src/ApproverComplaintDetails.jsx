
import { useState } from "react";
import "./ApproverDashboard.css";

const API_BASE_URL = "http://localhost:5000";

function ApproverComplaintDetails({
  complaint,
  onBack,
  onUpdate,
  currentUser,
}) {
  const [verificationNote, setVerificationNote] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  // ==========================================
  // GET FULL FILE URL
  // ==========================================

  const getFileUrl = (fileUrl) => {
    if (!fileUrl) return "";

    if (fileUrl.startsWith("http")) {
      return fileUrl;
    }

    return `${API_BASE_URL}${fileUrl}`;
  };

  // ==========================================
  // DISPLAY STATUS
  // ==========================================

  const getDisplayStatus = (status) => {
    switch (status) {
      case "SUBMITTED":
      case "PENDING":
        return "PENDING VERIFICATION";

      case "APPROVED":
      case "VERIFIED":
        return "VERIFIED";

      case "REJECTED":
        return "REJECTED";

      case "ASSIGNED":
        return "FORWARDED TO ADMIN";

      case "IN_PROGRESS":
        return "IN PROGRESS";

      case "RESOLVED":
        return "RESOLVED";

      default:
        return status || "PENDING VERIFICATION";
    }
  };

  // ==========================================
  // APPROVE COMPLAINT
  // ==========================================

  const handleApprove = async () => {
    if (!verificationNote.trim()) {
      alert(
        "Please add a verification note before approving."
      );
      return;
    }

    if (!currentUser?.user_id) {
      alert("Approver information not found.");
      return;
    }

    if (!complaint?.issue_id) {
      alert("Complaint information not found.");
      return;
    }

    setActionLoading(true);

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/issues/${complaint.issue_id}/approve`,
        {
          method: "PUT",

          headers: {
            "Content-Type": "application/json",
          },

          body: JSON.stringify({
            approver_id: currentUser.user_id,
            verification_note: verificationNote.trim(),
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        alert(
          data.message ||
            "Unable to approve complaint."
        );
        return;
      }

      alert(
        "Complaint verified and forwarded to admin successfully!"
      );

      if (onUpdate) {
        await onUpdate();
      }

      onBack();

    } catch (error) {
      console.error("Approve error:", error);

      alert(
        "Unable to connect to the server."
      );

    } finally {
      setActionLoading(false);
    }
  };

  // ==========================================
  // REJECT COMPLAINT
  // ==========================================

  const handleReject = async () => {
    if (!verificationNote.trim()) {
      alert(
        "Please provide a rejection reason."
      );
      return;
    }

    if (!currentUser?.user_id) {
      alert("Approver information not found.");
      return;
    }

    if (!complaint?.issue_id) {
      alert("Complaint information not found.");
      return;
    }

    const confirmed = window.confirm(
      "Are you sure you want to reject this complaint?"
    );

    if (!confirmed) {
      return;
    }

    setActionLoading(true);

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/issues/${complaint.issue_id}/reject`,
        {
          method: "PUT",

          headers: {
            "Content-Type": "application/json",
          },

          body: JSON.stringify({
            approver_id: currentUser.user_id,
            rejection_reason: verificationNote.trim(),
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        alert(
          data.message ||
            "Unable to reject complaint."
        );
        return;
      }

      alert(
        "Complaint rejected successfully."
      );

      if (onUpdate) {
        await onUpdate();
      }

      onBack();

    } catch (error) {
      console.error(
        "Reject error:",
        error
      );

      alert(
        "Unable to connect to the server."
      );

    } finally {
      setActionLoading(false);
    }
  };

  // ==========================================
  // UI
  // ==========================================

  return (
    <div className="approver-details-page">

      {/* NAVBAR */}

      <nav className="approver-navbar">

        <div className="approver-brand">

          <div className="approver-brand-icon">
            ✓
          </div>

          <div>

            <strong>
              Campus Civic
            </strong>

            <span>
              Verification Portal
            </span>

          </div>

        </div>

      </nav>


      <main className="approver-details-content">

        {/* BACK BUTTON */}

        <button
          className="approver-back-btn"
          onClick={onBack}
          disabled={actionLoading}
        >
          ← Back to Verification Queue
        </button>


        {/* HERO */}

        <section className="verification-detail-hero">

          <div className="verification-detail-left">

            <span className="verification-label">
              COMPLAINT UNDER REVIEW
            </span>

            <h1>
              {complaint?.title ||
                "Untitled Complaint"}
            </h1>

            <p>
              Complaint ID #{complaint?.issue_id}
            </p>

          </div>


          <div className="verification-status-box">

            <span>
              CURRENT STATUS
            </span>

            <strong>
              {getDisplayStatus(
                complaint?.status
              )}
            </strong>

          </div>

        </section>


        <div className="verification-details-grid">


          {/* ======================================
              LEFT SIDE
          ====================================== */}

          <div className="verification-main-column">


            {/* REPORTER INFORMATION */}

            <section className="verification-info-card">

              <div className="verification-card-heading">

                <div className="card-heading-icon">
                  👤
                </div>

                <div>

                  <h2>
                    Reporter Information
                  </h2>

                  <p>
                    Details of the complaint reporter
                  </p>

                </div>

              </div>


              <div className="reporter-information-grid">


                <div className="info-item">

                  <span>
                    Full Name
                  </span>

                  <strong>
                    {complaint?.reported_by_name ||
                      "Campus User"}
                  </strong>

                </div>


                <div className="info-item">

                  <span>
                    Department
                  </span>

                  <strong>
                    {complaint?.department_name ||
                      "Not Available"}
                  </strong>

                </div>


                <div className="info-item">

                  <span>
                    Category
                  </span>

                  <strong>
                    {complaint?.category_name ||
                      "Other"}
                  </strong>

                </div>


                <div className="info-item">

                  <span>
                    Location
                  </span>

                  <strong>
                    📍{" "}
                    {complaint?.location ||
                      "Campus"}
                  </strong>

                </div>


              </div>

            </section>


            {/* DESCRIPTION */}

            <section className="verification-info-card">

              <div className="verification-card-heading">

                <div className="card-heading-icon">
                  📄
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


              <div className="verification-description">

                {complaint?.description ||
                  "No description provided."}

              </div>

            </section>


            {/* PRIORITY */}

            <section className="verification-info-card">

              <div className="verification-card-heading">

                <div className="card-heading-icon">
                  ⚡
                </div>

                <div>

                  <h2>
                    Priority Assessment
                  </h2>

                  <p>
                    Current priority level of this complaint
                  </p>

                </div>

              </div>


              <div className="priority-assessment">

                <span
                  className={`large-priority ${
                    (
                      complaint?.priority ||
                      "MEDIUM"
                    ).toLowerCase()
                  }`}
                >

                  {complaint?.priority ||
                    "MEDIUM"}

                </span>

              </div>

            </section>


            {/* COMPLAINT IMAGE */}

            {complaint?.image_url && (

              <section className="verification-info-card">

                <div className="verification-card-heading">

                  <div className="card-heading-icon">
                    📷
                  </div>

                  <div>

                    <h2>
                      Complaint Image
                    </h2>

                    <p>
                      Evidence provided by reporter
                    </p>

                  </div>

                </div>


                <img
                  src={getFileUrl(
                    complaint.image_url
                  )}
                  alt="Complaint evidence"
                  className="complaint-evidence-image"
                  onError={(e) => {
                    console.error(
                      "Image failed to load:",
                      getFileUrl(
                        complaint.image_url
                      )
                    );

                    e.currentTarget.style.display =
                      "none";
                  }}
                />

              </section>

            )}


            {/* COMPLAINT VIDEO */}

            {complaint?.video_url && (

              <section className="verification-info-card">

                <div className="verification-card-heading">

                  <div className="card-heading-icon">
                    📹
                  </div>

                  <div>

                    <h2>
                      Complaint Video
                    </h2>

                    <p>
                      Video evidence provided by reporter
                    </p>

                  </div>

                </div>


                <video
                  controls
                  className="complaint-evidence-video"
                >

                  <source
                    src={getFileUrl(
                      complaint.video_url
                    )}
                  />

                  Your browser does not support video.

                </video>

              </section>

            )}

          </div>


          {/* ======================================
              RIGHT ACTION PANEL
          ====================================== */}

          <aside className="verification-action-panel">

            <div className="action-panel-header">

              <span>
                DECISION REQUIRED
              </span>

              <h2>
                Verify Complaint
              </h2>

              <p>
                Review the complaint carefully before
                making your decision.
              </p>

            </div>


            {/* VERIFICATION NOTE */}

            <div className="verification-note-section">

              <label>
                Verification Note *
              </label>


              <textarea
                value={verificationNote}
                onChange={(e) =>
                  setVerificationNote(
                    e.target.value
                  )
                }
                placeholder="Write your verification comments or rejection reason..."
                rows="7"
                disabled={actionLoading}
              />


              <small>
                This information will be used for
                complaint verification.
              </small>

            </div>


            {/* ACTION BUTTONS */}

            <div className="verification-actions">


              {/* APPROVE */}

              <button
                className="approve-send-btn"
                onClick={handleApprove}
                disabled={actionLoading}
              >

                <span>
                  ✓
                </span>


                <div>

                  <strong>
                    {actionLoading
                      ? "Processing..."
                      : "Approve & Send"}
                  </strong>

                  <small>
                    Forward complaint to admin
                  </small>

                </div>

              </button>


              {/* REJECT */}

              <button
                className="reject-complaint-btn"
                onClick={handleReject}
                disabled={actionLoading}
              >

                <span>
                  ✕
                </span>


                <div>

                  <strong>
                    Reject Complaint
                  </strong>

                  <small>
                    Mark as invalid or incomplete
                  </small>

                </div>

              </button>

            </div>


            {/* HELP */}

            <div className="verification-help">

              <span>
                💡
              </span>

              <p>

                Approved complaints will move to the
                administrator's complaint queue for
                further action.

              </p>

            </div>

          </aside>

        </div>

      </main>

    </div>
  );
}

export default ApproverComplaintDetails;
