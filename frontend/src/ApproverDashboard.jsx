import { useEffect, useRef, useState } from "react";
import "./ApproverDashboard.css";

function ApproverDashboard({
  user,
  onLogout,
  onComplaintClick,
}) {
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);

  // Controls which complaint list is displayed
  const [activeFilter, setActiveFilter] = useState("PENDING");

  // Complaint queue reference for automatic scroll
  const complaintQueueRef = useRef(null);

  // Supporter modal
  const [selectedSupporters, setSelectedSupporters] = useState([]);
  const [showSupporters, setShowSupporters] = useState(false);

  useEffect(() => {
    fetchComplaints();
  }, []);

  // =====================================================
  // FETCH ALL COMPLAINTS
  // =====================================================

  const fetchComplaints = async () => {
    try {
      setLoading(true);

      const response = await fetch(
        "http://localhost:5000/api/issues/all"
      );

      const data = await response.json();

      if (response.ok) {
        setComplaints(data.issues || data);
      } else {
        console.error(data.message);
      }
    } catch (error) {
      console.error("Error loading complaints:", error);
    } finally {
      setLoading(false);
    }
  };

  // =====================================================
  // STATUS FILTERS
  // =====================================================

  const pendingComplaints = complaints.filter(
    (complaint) =>
      complaint.status === "SUBMITTED" ||
      complaint.status === "PENDING"
  );

  const approvedComplaints = complaints.filter(
    (complaint) =>
      complaint.status === "APPROVED" ||
      complaint.status === "VERIFIED"
  );

  const rejectedComplaints = complaints.filter(
    (complaint) =>
      complaint.status === "REJECTED"
  );

  // =====================================================
  // TOTAL VALID COMPLAINTS
  // =====================================================

  const totalComplaints =
    pendingComplaints.length +
    approvedComplaints.length +
    rejectedComplaints.length;

  // =====================================================
  // DISPLAYED COMPLAINTS
  // =====================================================

  const displayedComplaints =
    activeFilter === "PENDING"
      ? pendingComplaints
      : activeFilter === "APPROVED"
      ? approvedComplaints
      : activeFilter === "REJECTED"
      ? rejectedComplaints
      : [
          ...pendingComplaints,
          ...approvedComplaints,
          ...rejectedComplaints,
        ];

  // =====================================================
  // FILTER TITLE
  // =====================================================

  const getQueueTitle = () => {
    switch (activeFilter) {
      case "APPROVED":
        return "Approved Complaints";

      case "REJECTED":
        return "Rejected Complaints";

      case "ALL":
        return "All Complaints";

      default:
        return "Pending Verification";
    }
  };

  const getQueueDescription = () => {
    switch (activeFilter) {
      case "APPROVED":
        return "Complaints that have been verified and approved.";

      case "REJECTED":
        return "Complaints that were rejected during verification.";

      case "ALL":
        return "All complaints currently recorded in the verification workflow.";

      default:
        return "Review these complaints before they are forwarded to the administration.";
    }
  };

  // =====================================================
  // PRIORITY
  // =====================================================

  const getPriorityClass = (priority) => {
    return (priority || "MEDIUM").toLowerCase();
  };

  // =====================================================
  // CATEGORY SHORT NAME
  // =====================================================

  const getCategory = (complaint) => {
    return complaint.category_name || "Other";
  };

  // =====================================================
  // FORMAT DATE
  // =====================================================

  const formatDate = (date) => {
    if (!date) return "Recently submitted";

    try {
      return new Date(date).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
    } catch {
      return "Recently submitted";
    }
  };

  // =====================================================
  // CARD FILTER HANDLER
  // =====================================================

  const handleFilterChange = (filter) => {
    setActiveFilter(filter);

    // Automatically scroll to complaint queue
    setTimeout(() => {
      complaintQueueRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 100);
  };

  // =====================================================
  // SUPPORT COUNT
  // =====================================================

  const getSupportCount = (complaint) => {
    return Number(complaint.report_count || 0);
  };

  // =====================================================
  // SUPPORTERS
  // =====================================================

  const getSupporters = (complaint) => {
    if (!Array.isArray(complaint.supporters)) {
      return [];
    }

    return complaint.supporters;
  };

  // =====================================================
  // OPEN PEOPLE MODAL
  // =====================================================

  const openSupportersModal = (complaint) => {
    const supporters = getSupporters(complaint);

    setSelectedSupporters(supporters);
    setShowSupporters(true);
  };

  // =====================================================
  // CLOSE PEOPLE MODAL
  // =====================================================

  const closeSupportersModal = () => {
    setShowSupporters(false);
    setSelectedSupporters([]);
  };

  // =====================================================
  // RENDER
  // =====================================================

  return (
    <div className="approver-page">

      {/* =================================================
          NAVBAR
      ================================================= */}

      <nav className="approver-navbar">

        <div className="approver-brand">

          <div className="approver-brand-icon">
            ✓
          </div>

          <div className="approver-brand-text">

            <strong>
              Campus Civic
            </strong>

            <span>
              Complaint Verification Portal
            </span>

          </div>

        </div>


        <div className="approver-profile">

          <div className="approver-avatar">
            {user?.name?.charAt(0)?.toUpperCase() || "A"}
          </div>

          <div className="approver-user-info">

            <strong>
              {user?.name || "Approver"}
            </strong>

            <span>
              Complaint Approver
            </span>

          </div>

          <button
            className="approver-logout"
            onClick={onLogout}
          >
            Logout
          </button>

        </div>

      </nav>


      {/* =================================================
          MAIN CONTENT
      ================================================= */}

      <main className="approver-content">

        {/* =================================================
            PAGE HEADER
        ================================================= */}

        <section className="approver-header">

          <div className="approver-header-left">

            <div className="approver-eyebrow">
              VERIFICATION CENTER
            </div>

            <h1>
              Complaint Verification
            </h1>

            <p>
              Review submitted complaints, verify their
              authenticity, and forward approved complaints
              to the administration.
            </p>

          </div>


          <div className="approver-header-right">

            <div className="verification-status">

              <span className="status-dot"></span>

              Verification Active

            </div>

            <button
              className="refresh-btn"
              onClick={fetchComplaints}
            >
              <span>↻</span>
              Refresh
            </button>

          </div>

        </section>


        {/* =================================================
            STATISTICS
        ================================================= */}

        <section className="approver-stats">

          {/* PENDING */}

          <div
            className="approver-stat-card pending-card"
            onClick={() =>
              handleFilterChange("PENDING")
            }
            style={{ cursor: "pointer" }}
          >

            <div className="stat-card-top">

              <div className="stat-icon">
                ⏳
              </div>

              <span className="stat-mini-label">
                NEEDS ACTION
              </span>

            </div>

            <div className="stat-number">
              {pendingComplaints.length}
            </div>

            <div className="stat-title">
              Pending Review
            </div>

            <div className="stat-description">
              Complaints waiting for verification
            </div>

          </div>


          {/* APPROVED */}

          <div
            className="approver-stat-card approved-card"
            onClick={() =>
              handleFilterChange("APPROVED")
            }
            style={{ cursor: "pointer" }}
          >

            <div className="stat-card-top">

              <div className="stat-icon">
                ✓
              </div>

              <span className="stat-mini-label">
                VERIFIED
              </span>

            </div>

            <div className="stat-number">
              {approvedComplaints.length}
            </div>

            <div className="stat-title">
              Approved
            </div>

            <div className="stat-description">
              Complaints approved by approver
            </div>

          </div>


          {/* REJECTED */}

          <div
            className="approver-stat-card rejected-card"
            onClick={() =>
              handleFilterChange("REJECTED")
            }
            style={{ cursor: "pointer" }}
          >

            <div className="stat-card-top">

              <div className="stat-icon">
                ×
              </div>

              <span className="stat-mini-label">
                DECLINED
              </span>

            </div>

            <div className="stat-number">
              {rejectedComplaints.length}
            </div>

            <div className="stat-title">
              Rejected
            </div>

            <div className="stat-description">
              Complaints rejected during review
            </div>

          </div>


          {/* TOTAL */}

          <div
            className="approver-stat-card total-card"
            onClick={() =>
              handleFilterChange("ALL")
            }
            style={{ cursor: "pointer" }}
          >

            <div className="stat-card-top">

              <div className="stat-icon">
                #
              </div>

              <span className="stat-mini-label">
                ALL CASES
              </span>

            </div>

            <div className="stat-number">
              {totalComplaints}
            </div>

            <div className="stat-title">
              Total Complaints
            </div>

            <div className="stat-description">
              All complaints in the system
            </div>

          </div>

        </section>


        {/* =================================================
            VERIFICATION WORKFLOW
        ================================================= */}

       
        {/* =================================================
            COMPLAINT QUEUE
        ================================================= */}

        <section
          className="approver-complaints-section"
          ref={complaintQueueRef}
        >

          <div className="queue-header">

            <div>

              <div className="queue-eyebrow">
                COMPLAINT QUEUE
              </div>

              <div className="queue-title-row">

                <h2>
                  {getQueueTitle()}
                </h2>

                <span className="queue-count">
                  {displayedComplaints.length}
                </span>

              </div>

              <p>
                {getQueueDescription()}
              </p>

            </div>


            <button
              className="queue-refresh"
              onClick={fetchComplaints}
            >
              <span>↻</span>
              Refresh Queue
            </button>

          </div>


          {/* =================================================
              LOADING
          ================================================= */}

          {loading ? (

            <div className="approver-loading">

              <div className="loading-spinner"></div>

              <h3>
                Loading complaints
              </h3>

              <p>
                Fetching the latest verification queue...
              </p>

            </div>

          ) : displayedComplaints.length === 0 ? (

            /* =================================================
               EMPTY STATE
            ================================================= */

            <div className="approver-empty">

              <div className="empty-icon">
                ✓
              </div>

              <h3>
                All caught up
              </h3>

              <p>
                There are no complaints in this category
                at the moment.
              </p>

            </div>

          ) : (

            /* =================================================
               COMPLAINT GRID
            ================================================= */

            <div className="approver-complaint-grid">

              {displayedComplaints.map(
                (complaint) => {

                  const supportCount =
                    getSupportCount(complaint);

                  const supporters =
                    getSupporters(complaint);

                  return (

                    <article
                      className="approver-complaint-card"
                      key={complaint.issue_id}
                      onClick={() =>
                        onComplaintClick(complaint)
                      }
                    >

                      {/* CARD TOP */}

                      <div className="complaint-card-header">

                        <div className="complaint-id">
                          COMPLAINT #
                          {complaint.issue_id}
                        </div>

                        <span className="pending-badge">

                          <span className="badge-dot"></span>

                          {complaint.status === "APPROVED" ||
                          complaint.status === "VERIFIED"
                            ? "Approved"
                            : complaint.status === "REJECTED"
                            ? "Rejected"
                            : "Pending Review"}

                        </span>

                      </div>


                      {/* TITLE */}

                      <div className="complaint-title-section">

                        <h3>
                          {complaint.title ||
                            "Untitled Complaint"}
                        </h3>

                        <p>
                          {complaint.description ||
                            "No description provided."}
                        </p>

                      </div>


                      {/* META */}

                      <div className="complaint-meta">

                        <div className="meta-item">

                          <span className="meta-icon">
                            👤
                          </span>

                          <div>

                            <small>
                              REPORTED BY
                            </small>

                            <strong>
                              {complaint.reported_by_name ||
                                "Campus User"}
                            </strong>

                          </div>

                        </div>


                        <div className="meta-item">

                          <span className="meta-icon">
                            📍
                          </span>

                          <div>

                            <small>
                              LOCATION
                            </small>

                            <strong>
                              {complaint.location ||
                                "Campus Location"}
                            </strong>

                          </div>

                        </div>


                        <div className="meta-item">

                          <span className="meta-icon">
                            🗂
                          </span>

                          <div>

                            <small>
                              CATEGORY
                            </small>

                            <strong>
                              {getCategory(complaint)}
                            </strong>

                          </div>

                        </div>

                      </div>


                      {/* =================================================
                          SUPPORT COUNT + VIEW PEOPLE
                      ================================================= */}

                      {supportCount > 0 && (

                        <div
                          className="complaint-support-info"
                          onClick={(e) =>
                            e.stopPropagation()
                          }
                        >

                          <div className="support-count">

                            👥{" "}
                            {supportCount}{" "}
                            {supportCount === 1
                              ? "person"
                              : "people"}{" "}
                            forwarded this complaint

                            {supporters.length > 0 && (

                              <button
                                type="button"
                                className="view-people-btn"
                                onClick={(e) => {

                                  e.stopPropagation();

                                  openSupportersModal(
                                    complaint
                                  );

                                }}
                              >
                                View people →
                              </button>

                            )}

                          </div>

                        </div>

                      )}


                      {/* FOOTER */}

                      <div className="complaint-card-footer">

                        <div className="footer-left">

                          <span
                            className={`priority-badge ${getPriorityClass(
                              complaint.priority
                            )}`}
                          >

                            <span className="priority-dot"></span>

                            {complaint.priority ||
                              "MEDIUM"}

                          </span>


                          <span className="submitted-date">

                            {formatDate(
                              complaint.created_at ||
                                complaint.submitted_at
                            )}

                          </span>

                        </div>


                        <button
                          className="review-complaint-btn"
                          onClick={(e) => {

                            e.stopPropagation();

                            onComplaintClick(
                              complaint
                            );

                          }}
                        >
                          Review
                          <span>→</span>
                        </button>

                      </div>

                    </article>

                  );

                }
              )}

            </div>

          )}

        </section>


        {/* =================================================
            PEOPLE WHO FORWARDED MODAL
        ================================================= */}

        {showSupporters && (

          <div
            className="supporters-modal-overlay"
            onClick={closeSupportersModal}
          >

            <div
              className="supporters-modal"
              onClick={(e) =>
                e.stopPropagation()
              }
            >

              {/* MODAL HEADER */}

              <div className="supporters-modal-header">

                <div>

                  <div className="queue-eyebrow">
                    COMPLAINT SUPPORT
                  </div>

                  <h2>
                    People who forwarded this complaint
                  </h2>

                  <p>
                    {selectedSupporters.length}{" "}
                    {selectedSupporters.length === 1
                      ? "person has"
                      : "people have"}{" "}
                    forwarded this complaint.
                  </p>

                </div>


                <button
                  className="supporters-close-btn"
                  onClick={closeSupportersModal}
                >
                  ×
                </button>

              </div>


              {/* PEOPLE LIST */}

              <div className="supporters-list">

                {selectedSupporters.length === 0 ? (

                  <div className="supporters-empty">
                    No supporter information available.
                  </div>

                ) : (

                  selectedSupporters.map(
                    (supporter, index) => (

                      <div
                        className="supporter-person"
                        key={
                          supporter.user_id ||
                          index
                        }
                      >

                        <div className="supporter-avatar">

                          {supporter.name
                            ?.charAt(0)
                            ?.toUpperCase() || "U"}

                        </div>


                        <div className="supporter-person-info">

                          <strong>
                            {supporter.name ||
                              "Campus User"}
                          </strong>


                          <div className="supporter-details">

                            <span>
                              🎓{" "}
                              {supporter.year ||
                                "Year not available"}
                            </span>

                            <span>
                              💻{" "}
                              {supporter.department ||
                                "Branch not available"}
                            </span>

                          </div>

                        </div>

                      </div>

                    )
                  )

                )}

              </div>


              {/* MODAL FOOTER */}

              <div className="supporters-modal-footer">

                <button
                  className="supporters-done-btn"
                  onClick={closeSupportersModal}
                >
                  Close
                </button>

              </div>

            </div>

          </div>

        )}

      </main>

    </div>
  );
}

export default ApproverDashboard;