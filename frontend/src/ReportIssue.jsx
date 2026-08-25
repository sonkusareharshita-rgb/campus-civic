import { useState } from 'react'
import './App.css'

function ReportIssue({ onBack }) {
  const [role, setRole] = useState('')
  const [priority, setPriority] = useState('')
  const [image, setImage] = useState(null)

  const [formData, setFormData] = useState({
    name: '',
    year: '',
    department: '',
    location: '',
    admin: '',
    category: '',
    description: '',
  })

  const handleChange = (e) => {
    const { name, value } = e.target

    setFormData({
      ...formData,
      [name]: value,
    })
  }

  const handleSubmit = (e) => {
    e.preventDefault()

    alert('Form ready! Backend submission will be connected next.')
  }

  return (
    <div className="report-page">

      <nav className="report-navbar">

        <div className="logo">
          🏫 Campus Civic
        </div>

        <button
          className="report-back-btn"
          onClick={onBack}
        >
          ← Back to Dashboard
        </button>

      </nav>

      <main className="report-main">

        <div className="report-heading">

          <div>
            <span className="report-badge">
              CAMPUS CIVIC
            </span>

            <h1>
              Report a Campus Issue
            </h1>

            <p>
              Tell us about the problem and we'll make sure
              it reaches the right person.
            </p>
          </div>

          <div className="report-heading-icon">
            📝
          </div>

        </div>

        <form
          className="report-form"
          onSubmit={handleSubmit}
        >

          {/* ROLE */}

          <section className="report-section">

            <div className="section-number">
              01
            </div>

            <div className="section-content">

              <h2>
                Who are you?
              </h2>

              <p className="section-subtitle">
                Select your role before reporting an issue.
              </p>

              <div className="role-grid">

                <button
                  type="button"
                  className={`role-option ${
                    role === 'student'
                      ? 'active-role'
                      : ''
                  }`}
                  onClick={() => setRole('student')}
                >
                  <span className="role-icon">
                    🎓
                  </span>

                  <span>
                    <strong>
                      Student
                    </strong>

                    <small>
                      I am a student
                    </small>
                  </span>

                  <span className="role-check">
                    {role === 'student' ? '✓' : ''}
                  </span>

                </button>

                <button
                  type="button"
                  className={`role-option ${
                    role === 'faculty'
                      ? 'active-role'
                      : ''
                  }`}
                  onClick={() => setRole('faculty')}
                >
                  <span className="role-icon">
                    👨‍🏫
                  </span>

                  <span>
                    <strong>
                      Faculty
                    </strong>

                    <small>
                      I am a faculty member
                    </small>
                  </span>

                  <span className="role-check">
                    {role === 'faculty' ? '✓' : ''}
                  </span>

                </button>

              </div>

            </div>

          </section>

          {/* USER INFORMATION */}

          {role && (
            <section className="report-section">

              <div className="section-number">
                02
              </div>

              <div className="section-content">

                <h2>
                  Your Information
                </h2>

                <p className="section-subtitle">
                  Provide your academic information.
                </p>

                <div className="input-grid">

                  <div className="field">
                    <label>
                      Full Name
                    </label>

                    <input
                      type="text"
                      name="name"
                      placeholder="Enter your full name"
                      value={formData.name}
                      onChange={handleChange}
                      required
                    />
                  </div>

                  {role === 'student' && (
                    <div className="field">

                      <label>
                        Year
                      </label>

                      <select
                        name="year"
                        value={formData.year}
                        onChange={handleChange}
                        required
                      >
                        <option value="">
                          Select year
                        </option>

                        <option>
                          1st Year
                        </option>

                        <option>
                          2nd Year
                        </option>

                        <option>
                          3rd Year
                        </option>

                        <option>
                          4th Year
                        </option>

                      </select>

                    </div>
                  )}

                  <div className="field">

                    <label>
                      Department
                    </label>

                    <select
                      name="department"
                      value={formData.department}
                      onChange={handleChange}
                      required
                    >
                      <option value="">
                        Select department
                      </option>

                      <option>
                        Information Technology
                      </option>

                      <option>
                        Computer Science
                      </option>

                      <option>
                        Electronics
                      </option>

                      <option>
                        Mechanical
                      </option>

                      <option>
                        Civil
                      </option>

                      <option>
                        Other
                      </option>

                    </select>

                  </div>

                </div>

              </div>

            </section>
          )}

          {/* ISSUE DETAILS */}

          {role && (
            <section className="report-section">

              <div className="section-number">
                03
              </div>

              <div className="section-content">

                <h2>
                  Issue Details
                </h2>

                <p className="section-subtitle">
                  Give us enough information to understand the problem.
                </p>

                <div className="field">

                  <label>
                    Location
                  </label>

                  <input
                    type="text"
                    name="location"
                    placeholder="e.g. Central Library, Block A, Room 204"
                    value={formData.location}
                    onChange={handleChange}
                    required
                  />

                </div>

                <div className="input-grid">

                  <div className="field">

                    <label>
                      Assign to Admin
                    </label>

                    <select
                      name="admin"
                      value={formData.admin}
                      onChange={handleChange}
                      required
                    >

                      <option value="">
                        Select responsible admin
                      </option>

                      <option>
                        Maintenance Admin
                      </option>

                      <option>
                        Electrical Admin
                      </option>

                      <option>
                        IT Admin
                      </option>

                      <option>
                        Security Admin
                      </option>

                      <option>
                        Cleanliness Admin
                      </option>

                    </select>

                  </div>

                  <div className="field">

                    <label>
                      Category
                    </label>

                    <select
                      name="category"
                      value={formData.category}
                      onChange={handleChange}
                      required
                    >

                      <option value="">
                        Select category
                      </option>

                      <option>
                        Electricity
                      </option>

                      <option>
                        Water
                      </option>

                      <option>
                        Cleanliness
                      </option>

                      <option>
                        Infrastructure
                      </option>

                      <option>
                        Wi-Fi / Internet
                      </option>

                      <option>
                        Security
                      </option>

                      <option>
                        Other
                      </option>

                    </select>

                  </div>

                </div>

                <div className="field">

                  <label>
                    Description
                  </label>

                  <textarea
                    name="description"
                    placeholder="Describe what happened, where it happened, and any other useful details..."
                    value={formData.description}
                    onChange={handleChange}
                    required
                  />

                  <span className="field-hint">
                    Be as specific as possible.
                  </span>

                </div>

              </div>

            </section>
          )}

          {/* PRIORITY */}

          {role && (
            <section className="report-section">

              <div className="section-number">
                04
              </div>

              <div className="section-content">

                <h2>
                  Priority
                </h2>

                <p className="section-subtitle">
                  How urgently does this issue need attention?
                </p>

                <div className="priority-grid">

                  <button
                    type="button"
                    className={`priority-option ${
                      priority === 'Low'
                        ? 'active-priority'
                        : ''
                    }`}
                    onClick={() => setPriority('Low')}
                  >
                    <span>🟢</span>

                    <strong>
                      Low
                    </strong>

                    <small>
                      Minor inconvenience
                    </small>
                  </button>

                  <button
                    type="button"
                    className={`priority-option ${
                      priority === 'Medium'
                        ? 'active-priority'
                        : ''
                    }`}
                    onClick={() => setPriority('Medium')}
                  >
                    <span>🟡</span>

                    <strong>
                      Medium
                    </strong>

                    <small>
                      Needs attention
                    </small>
                  </button>

                  <button
                    type="button"
                    className={`priority-option ${
                      priority === 'High'
                        ? 'active-priority'
                        : ''
                    }`}
                    onClick={() => setPriority('High')}
                  >
                    <span>🟠</span>

                    <strong>
                      High
                    </strong>

                    <small>
                      Should be fixed soon
                    </small>
                  </button>

                  <button
                    type="button"
                    className={`priority-option ${
                      priority === 'Urgent'
                        ? 'active-priority'
                        : ''
                    }`}
                    onClick={() => setPriority('Urgent')}
                  >
                    <span>🔴</span>

                    <strong>
                      Urgent
                    </strong>

                    <small>
                      Immediate attention
                    </small>
                  </button>

                </div>

              </div>

            </section>
          )}

          {/* IMAGE */}

          {role && (
            <section className="report-section">

              <div className="section-number">
                05
              </div>

              <div className="section-content">

                <h2>
                  Add Evidence
                </h2>

                <p className="section-subtitle">
                  Upload a photo if it helps explain the issue.
                </p>

                <label className="upload-area">

                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) =>
                      setImage(e.target.files[0])
                    }
                  />

                  <span className="upload-icon">
                    📷
                  </span>

                  <strong>
                    {image
                      ? image.name
                      : 'Upload an image'}
                  </strong>

                  <small>
                    PNG, JPG or JPEG
                  </small>

                </label>

              </div>

            </section>
          )}

          {/* DUPLICATE */}

          {role && (
            <section className="duplicate-section">

              <div className="duplicate-icon">
                🔎
              </div>

              <div>

                <h3>
                  Duplicate Complaint Check
                </h3>

                <p>
                  Before submitting, we'll check whether
                  a similar complaint already exists at this location.
                </p>

              </div>

            </section>
          )}

          {/* SUBMIT */}

          {role && (
            <div className="submit-area">

              <button
                type="submit"
                className="submit-issue-btn"
              >
                Check & Submit Issue
                <span>→</span>
              </button>

              <p>
                Your complaint will initially be marked as
                <strong> Pending</strong>.
              </p>

            </div>
          )}

        </form>

      </main>

    </div>
  )
}

export default ReportIssue