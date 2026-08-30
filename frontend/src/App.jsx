import { useState } from "react";

import AdminComplaintDetails from "./AdminComplaintDetails";
import Login from "./Login";
import Dashboard from "./Dashboard";
import ReportIssue from "./ReportIssue";
import AdminDashboard from "./AdminDashboard";
import MyIssues from "./MyIssues";
import TrackStatus from "./TrackStatus";

import "./App.css";

function App() {

  // =====================================================
  // PAGE STATES
  // =====================================================

  const [showLogin, setShowLogin] = useState(false);
  const [showDashboard, setShowDashboard] = useState(false);
  const [showReportIssue, setShowReportIssue] = useState(false);
  const [showMyIssues, setShowMyIssues] = useState(false);
  const [showTrackStatus, setShowTrackStatus] = useState(false);

  const [showAdminDashboard, setShowAdminDashboard] = useState(false);
  const [showComplaintDetails, setShowComplaintDetails] = useState(false);

  // Selected complaint for admin
  const [selectedComplaint, setSelectedComplaint] = useState(null);

  // Logged-in user
  const [currentUser, setCurrentUser] = useState(null);


  // =====================================================
  // REPORT ISSUE PAGE
  // =====================================================

  if (showReportIssue) {
    return (
      <ReportIssue
        user={currentUser}

        onBack={() => {
          setShowReportIssue(false);
          setShowDashboard(true);
        }}
      />
    );
  }


  // =====================================================
  // MY ISSUES PAGE
  // =====================================================

  if (showMyIssues) {
    return (
      <MyIssues
        user={currentUser}

        onBack={() => {
          setShowMyIssues(false);
          setShowDashboard(true);
        }}
      />
    );
  }


  // =====================================================
  // TRACK STATUS PAGE
  // =====================================================

  if (showTrackStatus) {
    return (
      <TrackStatus
        user={currentUser}

        onBack={() => {
          setShowTrackStatus(false);
          setShowDashboard(true);
        }}
      />
    );
  }


  // =====================================================
  // ADMIN COMPLAINT DETAILS
  // =====================================================

  if (showComplaintDetails) {
    return (
      <AdminComplaintDetails
        complaint={selectedComplaint}

        onBack={() => {
          setShowComplaintDetails(false);
          setShowAdminDashboard(true);
        }}
      />
    );
  }


  // =====================================================
  // ADMIN DASHBOARD
  // =====================================================

  if (showAdminDashboard) {
    return (
      <AdminDashboard

        onLogout={() => {
          setShowAdminDashboard(false);
          setShowComplaintDetails(false);
          setShowLogin(false);
          setCurrentUser(null);
        }}

        onComplaintClick={(complaint) => {
          setSelectedComplaint(complaint);

          setShowAdminDashboard(false);
          setShowComplaintDetails(true);
        }}

      />
    );
  }


  // =====================================================
  // STUDENT / FACULTY DASHBOARD
  // =====================================================

  if (showDashboard) {
    return (
      <Dashboard
        user={currentUser}

        // -----------------------------
        // LOGOUT
        // -----------------------------

        onLogout={() => {
          setShowDashboard(false);
          setShowLogin(false);

          setShowReportIssue(false);
          setShowMyIssues(false);
          setShowTrackStatus(false);

          setCurrentUser(null);
        }}


        // -----------------------------
        // REPORT ISSUE
        // -----------------------------

        onReportIssue={() => {
          setShowDashboard(false);
          setShowReportIssue(true);
        }}


        // -----------------------------
        // MY ISSUES
        // -----------------------------

        onMyIssues={() => {
          setShowDashboard(false);
          setShowMyIssues(true);
        }}


        // -----------------------------
        // TRACK STATUS
        // -----------------------------

        onTrackStatus={() => {
          setShowDashboard(false);
          setShowTrackStatus(true);
        }}

      />
    );
  }


  // =====================================================
  // LOGIN PAGE
  // =====================================================

  if (showLogin) {
    return (
      <Login

        // Back to Home
        onBack={() => {
          setShowLogin(false);
        }}


        // Login successful
        onLoginSuccess={(user) => {

          console.log("Logged in user:", user);

          setCurrentUser(user);
          setShowLogin(false);


          // -----------------------------------------------
          // ADMIN
          // -----------------------------------------------

          if (user.role === "ADMIN") {

            setShowAdminDashboard(true);

          }


          // -----------------------------------------------
          // STUDENT / FACULTY
          // -----------------------------------------------

          else {

            setShowDashboard(true);

          }

        }}

      />
    );
  }


  // =====================================================
  // HOME PAGE
  // =====================================================

  return (
    <div className="app">


      {/* =================================================
          NAVBAR
      ================================================= */}

      <nav className="navbar">

        <div className="logo">
          🏫 Campus Civic
        </div>


        <div className="nav-links">

          <a href="#home">
            Home
          </a>

          <a href="#issues">
            Issues
          </a>

          <a href="#about">
            About
          </a>


          <button
            className="login-btn"

            onClick={() => {
              setShowLogin(true);
            }}
          >
            Login
          </button>

        </div>

      </nav>



      {/* =================================================
          MAIN
      ================================================= */}

      <main>


        {/* =================================================
            HERO SECTION
        ================================================= */}

        <section
          className="hero-section"
          id="home"
        >

          <div className="hero-content">

            <p className="tagline">
              MAKE YOUR CAMPUS BETTER
            </p>


            <h1>

              Report Campus Issues.

              <br />

              <span>
                Make a Difference.
              </span>

            </h1>


            <p className="description">

              Campus Civic helps students report problems around
              campus, track their status, and work together to
              create a better college environment.

            </p>


            <div className="hero-buttons">

              <button
                className="primary-btn"

                onClick={() => {
                  setShowLogin(true);
                }}
              >
                Report an Issue
              </button>


              <button
                className="secondary-btn"

                onClick={() => {
                  document
                    .getElementById("issues")
                    ?.scrollIntoView({
                      behavior: "smooth",
                    });
                }}
              >
                View Issues
              </button>

            </div>

          </div>



          {/* =================================================
              HERO CARD
          ================================================= */}

          <div className="hero-card">

            <div className="card-icon">
              📢
            </div>


            <h2>
              Have a campus problem?
            </h2>


            <p>

              Report it in a few clicks and help the
              administration take action.

            </p>


            <div className="status-box">

              <div>

                <strong>
                  24
                </strong>

                <span>
                  Reported
                </span>

              </div>


              <div>

                <strong>
                  16
                </strong>

                <span>
                  Resolved
                </span>

              </div>


              <div>

                <strong>
                  8
                </strong>

                <span>
                  Pending
                </span>

              </div>

            </div>

          </div>

        </section>



        {/* =================================================
            FEATURES
        ================================================= */}

        <section
          className="features"
          id="issues"
        >

          <h2>
            How Campus Civic Works
          </h2>


          <div className="feature-container">


            {/* REPORT */}

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



            {/* TRACK */}

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



            {/* RESOLVE */}

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



        {/* =================================================
            ABOUT
        ================================================= */}

        <section
          className="about-section"
          id="about"
        >

          <h2>
            About Campus Civic
          </h2>


          <p>

            Campus Civic is a student-focused platform designed
            to make campus issue reporting simple, transparent
            and organized.

          </p>

        </section>

      </main>



      {/* =================================================
          FOOTER
      ================================================= */}

      <footer>

        <p>
          © 2026 Campus Civic | Making Campus Better Together
        </p>

      </footer>

    </div>
  );
}

export default App;