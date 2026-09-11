import { useEffect, useState } from "react";
import "./App.css";

function Dashboard({
  user,
  onLogout,
  onReportIssue,
  onMyIssues,
  onTrackStatus,
}) {
  const userRole = user?.role || "STUDENT";

  const displayRole =
    userRole === "FACULTY" ? "Faculty" : "Student";

  const displayName =
    user?.name ||
    user?.full_name ||
    user?.username ||
    displayRole;
    const [notifications, setNotifications] = useState([]);

useEffect(() => {
  if (!user?.user_id) return;

  const fetchNotifications = async () => {
    try {
      const response = await fetch(
        `http://localhost:5000/api/issues/notifications/${user.user_id}`
      );

      const data = await response.json();

      if (response.ok) {
        setNotifications(data);
      }
    } catch (error) {
      console.error("Notification fetch error:", error);
    }
  };

  fetchNotifications();
}, [user?.user_id]);

  return (
    <div className="dashboard-page">

      {/* =====================================================
          NAVBAR
      ===================================================== */}

      <nav className="dashboard-navbar">

        <div className="logo">
          🏫 Campus Civic
        </div>
        <div className="dashboard-nav-right">

  <div className="notification-wrapper">
    <button
      className="notification-btn"
      onClick={() => alert(
        notifications.length > 0
          ? notifications.map(n => n.message).join("\n")
          : "No new notifications"
      )}
    >
      🔔

      {notifications.filter(n => !n.is_read).length > 0 && (
        <span className="notification-badge">
          {notifications.filter(n => !n.is_read).length}
        </span>
      )}
    </button>
  </div>

  <div className="student-name">
    👤 {displayName}
  </div>

  <button
    className="logout-btn"
    onClick={onLogout}
  >
    Logout
  </button>

</div>



      </nav>


      {/* =====================================================
          MAIN CONTENT
      ===================================================== */}

      <main className="dashboard-content">


        {/* ===================================================
            HERO
        =================================================== */}

        <section className="dashboard-hero">

          <div>

            <p className="dashboard-label">
              {displayRole.toUpperCase()} DASHBOARD
            </p>

            <h1>
              Welcome back! 👋
            </h1>

            <p>
              Manage your campus complaints, track their progress,
              and help make your campus better.
            </p>

          </div>

          <div className="dashboard-hero-icon">
            🏫
          </div>

        </section>


        {/* ===================================================
            STATISTICS
        =================================================== */}

        <section className="dashboard-stats">

          {/* TOTAL */}

          <div className="stat-card">

            <div className="stat-icon">
              📋
            </div>

            <div>
              <strong>0</strong>
              <span>Total Reports</span>
            </div>

          </div>


          {/* PENDING */}

          <div className="stat-card">

            <div className="stat-icon">
              ⏳
            </div>

            <div>
              <strong>0</strong>
              <span>Pending</span>
            </div>

          </div>


          {/* IN PROGRESS */}

          <div className="stat-card">

            <div className="stat-icon">
              🔧
            </div>

            <div>
              <strong>0</strong>
              <span>In Progress</span>
            </div>

          </div>


          {/* RESOLVED */}

          <div className="stat-card">

            <div className="stat-icon">
              ✅
            </div>

            <div>
              <strong>0</strong>
              <span>Resolved</span>
            </div>

          </div>

        </section>


        {/* ===================================================
            QUICK ACTIONS
        =================================================== */}

        <section className="dashboard-section">

          <div className="section-heading">

            <h2>
              Quick Actions
            </h2>

            <p>
              What would you like to do?
            </p>

          </div>


          <div className="dashboard-cards">


            {/* =================================================
                REPORT ISSUE
            ================================================= */}

            <div className="dashboard-card">

              <div className="dashboard-card-icon">
                📝
              </div>

              <h2>
                Report an Issue
              </h2>

              <p>
                Found a problem on campus? Submit a new complaint
                and help the administration take action.
              </p>

              <button
                className="dashboard-btn"
                onClick={onReportIssue}
              >
                Report Issue →
              </button>

            </div>


            {/* =================================================
                MY ISSUES
            ================================================= */}

            <div className="dashboard-card">

              <div className="dashboard-card-icon">
                📋
              </div>

              <h2>
                My Issues
              </h2>

              <p>
                View all the issues you have reported and see
                their current status.
              </p>

              <button
                className="dashboard-btn secondary-dashboard-btn"
                onClick={onMyIssues}
              >
                View My Issues →
              </button>

            </div>


            {/* =================================================
                TRACK STATUS
            ================================================= */}

            <div className="dashboard-card">

              <div className="dashboard-card-icon">
                🔎
              </div>

              <h2>
                Track Status
              </h2>

              <p>
                Check the progress of your complaints from
                submission to resolution.
              </p>

              <button
                className="dashboard-btn secondary-dashboard-btn"
                onClick={onTrackStatus}
              >
                Track Issues →
              </button>

            </div>

          </div>

        </section>


        {/* ===================================================
            RECENT ISSUES
        =================================================== */}

        <section className="recent-section">

          <div className="section-heading">

            <h2>
              Recent Issues
            </h2>

            <p>
              Your latest reported campus issues
            </p>

          </div>


          <div className="empty-state">

            <div className="empty-icon">
              📭
            </div>

            <h3>
              No issues reported yet
            </h3>

            <p>
              Your reported issues will appear here.
            </p>

            <button
              className="dashboard-btn"
              onClick={onReportIssue}
            >
              Report Your First Issue
            </button>

          </div>

        </section>

      </main>

    </div>
  );
}

export default Dashboard;