import { useState } from "react";

import Feed            from "./Feed";
import Explore         from "./Explore";
import ReportIssue     from "./ReportIssue";
import Profile         from "./Profile";
import IssueDetail     from "./IssueDetail";
import Login           from "./Login";
import BottomNav       from "./BottomNav";
import AdminDashboard      from "./AdminDashboard";
import AdminComplaintDetails from "./AdminComplaintDetails";

import "./App.css";

// ─────────────────────────────────────────────────────
// APP
// ─────────────────────────────────────────────────────

function App() {

  // ── AUTH ─────────────────────────────────────
  const [currentUser, setCurrentUser]   = useState(null);

  // ── NAVIGATION ───────────────────────────────
  // activePage: "feed" | "explore" | "report" | "alerts" | "profile" | "login" | "detail" | "admin"
  const [activePage, setActivePage]     = useState("feed");
  const [prevPage,   setPrevPage]       = useState("feed");

  // ── ISSUE DETAIL ─────────────────────────────
  const [selectedIssue, setSelectedIssue] = useState(null);

  // ── ADMIN ────────────────────────────────────
  const [selectedComplaint, setSelectedComplaint] = useState(null);
  const [showComplaintDetails, setShowComplaintDetails] = useState(false);

  // ── UPVOTES (local state) ────────────────────
  const [upvotedIds, setUpvotedIds] = useState([]);

  // ─────────────────────────────────────────────
  // HANDLERS
  // ─────────────────────────────────────────────

  function navigate(page) {
    setPrevPage(activePage);
    setActivePage(page);
  }

  function handleLoginSuccess(user) {
    setCurrentUser(user);
    if (user.role === "ADMIN") {
      navigate("admin");
    } else {
      navigate("feed");
    }
  }

  function handleLogout() {
    setCurrentUser(null);
    setUpvotedIds([]);
    navigate("feed");
  }

  function handleCardClick(issue) {
    setSelectedIssue(issue);
    navigate("detail");
  }

  function handleLoginPrompt() {
    navigate("login");
  }

  async function handleUpvote(issueId) {
    if (!currentUser) return;
    if (upvotedIds.includes(issueId)) return;

    try {
      const res = await fetch(
        `http://localhost:5000/api/issues/${issueId}/support`,
        {
          method:  "POST",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify({ reported_by: currentUser.user_id }),
        }
      );
      if (res.ok) {
        setUpvotedIds((prev) => [...prev, issueId]);
        // Update count in selectedIssue if open
        if (selectedIssue && selectedIssue.issue_id === issueId) {
          setSelectedIssue((prev) => ({
            ...prev,
            report_count: Number(prev.report_count || 0) + 1,
          }));
        }
      }
    } catch (err) {
      console.error("Upvote error:", err);
    }
  }

  function handleReportSuccess() {
    navigate("feed");
  }

  // ─────────────────────────────────────────────
  // SHARED PROPS
  // ─────────────────────────────────────────────

  const sharedProps = {
    currentUser,
    onCardClick:    handleCardClick,
    onUpvote:       handleUpvote,
    onLoginPrompt:  handleLoginPrompt,
    upvotedIds,
  };

  // ─────────────────────────────────────────────
  // RENDER — ADMIN FLOW
  // ─────────────────────────────────────────────

  if (activePage === "admin") {
    if (showComplaintDetails && selectedComplaint) {
      return (
        <AdminComplaintDetails
          complaint={selectedComplaint}
          onBack={() => {
            setShowComplaintDetails(false);
            setSelectedComplaint(null);
          }}
        />
      );
    }
    return (
      <AdminDashboard
        onLogout={handleLogout}
        onComplaintClick={(complaint) => {
          setSelectedComplaint(complaint);
          setShowComplaintDetails(true);
        }}
      />
    );
  }

  // ─────────────────────────────────────────────
  // RENDER — LOGIN
  // ─────────────────────────────────────────────

  if (activePage === "login") {
    return (
      <Login
        onBack={() => navigate(prevPage === "login" ? "feed" : prevPage)}
        onLoginSuccess={handleLoginSuccess}
      />
    );
  }

  // ─────────────────────────────────────────────
  // RENDER — ISSUE DETAIL
  // ─────────────────────────────────────────────

  if (activePage === "detail" && selectedIssue) {
    return (
      <IssueDetail
        issue={selectedIssue}
        currentUser={currentUser}
        onBack={() => navigate(prevPage)}
        onUpvote={handleUpvote}
        onLoginPrompt={handleLoginPrompt}
        upvotedIds={upvotedIds}
      />
    );
  }

  // ─────────────────────────────────────────────
  // RENDER — REPORT (sheet over feed)
  // ─────────────────────────────────────────────

  if (activePage === "report") {
    return (
      <div className="app-shell">
        <div className="page-content">
          <ReportIssue
            user={currentUser}
            onBack={() => navigate("feed")}
            onSuccess={handleReportSuccess}
          />
        </div>
        <BottomNav
          activePage={activePage}
          onNavigate={navigate}
          currentUser={currentUser}
        />
      </div>
    );
  }

  // ─────────────────────────────────────────────
  // RENDER — MAIN APP SHELL (Feed / Explore / Profile)
  // ─────────────────────────────────────────────

  return (
    <div className="app-shell">

      <div className="page-content">

        {activePage === "feed" && (
          <Feed {...sharedProps} />
        )}

        {activePage === "explore" && (
          <Explore {...sharedProps} />
        )}

        {activePage === "profile" && currentUser && (
          <Profile
            {...sharedProps}
            onLogout={handleLogout}
          />
        )}

        {activePage === "alerts" && (
          <div className="feed-page">
            <div className="feed-empty">
              <div className="feed-empty-icon">🔔</div>
              <h3>Alerts</h3>
              <p>Notifications coming soon.</p>
            </div>
          </div>
        )}

      </div>

      <BottomNav
        activePage={activePage}
        onNavigate={navigate}
        currentUser={currentUser}
      />

    </div>
  );
}

export default App;