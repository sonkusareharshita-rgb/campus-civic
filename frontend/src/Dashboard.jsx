import './App.css'

function Dashboard({ onLogout, onReportIssue }) {
  return (
    <div className="dashboard-page">

      <nav className="dashboard-navbar">
        <div className="logo">
          🏫 Campus Civic
        </div>

        <div className="dashboard-nav-right">
          <span className="student-name">
            👤 Student
          </span>

          <button
            className="logout-btn"
            onClick={onLogout}
          >
            Logout
          </button>
        </div>
      </nav>

      <main className="dashboard-content">

        <section className="dashboard-hero">

          <div>
            <p className="dashboard-label">
              STUDENT DASHBOARD
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

        <section className="dashboard-stats">

          <div className="stat-card">
            <div className="stat-icon">📋</div>
            <div>
              <strong>0</strong>
              <span>Total Reports</span>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon">⏳</div>
            <div>
              <strong>0</strong>
              <span>Pending</span>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon">🔧</div>
            <div>
              <strong>0</strong>
              <span>In Progress</span>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon">✅</div>
            <div>
              <strong>0</strong>
              <span>Resolved</span>
            </div>
          </div>

        </section>

        <section className="dashboard-section">

          <div className="section-heading">
            <h2>Quick Actions</h2>
            <p>What would you like to do?</p>
          </div>

          <div className="dashboard-cards">

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

              <button className="dashboard-btn secondary-dashboard-btn">
                View My Issues →
              </button>

            </div>

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

              <button className="dashboard-btn secondary-dashboard-btn">
                Track Issues →
              </button>

            </div>

          </div>

        </section>

        <section className="recent-section">

          <div className="section-heading">
            <h2>Recent Issues</h2>
            <p>Your latest reported campus issues</p>
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
  )
}

export default Dashboard