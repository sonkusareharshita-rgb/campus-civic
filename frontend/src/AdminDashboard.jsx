import { useEffect, useState } from "react";
import "./App.css";

function AdminDashboard({ onLogout, onComplaintClick }) {
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchComplaints();
  }, []);

  // =====================================================
  // FETCH COMPLAINTS FOR ADMIN
  // =====================================================

  const fetchComplaints = async () => {
    setLoading(true);

    try {
      const response = await fetch(
        "http://localhost:5000/api/issues/all"
      );

      const data = await response.json();

      if (response.ok) {
        // Only show complaints that have passed approver
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
      console.error(
        "Failed to fetch complaints:",
        error
      );
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
  // UI
  // =====================================================

  return (
    <div className="admin-page">

      {/* NAVBAR */}

      <nav className="admin-navbar">

        <div className="admin-logo">
          🛡️ Campus Civic
        </div>

        <div className="admin-user">

          <span>
            Administrator
          </span>

          <button
            className="admin-logout"
            onClick={onLogout}
          >
            Logout
          </button>

        </div>

      </nav>


      {/* MAIN CONTENT */}

      <main className="admin-content">

        {/* HEADING */}

        <div className="admin-heading">

          <div>

            <p className="admin-tagline">
              ADMINISTRATION PORTAL
            </p>

            <h1>
              Admin Dashboard 👋
            </h1>

            <p>
              Manage verified campus complaints and track
              their resolution progress.
            </p>

          </div>

        </div>


        {/* STATISTICS */}

        <section className="admin-stats">

          {/* TOTAL */}

          <div className="admin-stat-card">

            <div className="stat-icon">
              📋
            </div>

            <div>

              <strong>
                {totalComplaints}
              </strong>

              <span>
                Total Complaints
              </span>

            </div>

          </div>


          {/* VERIFIED */}

          <div className="admin-stat-card">

            <div className="stat-icon">
              🔎
            </div>

            <div>

              <strong>
                {verifiedComplaints}
              </strong>

              <span>
                Awaiting Action
              </span>

            </div>

          </div>


          {/* IN PROGRESS */}

          <div className="admin-stat-card">

            <div className="stat-icon">
              🔄
            </div>

            <div>

              <strong>
                {progressComplaints}
              </strong>

              <span>
                In Progress
              </span>

            </div>

          </div>


          {/* RESOLVED */}

          <div className="admin-stat-card">

            <div className="stat-icon">
              ✅
            </div>

            <div>

              <strong>
                {resolvedComplaints}
              </strong>

              <span>
                Resolved
              </span>

            </div>

          </div>

        </section>


        {/* QUICK ACTIONS */}

        <section className="admin-section">

          <div className="section-title">

            <h2>
              Quick Actions
            </h2>

          </div>


          <div className="admin-actions">

            {/* REFRESH */}

            <button
              className="admin-action-card"
              onClick={fetchComplaints}
            >

              <span>
                🔄
              </span>

              <div>

                <strong>
                  Refresh Complaints
                </strong>

                <small>
                  Get latest verified complaints
                </small>

              </div>

            </button>


            {/* HIGH PRIORITY */}

            <button
              className="admin-action-card"
              onClick={() => {

                const highPriority =
                  complaints.filter(
                    (issue) =>
                      issue.priority === "HIGH"
                  );

                alert(
                  highPriority.length === 0
                    ? "No high priority complaints."
                    : `${highPriority.length} high priority complaint(s) found.`
                );

              }}
            >

              <span>
                🔴
              </span>

              <div>

                <strong>
                  High Priority
                </strong>

                <small>
                  View urgent complaints
                </small>

              </div>

            </button>


            {/* AWAITING ACTION */}

            <button
              className="admin-action-card"
              onClick={() => {

                alert(
                  `${verifiedComplaints} complaint(s) are awaiting administrative action.`
                );

              }}
            >

              <span>
                ⏳
              </span>

              <div>

                <strong>
                  Awaiting Action
                </strong>

                <small>
                  Verified by approver
                </small>

              </div>

            </button>


            {/* RESOLVED */}

            <button
              className="admin-action-card"
              onClick={() => {

                alert(
                  `${resolvedComplaints} complaint(s) have been resolved.`
                );

              }}
            >

              <span>
                ✅
              </span>

              <div>

                <strong>
                  Resolved Issues
                </strong>

                <small>
                  Successfully completed
                </small>

              </div>

            </button>

          </div>

        </section>


        {/* RECENT COMPLAINTS */}

        <section className="admin-section">

          <div className="section-title">

            <div>

              <h2>
                Verified Complaints
              </h2>

              <p>
                Complaints approved by the verification team
              </p>

            </div>


            <button
              className="view-all-btn"
              onClick={fetchComplaints}
            >
              Refresh
            </button>

          </div>


          <div className="complaint-table">

            {/* TABLE HEADER */}

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
                Loading complaints...
              </div>

            )}


            {/* EMPTY */}

            {!loading &&
              complaints.length === 0 && (

              <div className="empty-complaints">

                <div>
                  📭
                </div>

                <strong>
                  No verified complaints
                </strong>

                <p>
                  Complaints approved by the approver
                  will appear here.
                </p>

              </div>

            )}


            {/* COMPLAINT LIST */}

            {!loading &&
              complaints.map((issue) => (

              <div
                className="complaint-row complaint-clickable"

                key={issue.issue_id}

                onClick={() =>
                  onComplaintClick(issue)
                }
              >

                {/* TITLE */}

                <div>

                  <strong>
                    {issue.title}
                  </strong>

                  <small>
                    📍 {issue.location}
                  </small>

                </div>


                {/* CATEGORY */}

                <span>
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

      </main>

    </div>
  );
}

export default AdminDashboard;