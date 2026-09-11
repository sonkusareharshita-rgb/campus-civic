import { useState, useEffect } from "react";

import Feed from "./Feed";
import Explore from "./Explore";
import ReportIssue from "./ReportIssue";
import Profile from "./Profile";
import IssueDetail from "./IssueDetail";
import Login from "./Login";
import Signup from "./Signup";
import BottomNav from "./BottomNav";

import AdminDashboard from "./AdminDashboard";
import AdminComplaintDetails from "./AdminComplaintDetails";

import ApproverDashboard from "./ApproverDashboard";
import ApproverComplaintDetails from "./ApproverComplaintDetails";

import "./App.css";


function App() {

  // =====================================================
  // AUTH
  // =====================================================

  const [currentUser, setCurrentUser] = useState(null);


  // =====================================================
  // NOTIFICATIONS
  // =====================================================

  const [notifications, setNotifications] = useState([]);


  useEffect(() => {

    if (!currentUser?.user_id) {

      setNotifications([]);

      return;
    }


    const fetchNotifications = async () => {

      try {

        const response = await fetch(
          `http://localhost:5000/api/issues/notifications/${currentUser.user_id}`
        );


        const data = await response.json();


        if (response.ok) {

          setNotifications(
            Array.isArray(data)
              ? data
              : []
          );

        } else {

          console.error(
            "Notification fetch error:",
            data.message
          );

        }

      } catch (error) {

        console.error(
          "Notification fetch error:",
          error
        );

      }

    };


    fetchNotifications();

  }, [currentUser?.user_id]);


  // =====================================================
  // NAVIGATION
  // =====================================================

  const [activePage, setActivePage] =
    useState("feed");

  const [prevPage, setPrevPage] =
    useState("feed");


  // =====================================================
  // ISSUE DETAIL
  // =====================================================

  const [selectedIssue, setSelectedIssue] =
    useState(null);


  // =====================================================
  // ADMIN / APPROVER
  // =====================================================

  const [selectedComplaint, setSelectedComplaint] =
    useState(null);

  const [showComplaintDetails, setShowComplaintDetails] =
    useState(false);


  // =====================================================
  // UPVOTES
  // =====================================================

  const [upvotedIds, setUpvotedIds] =
    useState([]);


  // =====================================================
  // NAVIGATION HANDLER
  // =====================================================

  function navigate(page) {

    setPrevPage(activePage);

    setActivePage(page);

  }


  // =====================================================
  // LOGIN SUCCESS
  // =====================================================

  function handleLoginSuccess(user) {

    console.log(
      "LOGGED IN USER:",
      user
    );


    setCurrentUser(user);


    // ---------------------------------------------------
    // APPROVER
    // ---------------------------------------------------

    if (
      user?.role === "ADMIN" &&
      Number(user?.admin_type_id) === 9
    ) {

      setActivePage("approver");

      return;

    }


    // ---------------------------------------------------
    // NORMAL ADMIN
    // ---------------------------------------------------

    if (user?.role === "ADMIN") {

      setActivePage("admin");

      return;

    }


    // ---------------------------------------------------
    // STUDENT / FACULTY
    // ---------------------------------------------------

    setActivePage("feed");

  }


  // =====================================================
  // LOGOUT
  // =====================================================

  function handleLogout() {

    setCurrentUser(null);

    setNotifications([]);

    setUpvotedIds([]);

    setSelectedIssue(null);

    setSelectedComplaint(null);

    setShowComplaintDetails(false);

    setActivePage("feed");

    setPrevPage("feed");

  }


  // =====================================================
  // ISSUE CARD CLICK
  // =====================================================

  function handleCardClick(issue) {

    setSelectedIssue(issue);

    navigate("detail");

  }


  // =====================================================
  // LOGIN PROMPT
  // =====================================================

  function handleLoginPrompt() {

    navigate("login");

  }


  // =====================================================
  // OPEN SIGNUP
  // =====================================================

  function handleSignup() {

    navigate("signup");

  }


  // =====================================================
  // UPVOTE / SUPPORT ISSUE
  // =====================================================

  async function handleUpvote(issueId) {

    if (!currentUser) {

      navigate("login");

      return;

    }


    if (upvotedIds.includes(issueId)) {

      return;

    }


    try {

      const response = await fetch(
        `http://localhost:5000/api/issues/${issueId}/support`,
        {
          method: "POST",

          headers: {
            "Content-Type": "application/json",
          },

          body: JSON.stringify({
            reported_by: currentUser.user_id,
          }),
        }
      );


      const data = await response.json();


      if (response.ok) {

        setUpvotedIds((prev) => [
          ...prev,
          issueId,
        ]);


        // ------------------------------------------------
        // UPDATE SELECTED ISSUE COUNT
        // ------------------------------------------------

        if (
          selectedIssue &&
          selectedIssue.issue_id === issueId
        ) {

          setSelectedIssue((prev) => ({

            ...prev,

            report_count:
              Number(prev.report_count || 0) + 1,

          }));

        }

      } else {

        console.error(
          "Support error:",
          data.message
        );

      }

    } catch (error) {

      console.error(
        "Upvote error:",
        error
      );

    }

  }


  // =====================================================
  // REPORT SUCCESS
  // =====================================================

  function handleReportSuccess() {

    setActivePage("feed");

  }


  // =====================================================
  // SHARED PROPS
  // =====================================================

  const sharedProps = {

    currentUser,

    onCardClick:
      handleCardClick,

    onUpvote:
      handleUpvote,

    onLoginPrompt:
      handleLoginPrompt,

    upvotedIds,

  };


  // =====================================================
  // APPROVER FLOW
  // =====================================================

  if (activePage === "approver") {

    // ---------------------------------------------------
    // APPROVER COMPLAINT DETAILS
    // ---------------------------------------------------

    if (
      showComplaintDetails &&
      selectedComplaint
    ) {

      return (

        <ApproverComplaintDetails

          complaint={
            selectedComplaint
          }

          currentUser={
            currentUser
          }


          onBack={() => {

            setShowComplaintDetails(false);

            setSelectedComplaint(null);

          }}


          onUpdate={() => {

            setShowComplaintDetails(false);

            setSelectedComplaint(null);

          }}

        />

      );

    }


    // ---------------------------------------------------
    // APPROVER DASHBOARD
    // ---------------------------------------------------

    return (

      <ApproverDashboard

        user={
          currentUser
        }

        onLogout={
          handleLogout
        }


        onComplaintClick={(complaint) => {

          console.log(
            "APPROVER COMPLAINT SELECTED:",
            complaint
          );


          setSelectedComplaint(
            complaint
          );


          setShowComplaintDetails(
            true
          );

        }}

      />

    );

  }


  // =====================================================
  // ADMIN FLOW
  // =====================================================

  if (activePage === "admin") {

    // ---------------------------------------------------
    // ADMIN COMPLAINT DETAILS
    // ---------------------------------------------------

    if (
      showComplaintDetails &&
      selectedComplaint
    ) {

      return (

        <AdminComplaintDetails

          complaint={
            selectedComplaint
          }

          currentUser={
            currentUser
          }


          onBack={() => {

            setShowComplaintDetails(false);

            setSelectedComplaint(null);

          }}


          onUpdate={() => {

            setShowComplaintDetails(false);

            setSelectedComplaint(null);

          }}

        />

      );

    }


    // ---------------------------------------------------
    // ADMIN DASHBOARD
    // ---------------------------------------------------

    return (

      <AdminDashboard

        onLogout={
          handleLogout
        }


        onComplaintClick={(complaint) => {

          console.log(
            "ADMIN COMPLAINT SELECTED:",
            complaint
          );


          setSelectedComplaint(
            complaint
          );


          setShowComplaintDetails(
            true
          );

        }}

      />

    );

  }


  // =====================================================
  // LOGIN
  // =====================================================

  if (activePage === "login") {

    return (

      <Login

        onBack={() =>
          navigate(
            prevPage === "login"
              ? "feed"
              : prevPage
          )
        }


        onLoginSuccess={
          handleLoginSuccess
        }


        onSignup={() =>
          navigate("signup")
        }

      />

    );

  }


  // =====================================================
  // SIGNUP
  // =====================================================

  if (activePage === "signup") {

    return (

      <Signup

        onBack={() =>
          navigate("login")
        }


        onLogin={() =>
          navigate("login")
        }


        onSignupSuccess={
          handleLoginSuccess
        }

      />

    );

  }


  // =====================================================
  // ISSUE DETAIL
  // =====================================================

  if (
    activePage === "detail" &&
    selectedIssue
  ) {

    return (

      <IssueDetail

        issue={
          selectedIssue
        }


        currentUser={
          currentUser
        }


        onBack={() => {

          setSelectedIssue(null);

          navigate(
            prevPage === "detail"
              ? "feed"
              : prevPage
          );

        }}


        onUpvote={
          handleUpvote
        }


        onLoginPrompt={
          handleLoginPrompt
        }


        upvotedIds={
          upvotedIds
        }

      />

    );

  }


  // =====================================================
  // REPORT ISSUE
  // =====================================================

  if (activePage === "report") {

    return (

      <div className="app-shell">

        <div className="page-content">

          <ReportIssue

            user={
              currentUser
            }


            onBack={() =>
              navigate("feed")
            }


            onSuccess={
              handleReportSuccess
            }

          />

        </div>


        <BottomNav

          activePage={
            activePage
          }


          onNavigate={
            navigate
          }


          currentUser={
            currentUser
          }

        />

      </div>

    );

  }


  // =====================================================
  // MAIN APP
  // =====================================================

  return (

    <div className="app-shell">

      <div className="page-content">


        {/* =================================================
            FEED
        ================================================= */}

        {activePage === "feed" && (

          <Feed
            {...sharedProps}
          />

        )}


        {/* =================================================
            EXPLORE
        ================================================= */}

        {activePage === "explore" && (

          <Explore
            {...sharedProps}
          />

        )}


        {/* =================================================
            PROFILE
        ================================================= */}

        {activePage === "profile" &&
          currentUser && (

            <Profile

              {...sharedProps}

              onLogout={
                handleLogout
              }

            />

          )}


        {/* =================================================
            ALERTS
        ================================================= */}

        {activePage === "alerts" && (

          <div className="feed-page">

            <div className="feed-empty">

              <div className="feed-empty-icon">
                🔔
              </div>


              <h3>
                Alerts
              </h3>


              {notifications.length === 0 ? (

                <p>
                  No notifications yet.
                </p>

              ) : (

                <div className="notifications-list">

                  {notifications.map(
                    (notification) => (

                      <div

                        className={`notification-card ${
                          !notification.is_read
                            ? "unread"
                            : ""
                        }`}

                        key={
                          notification.notification_id
                        }

                      >

                        <div className="notification-icon">
                          🔔
                        </div>


                        <div className="notification-content">

                          <p>
                            {notification.message}
                          </p>


                          <small>

                            {notification.created_at
                              ? new Date(
                                  notification.created_at
                                ).toLocaleString()
                              : ""}

                          </small>

                        </div>

                      </div>

                    )
                  )}

                </div>

              )}

            </div>

          </div>

        )}

      </div>


      {/* =================================================
          BOTTOM NAVIGATION
      ================================================= */}

      <BottomNav

        activePage={
          activePage
        }


        onNavigate={
          navigate
        }


        currentUser={
          currentUser
        }

      />

    </div>

  );

} // 


export default App;