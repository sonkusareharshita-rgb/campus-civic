
import { useEffect, useState } from "react";
import "./AdminDashboard.css";
import AIPanel from "./AIPanel";

function AdminDashboard({ onLogout, onComplaintClick, currentUser, onManageAdmins, onAnalytics }) {
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedFilter, setSelectedFilter] = useState("ALL");
  const [activeTab, setActiveTab] = useState("complaints"); // "complaints" | "ai"

  useEffect(() => {
    fetchComplaints();
  }, []);

  // =====================================================
  // FETCH COMPLAINTS
  // =====================================================

  const fetchComplaints = async () => {
    setLoading(true);

    try {
      const response = await fetch(
        "http://localhost:5000/api/issues/all"
      );

      const data = await response.json();

      if (response.ok) {
        const adminComplaints = (data.issues || []).filter(
          (issue) =>
            issue.status === "VERIFIED" ||
            issue.status === "IN_PROGRESS" ||
            issue.status === "RESOLVED"
        );

        setComplaints(adminComplaints);
      } else {
        console.error(data.message);
      }
    } catch (error) {
      console.error("Failed to fetch complaints:", error);
    } finally {
      setLoading(false);
    }
  };

  // =====================================================
  // STATISTICS
  // =====================================================

  const totalComplaints = complaints.length;

  const verifiedComplaints = complaints.filter(
    (issue) => issue.status === "VERIFIED"
  ).length;

  const progressComplaints = complaints.filter(
    (issue) => issue.status === "IN_PROGRESS"
  ).length;

  const resolvedComplaints = complaints.filter(
    (issue) => issue.status === "RESOLVED"
  ).length;

  // =====================================================
  // PRIORITY COUNTS
  // =====================================================

  const highPriorityComplaints = complaints.filter(
    (issue) =>
      (issue.priority || "").toUpperCase() === "HIGH"
  ).length;

  const mediumPriorityComplaints = complaints.filter(
    (issue) =>
      (issue.priority || "").toUpperCase() === "MEDIUM"
  ).length;

  const lowPriorityComplaints = complaints.filter(
    (issue) =>
      (issue.priority || "").toUpperCase() === "LOW"
  ).length;

  // =====================================================
  // PRIORITY / STATUS FILTER
  // =====================================================

  const filteredComplaints = complaints.filter((issue) => {
    if (selectedFilter === "HIGH" || selectedFilter === "MEDIUM" || selectedFilter === "LOW") {
      return (issue.priority || "").toUpperCase() === selectedFilter;
    }

    if (selectedFilter === "VERIFIED" || selectedFilter === "IN_PROGRESS" || selectedFilter === "RESOLVED") {
      return (issue.status || "").toUpperCase() === selectedFilter;
    }

    return true; // For "ALL" or anything else
  });

  // =====================================================
  // FILTER INFO
  // =====================================================

  const filterInfo = {
    ALL: {
      title: "All Complaints",
      subtitle:
        "Overview of all complaints currently handled by administration",
    },

    VERIFIED: {
      title: "Awaiting Action",
      subtitle:
        "Complaints verified by approvers and waiting for administrative assignment or action",
    },

    IN_PROGRESS: {
      title: "In Progress",
      subtitle:
        "Complaints currently being handled and resolved by department teams",
    },

    RESOLVED: {
      title: "Resolved Complaints",
      subtitle:
        "Complaints successfully completed and marked as resolved",
    },

    HIGH: {
      title: "High Priority Complaints",
      subtitle:
        "Complaints requiring higher priority administrative attention",
    },

    MEDIUM: {
      title: "Medium Priority Complaints",
      subtitle:
        "Complaints with medium administrative priority",
    },

    LOW: {
      title: "Low Priority Complaints",
      subtitle:
        "Complaints with lower administrative priority",
    },
  };

  const currentFilter = filterInfo[selectedFilter] || {
    title: "All Complaints",
    subtitle: "Overview of all complaints currently handled by administration",
  };

  // =====================================================
  // SELECT FILTER
  // =====================================================

  const selectFilter = (filter) => {
    setSelectedFilter(filter);

    setTimeout(() => {
      document
        .getElementById("complaints-section")
        ?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
    }, 50);
  };

  // =====================================================
  // UI
  // =====================================================

  return (
    <div className="admin-page">

      {/* =================================================
          NAVBAR
      ================================================= */}

      <nav className="admin-navbar">

        <div className="admin-logo">
          <span className="admin-logo-icon">
            🛡️
          </span>

          <div>
            <strong>Campus Civic</strong>
            <small>Administration</small>
          </div>
        </div>

        <div className="admin-user">

          <div className="admin-user-info">

            <div className="admin-avatar">
              {(currentUser?.name || "A").charAt(0).toUpperCase()}
            </div>

            <div>
              <strong>{currentUser?.name || "Administrator"}</strong>
              <small>{currentUser?.email || "Admin Portal"}</small>
            </div>

          </div>

          <button
            className="admin-logout"
            onClick={onLogout}
          >
            Logout
          </button>

        </div>

      </nav>


      {/* =================================================
          MAIN
      ================================================= */}

      <main className="admin-content">

        {/* =================================================
            HERO
        ================================================= */}

        <div className="admin-heading">

          <div>

            <div className="admin-tagline">
              <span className="online-dot"></span>
              ADMINISTRATION PORTAL
            </div>

            <h1>
              Admin Dashboard
            </h1>

            <p>
              Manage verified campus complaints and monitor
              their resolution progress.
            </p>

          </div>

          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", alignItems: "center" }}>

          {/* Analytics — all admins */}
          <button
            className="dashboard-refresh"
            onClick={onAnalytics}
            style={{ background: "rgba(16,185,129,0.12)", borderColor: "rgba(16,185,129,0.3)", color: "#34d399" }}
          >
            📊 Analytics
          </button>

          {/* AI Panel tab */}
          <button
            className="dashboard-refresh"
            onClick={() => setActiveTab(t => t === "ai" ? "complaints" : "ai")}
            style={{
              background: activeTab === "ai" ? "rgba(99,102,241,0.25)" : "rgba(99,102,241,0.08)",
              borderColor: "rgba(99,102,241,0.4)", color: "#818cf8",
              fontWeight: activeTab === "ai" ? "800" : "600",
            }}
          >
            🤖 AI Centre
          </button>

          {/* Manage Admins — Super Admin only */}
          {Number(currentUser?.admin_type_id) === 1 && (
            <button
              className="dashboard-refresh"
              onClick={onManageAdmins}
              style={{ background: "rgba(99,102,241,0.15)", borderColor: "rgba(99,102,241,0.3)", color: "#818cf8" }}
            >
              🏛️ Manage Admins
            </button>
          )}

          <button
            className="dashboard-refresh"
            onClick={fetchComplaints}
            disabled={loading}
          >
            <span className={loading ? "spin" : ""}>
              ↻
            </span>

            {loading
              ? "Refreshing..."
              : "Refresh"}
          </button>

          </div>

        </div>


        {/* =================================================
            STAT CARDS
        ================================================= */}

        {/* Render AIPanel or Complaints based on active tab */}
        {activeTab === "ai" && <AIPanel />}
        {activeTab !== "ai" && (
        <section className="admin-stats">

          {/* TOTAL */}

          <button
            type="button"
            className={`admin-stat-card total-card ${
              selectedFilter === "ALL"
                ? "stat-card-active"
                : ""
            }`}
            onClick={() => selectFilter("ALL")}
          >

            <div className="stat-top">

              <div className="stat-icon">
                📋
              </div>

              <span className="stat-arrow">
                →
              </span>

            </div>

            <div className="stat-number">
              {totalComplaints}
            </div>

            <div className="stat-label">
              Total Complaints
            </div>

            <div className="stat-hint">
              View all complaints
            </div>

          </button>


          {/* VERIFIED */}

          <button
            type="button"
            className={`admin-stat-card verified-card ${
              selectedFilter === "VERIFIED"
                ? "stat-card-active"
                : ""
            }`}
            onClick={() => selectFilter("VERIFIED")}
          >

            <div className="stat-top">

              <div className="stat-icon">
                🔎
              </div>

              <span className="stat-arrow">
                →
              </span>

            </div>

            <div className="stat-number">
              {verifiedComplaints}
            </div>

            <div className="stat-label">
              Awaiting Action
            </div>

            <div className="stat-hint">
              Need administrative action
            </div>

          </button>


          {/* PROGRESS */}

          <button
            type="button"
            className={`admin-stat-card progress-card ${
              selectedFilter === "IN_PROGRESS"
                ? "stat-card-active"
                : ""
            }`}
            onClick={() =>
              selectFilter("IN_PROGRESS")
            }
          >

            <div className="stat-top">

              <div className="stat-icon">
                🔄
              </div>

              <span className="stat-arrow">
                →
              </span>

            </div>

            <div className="stat-number">
              {progressComplaints}
            </div>

            <div className="stat-label">
              In Progress
            </div>

            <div className="stat-hint">
              Currently being handled
            </div>

          </button>


          {/* RESOLVED */}

          <button
            type="button"
            className={`admin-stat-card resolved-card ${
              selectedFilter === "RESOLVED"
                ? "stat-card-active"
                : ""
            }`}
            onClick={() =>
              selectFilter("RESOLVED")
            }
          >

            <div className="stat-top">

              <div className="stat-icon">
                ✓
              </div>

              <span className="stat-arrow">
                →
              </span>

            </div>

            <div className="stat-number">
              {resolvedComplaints}
            </div>

            <div className="stat-label">
              Resolved
            </div>

            <div className="stat-hint">
              Successfully completed
            </div>

          </button>

        </section>
        )}
        {activeTab !== "ai" && (
        <section
          className="admin-section complaints-panel"
          id="complaints-section"
        >

          {/* SECTION HEADER */}

          <div className="complaints-header">

            <div>

              <div className="section-eyebrow">
                COMPLAINT MANAGEMENT
              </div>

              <h2>
                {currentFilter.title}
              </h2>

              <p>
                {currentFilter.subtitle}
              </p>

            </div>

            <div className="complaint-count">

              <strong>
                {filteredComplaints.length}
              </strong>

              <span>
                {filteredComplaints.length === 1
                  ? "Complaint"
                  : "Complaints"}
              </span>

            </div>

          </div>


          {/* =================================================
              PRIORITY FILTER TABS
          ================================================= */}

          <div className="complaint-filters">

            {/* ALL */}
            <button
              className={selectedFilter === "ALL" ? "filter-active" : ""}
              onClick={() => selectFilter("ALL")}
            >
              All
              <span>{totalComplaints}</span>
            </button>

            {/* AWAITING ACTION (VERIFIED) */}
            <button
              className={selectedFilter === "VERIFIED" ? "filter-active" : ""}
              onClick={() => selectFilter("VERIFIED")}
            >
              Awaiting Action
              <span>{verifiedComplaints}</span>
            </button>

            {/* IN PROGRESS */}
            <button
              className={selectedFilter === "IN_PROGRESS" ? "filter-active" : ""}
              onClick={() => selectFilter("IN_PROGRESS")}
            >
              In Progress
              <span>{progressComplaints}</span>
            </button>

            {/* RESOLVED */}
            <button
              className={selectedFilter === "RESOLVED" ? "filter-active" : ""}
              onClick={() => selectFilter("RESOLVED")}
            >
              Resolved
              <span>{resolvedComplaints}</span>
            </button>

            <span className="filter-divider"></span>

            {/* HIGH */}
            <button
              className={selectedFilter === "HIGH" ? "filter-active" : ""}
              onClick={() => selectFilter("HIGH")}
            >
              High
              <span>{highPriorityComplaints}</span>
            </button>

            {/* MEDIUM */}
            <button
              className={selectedFilter === "MEDIUM" ? "filter-active" : ""}
              onClick={() => selectFilter("MEDIUM")}
            >
              Medium
              <span>{mediumPriorityComplaints}</span>
            </button>

            {/* LOW */}
            <button
              className={selectedFilter === "LOW" ? "filter-active" : ""}
              onClick={() => selectFilter("LOW")}
            >
              Low
              <span>{lowPriorityComplaints}</span>
            </button>

          </div>


          {/* =================================================
              TABLE
          ================================================= */}

          <div className="complaint-table">

            {/* HEADER */}

            <div className="table-header">

              <span>
                Complaint
              </span>

              <span>
                Category
              </span>

              <span>
                Priority
              </span>

              <span>
                Status
              </span>

            </div>


            {/* LOADING */}

            {loading && (

              <div className="empty-complaints">

                <div className="loading-spinner">
                  ↻
                </div>

                <strong>
                  Loading complaints
                </strong>

                <p>
                  Fetching the latest complaint data...
                </p>

              </div>

            )}


            {/* EMPTY */}

            {!loading &&
              filteredComplaints.length === 0 && (

              <div className="empty-complaints">

                <div className="empty-icon">
                  📭
                </div>

                <strong>
                  No complaints found
                </strong>

                <p>
                  There are currently no complaints
                  in this priority.
                </p>

              </div>

            )}


            {/* COMPLAINTS */}

            {!loading &&
              filteredComplaints.map((issue) => (

              <div
                className="complaint-row complaint-clickable"
                key={issue.issue_id}
                onClick={() =>
                  onComplaintClick(issue)
                }
              >

                {/* COMPLAINT */}

                <div className="complaint-main">

                  <div className="complaint-icon">

                    {issue.status === "RESOLVED"
                      ? "✓"
                      : issue.status === "IN_PROGRESS"
                      ? "↻"
                      : "!"}

                  </div>

                  <div className="complaint-info">

                    <strong>
                      {issue.title}
                    </strong>

                    <small>
                      📍 {issue.location}
                    </small>

                  </div>

                </div>


                {/* CATEGORY */}

                <span className="category-text">
                  {issue.category_name ||
                    "General"}
                </span>


                {/* PRIORITY */}

                <span
                  className={`priority ${
                    issue.priority?.toLowerCase() ||
                    "medium"
                  }`}
                >

                  <span className="priority-dot"></span>

                  {issue.priority ||
                    "MEDIUM"}

                </span>


                {/* STATUS */}

                <span
                  className={`status ${
                    issue.status === "RESOLVED"
                      ? "resolved-status"
                      : issue.status === "IN_PROGRESS"
                      ? "progress-status"
                      : "pending-status"
                  }`}
                >

                  <span className="status-dot"></span>

                  {issue.status === "VERIFIED"
                    ? "VERIFIED"
                    : issue.status?.replace(
                        "_",
                        " "
                      )}

                </span>

              </div>

            ))}

          </div>

        </section>
        )}

      </main>

    </div>
  );
}

export default AdminDashboard;
