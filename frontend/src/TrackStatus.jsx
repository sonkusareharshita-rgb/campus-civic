import "./App.css";

function TrackStatus({ user, onBack }) {
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
              TRACK STATUS
            </p>

            <h1>
              Track Your Issues 🔎
            </h1>

            <p>
              Check the progress of your complaints from
              submission to resolution.
            </p>
          </div>

          <div className="dashboard-hero-icon">
            🔎
          </div>
        </section>

        <section className="recent-section">

          <div className="section-heading">
            <h2>Complaint Status</h2>

            <p>
              Your complaint progress will appear here.
            </p>
          </div>

          <div className="empty-state">

            <div className="empty-icon">
              🔍
            </div>

            <h3>
              No complaints to track
            </h3>

            <p>
              Once you report an issue, you can track its
              status here.
            </p>

          </div>

        </section>

      </main>

    </div>
  );
}

export default TrackStatus;