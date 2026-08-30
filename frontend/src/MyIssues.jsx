import "./App.css";

function MyIssues({ user, onBack }) {
  return (
    <div className="dashboard-page">

      <nav className="dashboard-navbar">
        <div className="logo">
          🏫 Campus Civic
        </div>

        <button
          className="logout-btn"
          onClick={onBack}
        >
          ← Back to Dashboard
        </button>
      </nav>

      <main className="dashboard-content">

        <section className="dashboard-hero">
          <div>
            <p className="dashboard-label">
              MY ISSUES
            </p>

            <h1>
              My Reported Issues 📋
            </h1>

            <p>
              View all the campus complaints you have reported
              and check their current status.
            </p>
          </div>

          <div className="dashboard-hero-icon">
            📋
          </div>
        </section>

        <section className="recent-section">

          <div className="section-heading">
            <h2>Your Issues</h2>
            <p>
              Complaints reported by you will appear here.
            </p>
          </div>

          <div className="empty-state">

            <div className="empty-icon">
              📭
            </div>

            <h3>
              No issues found
            </h3>

            <p>
              You have not reported any campus issues yet.
            </p>

          </div>

        </section>

      </main>

    </div>
  );
}

export default MyIssues;