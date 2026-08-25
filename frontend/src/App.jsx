import { useState } from 'react'
import Login from './Login'
import Dashboard from './Dashboard'
import ReportIssue from './ReportIssue'
import './App.css'

function App() {
  const [showLogin, setShowLogin] = useState(false)
  const [showDashboard, setShowDashboard] = useState(false)
  const [showReportIssue, setShowReportIssue] = useState(false)

  if (showReportIssue) {
    return (
      <ReportIssue
        onBack={() => {
          setShowReportIssue(false)
          setShowDashboard(true)
        }}
      />
    )
  }

  if (showDashboard) {
    return (
      <Dashboard
        onLogout={() => {
          setShowDashboard(false)
          setShowLogin(false)
        }}
        onReportIssue={() => {
          setShowDashboard(false)
          setShowReportIssue(true)
        }}
      />
    )
  }

  if (showLogin) {
    return (
      <Login
        onBack={() => setShowLogin(false)}
        onLoginSuccess={() => {
          setShowLogin(false)
          setShowDashboard(true)
        }}
      />
    )
  }

  return (
    <div className="app">

      <nav className="navbar">

        <div className="logo">
          🏫 Campus Civic
        </div>

        <div className="nav-links">

          <a href="#home">Home</a>
          <a href="#issues">Issues</a>
          <a href="#about">About</a>

          <button
            className="login-btn"
            onClick={() => setShowLogin(true)}
          >
            Login
          </button>

        </div>

      </nav>

      <main>

        <section className="hero-section" id="home">

          <div className="hero-content">

            <p className="tagline">
              MAKE YOUR CAMPUS BETTER
            </p>

            <h1>
              Report Campus Issues.
              <br />
              <span>Make a Difference.</span>
            </h1>

            <p className="description">
              Campus Civic helps students report problems around campus,
              track their status, and work together to create a better
              college environment.
            </p>

            <div className="hero-buttons">

              <button
                className="primary-btn"
                onClick={() => setShowLogin(true)}
              >
                Report an Issue
              </button>

              <button className="secondary-btn">
                View Issues
              </button>

            </div>

          </div>

          <div className="hero-card">

            <div className="card-icon">
              📢
            </div>

            <h2>
              Have a campus problem?
            </h2>

            <p>
              Report it in a few clicks and help the administration
              take action.
            </p>

            <div className="status-box">

              <div>
                <strong>24</strong>
                <span>Reported</span>
              </div>

              <div>
                <strong>16</strong>
                <span>Resolved</span>
              </div>

              <div>
                <strong>8</strong>
                <span>Pending</span>
              </div>

            </div>

          </div>

        </section>

        <section className="features" id="issues">

          <h2>
            How Campus Civic Works
          </h2>

          <div className="feature-container">

            <div className="feature-card">

              <div className="feature-icon">
                📝
              </div>

              <h3>
                Report
              </h3>

              <p>
                Report issues like damaged infrastructure,
                cleanliness, electricity or other campus problems.
              </p>

            </div>

            <div className="feature-card">

              <div className="feature-icon">
                🔍
              </div>

              <h3>
                Track
              </h3>

              <p>
                Track your reported issue and see whether it is
                pending, in progress or resolved.
              </p>

            </div>

            <div className="feature-card">

              <div className="feature-icon">
                ✅
              </div>

              <h3>
                Resolve
              </h3>

              <p>
                Help campus authorities identify problems and
                improve the campus environment.
              </p>

            </div>

          </div>

        </section>

        <section className="about-section" id="about">

          <h2>
            About Campus Civic
          </h2>

          <p>
            Campus Civic is a student-focused platform designed to make
            campus issue reporting simple, transparent and organized.
          </p>

        </section>

      </main>

      <footer>
        <p>
          © 2026 Campus Civic | Making Campus Better Together
        </p>
      </footer>

    </div>
  )
}

export default App