import { useEffect, useState } from 'react'
import './App.css'

function AdminDashboard({ onLogout, onComplaintClick }) {

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
        setComplaints(data.issues || [])
      } else {
        console.error(data.message)
      }

    } catch (error) {
      console.error('Failed to fetch complaints:', error)
    } finally {
      setLoading(false)
    }
  }


  // ------------------------------------------
  // STATISTICS
  // ------------------------------------------

  const totalComplaints = complaints.length

  const pendingComplaints = complaints.filter(
    (issue) => issue.status === 'PENDING'
  ).length

  const progressComplaints = complaints.filter(
    (issue) => issue.status === 'IN_PROGRESS'
  ).length

  const resolvedComplaints = complaints.filter(
    (issue) => issue.status === 'RESOLVED'
  ).length


  return (
    <div className="admin-page">

      {/* ================= NAVBAR ================= */}

      <nav className="admin-navbar">

        <div className="admin-logo">
          🛡️ Campus Civic
        </div>

        <div className="admin-user">

          <span>
            Admin
          </span>

          <button
            className="admin-logout"
            onClick={onLogout}
          >
            Logout
          </button>

        </div>

      </nav>


      {/* ================= MAIN ================= */}

      <main className="admin-content">


        {/* HEADING */}

        <div className="admin-heading">

          <div>

            <p className="admin-tagline">
              ADMINISTRATION
            </p>

            <h1>
              Admin Dashboard 👋
            </h1>

            <p>
              Manage campus complaints and help resolve
              student and faculty issues.
            </p>

          </div>

        </div>


        {/* ================= STATISTICS ================= */}

        <section className="admin-stats">


          <div className="admin-stat-card">

            <div className="stat-icon">
              📋
            </div>

            <div>

              <strong>
                {totalComplaints}
              </strong>

              <span>
                Total Complaints
              </span>

            </div>

          </div>


          <div className="admin-stat-card">

            <div className="stat-icon">
              ⏳
            </div>

            <div>

              <strong>
                {pendingComplaints}
              </strong>

              <span>
                Pending
              </span>

            </div>

          </div>


          <div className="admin-stat-card">

            <div className="stat-icon">
              🔄
            </div>

            <div>

              <strong>
                {progressComplaints}
              </strong>

              <span>
                In Progress
              </span>

            </div>

          </div>


          <div className="admin-stat-card">

            <div className="stat-icon">
              ✅
            </div>

            <div>

              <strong>
                {resolvedComplaints}
              </strong>

              <span>
                Resolved
              </span>

            </div>

          </div>

        </section>


        {/* ================= QUICK ACTIONS ================= */}

        <section className="admin-section">

          <div className="section-title">

            <h2>
              Quick Actions
            </h2>

          </div>


          <div className="admin-actions">


            <button
              className="admin-action-card"
              onClick={fetchComplaints}
            >

              <span>
                📥
              </span>

              <div>

                <strong>
                  Refresh Complaints
                </strong>

                <small>
                  Get latest complaints
                </small>

              </div>

            </button>


            <button
              className="admin-action-card"
              onClick={() => {

                const highPriority =
                  complaints.filter(
                    (issue) =>
                      issue.priority === 'HIGH'
                  )

                if (highPriority.length === 0) {
                  alert('No high priority complaints.')
                } else {
                  alert(
                    `${highPriority.length} high priority complaint(s) found.`
                  )
                }

              }}
            >

              <span>
                🔴
              </span>

              <div>

                <strong>
                  High Priority
                </strong>

                <small>
                  View urgent complaints
                </small>

              </div>

            </button>


            <button
              className="admin-action-card"
              onClick={() => {

                const pending =
                  complaints.filter(
                    (issue) =>
                      issue.status === 'PENDING'
                  )

                alert(
                  `${pending.length} complaint(s) are pending.`
                )

              }}
            >

              <span>
                🕐
              </span>

              <div>

                <strong>
                  Pending Issues
                </strong>

                <small>
                  Complaints waiting for action
                </small>

              </div>

            </button>


            <button
              className="admin-action-card"
              onClick={() =>
                alert('Comments section coming next.')
              }
            >

              <span>
                💬
              </span>

              <div>

                <strong>
                  Comments
                </strong>

                <small>
                  Respond to users
                </small>

              </div>

            </button>


          </div>

        </section>


        {/* ================= RECENT COMPLAINTS ================= */}

        <section className="admin-section">


          <div className="section-title">

            <h2>
              Recent Complaints
            </h2>

            <button
              className="view-all-btn"
              onClick={fetchComplaints}
            >
              Refresh
            </button>

          </div>


          <div className="complaint-table">


            <div className="table-header">

              <span>
                Complaint
              </span>

              <span>
                Category
              </span>

              <span>
                Priority
              </span>

              <span>
                Status
              </span>

            </div>


            {/* LOADING */}

            {loading && (

              <div className="empty-complaints">

                Loading complaints...

              </div>

            )}


            {/* NO COMPLAINTS */}

            {!loading && complaints.length === 0 && (

              <div className="empty-complaints">

                <div>
                  📭
                </div>

                <strong>
                  No complaints found
                </strong>

                <p>
                  New complaints will appear here.
                </p>

              </div>

            )}


            {/* COMPLAINTS */}

            {!loading &&
              complaints.map((issue) => (

                <div
                  className="complaint-row complaint-clickable"
                  key={issue.issue_id}
                  onClick={() =>
                    onComplaintClick(issue)
                  }
                >


                  <div>

                    <strong>
                      {issue.title}
                    </strong>

                    <small>
                      📍 {issue.location}
                    </small>

                  </div>


                  <span>
                    {issue.category_name || 'General'}
                  </span>


                  <span
                    className={`priority ${
                      issue.priority?.toLowerCase() ||
                      'medium'
                    }`}
                  >
                    {issue.priority || 'MEDIUM'}
                  </span>


                  <span
                    className={`status ${
                      issue.status === 'RESOLVED'
                        ? 'resolved-status'
                        : issue.status === 'IN_PROGRESS'
                        ? 'progress-status'
                        : 'pending-status'
                    }`}
                  >
                    {issue.status
                      ? issue.status.replace('_', ' ')
                      : 'PENDING'}
                  </span>


                </div>

              ))}


          </div>

        </section>


      </main>

    </div>
  )
}

export default AdminDashboard