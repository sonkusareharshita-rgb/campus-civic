import { useEffect, useState } from 'react'
import './App.css'

function ApproverDashboard({
  user,
  onLogout,
  onComplaintClick
}) {
  const [complaints, setComplaints] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchComplaints()
  }, [])

  const fetchComplaints = async () => {
    try {
      const response = await fetch(
        'http://localhost:5000/api/issues/all'
      )

      const data = await response.json()

      if (response.ok) {
        setComplaints(data.issues || data)
      } else {
        console.error(data.message)
      }

    } catch (error) {
      console.error(
        'Error loading complaints:',
        error
      )
    } finally {
      setLoading(false)
    }
  }

  const pendingComplaints = complaints.filter(
    (complaint) =>
      complaint.status === 'SUBMITTED' ||
      complaint.status === 'PENDING'
  )

  const approvedComplaints = complaints.filter(
    (complaint) =>
      complaint.status === 'APPROVED' ||
      complaint.status === 'VERIFIED'
  )

  const rejectedComplaints = complaints.filter(
    (complaint) =>
      complaint.status === 'REJECTED'
  )

  return (
    <div className="approver-page">

      {/* NAVBAR */}

      <nav className="approver-navbar">

        <div className="approver-brand">

          <div className="approver-brand-icon">
            ✓
          </div>

          <div>
            <strong>Campus Civic</strong>

            <span>
              Complaint Verification Portal
            </span>
          </div>

        </div>


        <div className="approver-profile">

          <div className="approver-avatar">
            {user?.name?.charAt(0) || 'A'}
          </div>

          <div className="approver-user-info">

            <strong>
              {user?.name || 'Approver'}
            </strong>

            <span>
              Complaint Approver
            </span>

          </div>


          <button
            className="approver-logout"
            onClick={onLogout}
          >
            Logout
          </button>

        </div>

      </nav>


      {/* MAIN */}

      <main className="approver-content">


        {/* HEADER */}

        <section className="approver-header">

          <div>

            <p className="approver-label">
              VERIFICATION CENTER
            </p>

            <h1>
              Complaint Verification
            </h1>

            <p>
              Review submitted complaints before
              forwarding them to the administration.
            </p>

          </div>


          <div className="approver-header-icon">
            🔍
          </div>

        </section>


        {/* STATS */}

        <section className="approver-stats">


          <div className="approver-stat-card pending-card">

            <div className="approver-stat-icon">
              ⏳
            </div>

            <div>

              <span>
                Pending Review
              </span>

              <strong>
                {pendingComplaints.length}
              </strong>

            </div>

          </div>


          <div className="approver-stat-card approved-card">

            <div className="approver-stat-icon">
              ✓
            </div>

            <div>

              <span>
                Approved
              </span>

              <strong>
                {approvedComplaints.length}
              </strong>

            </div>

          </div>


          <div className="approver-stat-card rejected-card">

            <div className="approver-stat-icon">
              ✕
            </div>

            <div>

              <span>
                Rejected
              </span>

              <strong>
                {rejectedComplaints.length}
              </strong>

            </div>

          </div>


          <div className="approver-stat-card total-card">

            <div className="approver-stat-icon">
              📋
            </div>

            <div>

              <span>
                Total Complaints
              </span>

              <strong>
                {complaints.length}
              </strong>

            </div>

          </div>

        </section>


        {/* WORKFLOW */}

        <section className="verification-workflow">

          <div className="workflow-step completed">

            <div className="workflow-number">
              1
            </div>

            <div>

              <strong>
                Complaint Submitted
              </strong>

              <span>
                Student or faculty reports an issue
              </span>

            </div>

          </div>


          <div className="workflow-line"></div>


          <div className="workflow-step active">

            <div className="workflow-number">
              2
            </div>

            <div>

              <strong>
                Approver Verification
              </strong>

              <span>
                Verify complaint authenticity
              </span>

            </div>

          </div>


          <div className="workflow-line"></div>


          <div className="workflow-step">

            <div className="workflow-number">
              3
            </div>

            <div>

              <strong>
                Admin Resolution
              </strong>

              <span>
                Forward approved complaints
              </span>

            </div>

          </div>

        </section>


        {/* COMPLAINT LIST */}

        <section className="approver-complaints-section">

          <div className="approver-section-heading">

            <div>

              <p>
                COMPLAINT QUEUE
              </p>

              <h2>
                Pending Verification
              </h2>

            </div>


            <button
              className="refresh-btn"
              onClick={fetchComplaints}
            >
              ↻ Refresh
            </button>

          </div>


          {loading ? (

            <div className="approver-loading">

              <div className="loading-spinner"></div>

              <p>
                Loading complaints...
              </p>

            </div>

          ) : pendingComplaints.length === 0 ? (

            <div className="approver-empty">

              <div>
                🎉
              </div>

              <h3>
                No pending complaints
              </h3>

              <p>
                All submitted complaints have been reviewed.
              </p>

            </div>

          ) : (

            <div className="approver-complaint-list">

              {pendingComplaints.map(
                (complaint) => (

                  <div
                    className="approver-complaint-card"
                    key={complaint.issue_id}
                    onClick={() =>
                      onComplaintClick(complaint)
                    }
                  >


                    <div className="complaint-card-top">

                      <div className="complaint-category-icon">

                        📌

                      </div>


                      <div className="complaint-main-info">

                        <div className="complaint-card-title-row">

                          <h3>
                            {complaint.title}
                          </h3>


                          <span className="approver-pending-badge">

                            Pending Review

                          </span>

                        </div>


                        <p>

                          {complaint.description}

                        </p>

                      </div>

                    </div>


                    <div className="approver-complaint-meta">


                      <span>

                        👤
                        {' '}
                        {complaint.reported_by_name ||
                          'Campus User'}

                      </span>


                      <span>

                        📍
                        {' '}
                        {complaint.location ||
                          'Campus Location'}

                      </span>


                      <span>

                        🗂️
                        {' '}
                        {complaint.category_name ||
                          'Other'}

                      </span>


                      <span
                        className={`priority-badge ${
                          (
                            complaint.priority ||
                            'MEDIUM'
                          ).toLowerCase()
                        }`}
                      >

                        ⚡
                        {' '}
                        {complaint.priority ||
                          'MEDIUM'}

                      </span>

                    </div>


                    <div className="approver-card-footer">

                      <span>

                        Complaint #
                        {complaint.issue_id}

                      </span>


                      <button
                        className="review-complaint-btn"
                        onClick={(e) => {
                          e.stopPropagation()

                          onComplaintClick(
                            complaint
                          )
                        }}
                      >

                        Review Complaint →

                      </button>

                    </div>


                  </div>

                )
              )}

            </div>

          )}

        </section>

      </main>

    </div>
  )
}

export default ApproverDashboard