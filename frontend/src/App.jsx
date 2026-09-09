import { useState } from "react";

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
  // NAVIGATION
  // =====================================================

  const [activePage, setActivePage] = useState("feed");
  const [prevPage, setPrevPage] = useState("feed");


  // =====================================================
  // ISSUE DETAIL
  // =====================================================

  const [selectedIssue, setSelectedIssue] = useState(null);


  // =====================================================
  // COMPLAINT DETAILS
  // =====================================================

  const [selectedComplaint, setSelectedComplaint] =
    useState(null);

  const [showComplaintDetails, setShowComplaintDetails] =
    useState(false);


  // =====================================================
  // UPVOTES
  // =====================================================

  const [upvotedIds, setUpvotedIds] = useState([]);


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

    setCurrentUser(user);


    // APPROVER
    if (
      user.role === "ADMIN" &&
      Number(user.admin_type_id) === 9
    ) {

      setActivePage("approver");

    }


    // NORMAL ADMIN
    else if (user.role === "ADMIN") {

      setActivePage("admin");

    }


    // STUDENT / FACULTY
    else {

      setActivePage("feed");

    }

  }


  // =====================================================
  // LOGOUT
  // =====================================================

  function handleLogout() {

    setCurrentUser(null);

    setUpvotedIds([]);

    setSelectedIssue(null);

    setSelectedComplaint(null);

    setShowComplaintDetails(false);

    setActivePage("feed");

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
  // SIGNUP
  // =====================================================

  function handleSignup() {

    navigate("signup");

  }


  // =====================================================
  // UPVOTE
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

            "Content-Type":
              "application/json",

          },

          body: JSON.stringify({

            reported_by:
              currentUser.user_id,

          }),

        }

      );


      const data =
        await response.json();


      if (response.ok) {

        setUpvotedIds((prev) => [

          ...prev,

          issueId,

        ]);


        if (

          selectedIssue &&

          selectedIssue.issue_id ===
            issueId

        ) {

          setSelectedIssue((prev) => ({

            ...prev,

            report_count:

              Number(
                prev.report_count || 0
              ) + 1,

          }));

        }

      }

      else {

        console.error(

          "Support error:",

          data.message

        );

      }

    }

    catch (error) {

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


    // APPROVER COMPLAINT DETAILS

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

            setShowComplaintDetails(
              false
            );

            setSelectedComplaint(
              null
            );

          }}

          onUpdate={() => {

            setShowComplaintDetails(
              false
            );

            setSelectedComplaint(
              null
            );

          }}

        />

      );

    }


    // APPROVER DASHBOARD

    return (

      <ApproverDashboard

        user={
          currentUser
        }

        onLogout={
          handleLogout
        }

        onComplaintClick={

          (complaint) => {

            setSelectedComplaint(
              complaint
            );

            setShowComplaintDetails(
              true
            );

          }

        }

      />

    );

  }


  // =====================================================
  // ADMIN FLOW
  // =====================================================

  if (activePage === "admin") {


    // ADMIN COMPLAINT DETAILS

    if (

      showComplaintDetails &&

      selectedComplaint

    ) {

      return (

        <AdminComplaintDetails

          complaint={
            selectedComplaint
          }

          onBack={() => {

            setShowComplaintDetails(
              false
            );

            setSelectedComplaint(
              null
            );

          }}

        />

      );

    }


    // ADMIN DASHBOARD

    return (

      <AdminDashboard

        onLogout={
          handleLogout
        }

        onComplaintClick={

          (complaint) => {

            setSelectedComplaint(
              complaint
            );

            setShowComplaintDetails(
              true
            );

          }

        }

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

        onBack={() =>
          navigate(prevPage)
        }

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


        {/* FEED */}

        {activePage === "feed" && (

          <Feed
            {...sharedProps}
          />

        )}


        {/* EXPLORE */}

        {activePage === "explore" && (

          <Explore
            {...sharedProps}
          />

        )}


        {/* PROFILE */}

        {activePage === "profile" &&

          currentUser && (

            <Profile

              {...sharedProps}

              onLogout={
                handleLogout
              }

            />

          )}


        {/* ALERTS */}

        {activePage === "alerts" && (

          <div className="feed-page">

            <div className="feed-empty">

              <div className="feed-empty-icon">

                🔔

              </div>


              <h3>

                Alerts

              </h3>


              <p>

                Notifications coming soon.

              </p>


            </div>

          </div>

        )}


      </div>


      {/* BOTTOM NAVIGATION */}

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

export default App;