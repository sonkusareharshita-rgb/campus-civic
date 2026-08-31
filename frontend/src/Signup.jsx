import { useState } from "react";
import "./App.css";

function Signup({ onBack, onLogin, onSignupSuccess }) {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    role: "STUDENT",
    department_id: "",
    year: "",
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] =
    useState(false);
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSignup = async (e) => {
    e.preventDefault();

    const email = formData.email.trim().toLowerCase();

    // College email validation
    if (!email.endsWith("@nit.edu.in")) {
      alert("Please use your NIT college email ending with @nit.edu.in");
      return;
    }

    // Password validation
    if (formData.password.length < 6) {
      alert("Password must contain at least 6 characters.");
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      alert("Passwords do not match.");
      return;
    }

    // Student validation
    if (
      formData.role === "STUDENT" &&
      (!formData.department_id || !formData.year)
    ) {
      alert("Please select your department and year.");
      return;
    }

    // Faculty validation
    if (
      formData.role === "FACULTY" &&
      !formData.department_id
    ) {
      alert("Please select your department.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(
        "http://localhost:5000/api/auth/register",
        {
          method: "POST",

          headers: {
            "Content-Type": "application/json",
          },

          body: JSON.stringify({
            name: formData.name.trim(),
            email: email,
            password: formData.password,
            role: formData.role,
            department_id:
              formData.department_id || null,
            year:
              formData.role === "STUDENT"
                ? formData.year
                : null,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        alert(
          data.message ||
            "Unable to create account."
        );
        return;
      }

      alert(
        "Account created successfully! You can now sign in."
      );

      if (onSignupSuccess && data.user) {
        onSignupSuccess(data.user);
      } else {
        onLogin();
      }
    } catch (error) {
      console.error("Signup error:", error);

      alert(
        "Unable to connect to server. Is backend running?"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="signup-page">

      {/* Background decoration */}

      <div className="signup-glow signup-glow-one"></div>
      <div className="signup-glow signup-glow-two"></div>

      <div className="signup-card">

        {/* BRAND */}

        <div className="signup-brand">

          <div className="signup-brand-icon">
            🏫
          </div>

          <div>
            <strong>
              Campus Civic
            </strong>

            <span>
              Campus Issue Management
            </span>
          </div>

        </div>

        {/* HEADING */}

        <div className="signup-heading">

          <span className="signup-label">
            JOIN CAMPUS CIVIC
          </span>

          <h1>
            Create your account
          </h1>

          <p>
            Use your NIT college account to join
            the campus community.
          </p>

        </div>

        {/* GOOGLE */}

        <button
          type="button"
          className="google-signup-btn"
          onClick={() =>
            alert(
              "Google Sign Up will be connected with NIT Google authentication."
            )
          }
        >

          <span className="google-logo">
            G
          </span>

          <span>
            Continue with Google
          </span>

        </button>

        <div className="signup-divider">
          <span></span>
          <p>OR</p>
          <span></span>
        </div>

        {/* FORM */}

        <form onSubmit={handleSignup}>

          {/* NAME */}

          <div className="signup-field">

            <label>
              Full Name
            </label>

            <div className="signup-input-wrapper">

              <span>
                👤
              </span>

              <input
                type="text"
                name="name"
                placeholder="Enter your full name"
                value={formData.name}
                onChange={handleChange}
                required
              />

            </div>

          </div>

          {/* EMAIL */}

          <div className="signup-field">

            <label>
              College Email
            </label>

            <div className="signup-input-wrapper">

              <span>
                ✉️
              </span>

              <input
                type="email"
                name="email"
                placeholder="yourname@nit.edu.in"
                value={formData.email}
                onChange={handleChange}
                required
              />

            </div>

            <small>
              Only @nit.edu.in college email addresses are allowed.
            </small>

          </div>

          {/* ROLE */}

          <div className="signup-field">

            <label>
              Account Type
            </label>

            <div className="signup-role-options">

              <button
                type="button"
                className={
                  formData.role === "STUDENT"
                    ? "signup-role active"
                    : "signup-role"
                }
                onClick={() =>
                  setFormData((prev) => ({
                    ...prev,
                    role: "STUDENT",
                  }))
                }
              >

                <span>
                  🎓
                </span>

                <strong>
                  Student
                </strong>

              </button>

              <button
                type="button"
                className={
                  formData.role === "FACULTY"
                    ? "signup-role active"
                    : "signup-role"
                }
                onClick={() =>
                  setFormData((prev) => ({
                    ...prev,
                    role: "FACULTY",
                  }))
                }
              >

                <span>
                  👩‍🏫
                </span>

                <strong>
                  Faculty
                </strong>

              </button>

            </div>

          </div>

          {/* DEPARTMENT */}

          <div className="signup-field">

            <label>
              Department
            </label>

            <div className="signup-input-wrapper">

              <span>
                🏢
              </span>

              <select
                name="department_id"
                value={formData.department_id}
                onChange={handleChange}
                required
              >

                <option value="">
                  Select department
                </option>

                <option value="1">
                  Information Technology
                </option>

                <option value="2">
                  Computer Science
                </option>

                <option value="3">
                  Electronics
                </option>

                <option value="4">
                  Mechanical
                </option>

                <option value="5">
                  Civil
                </option>

              </select>

            </div>

          </div>

          {/* YEAR */}

          {formData.role === "STUDENT" && (

            <div className="signup-field">

              <label>
                Year
              </label>

              <div className="signup-input-wrapper">

                <span>
                  📚
                </span>

                <select
                  name="year"
                  value={formData.year}
                  onChange={handleChange}
                  required
                >

                  <option value="">
                    Select year
                  </option>

                  <option value="1st Year">
                    1st Year
                  </option>

                  <option value="2nd Year">
                    2nd Year
                  </option>

                  <option value="3rd Year">
                    3rd Year
                  </option>

                  <option value="4th Year">
                    4th Year
                  </option>

                </select>

              </div>

            </div>

          )}

          {/* PASSWORD */}

          <div className="signup-field">

            <label>
              Password
            </label>

            <div className="signup-input-wrapper">

              <span>
                🔒
              </span>

              <input
                type={
                  showPassword
                    ? "text"
                    : "password"
                }
                name="password"
                placeholder="Create a password"
                value={formData.password}
                onChange={handleChange}
                required
              />

              <button
                type="button"
                className="signup-password-toggle"
                onClick={() =>
                  setShowPassword(!showPassword)
                }
              >
                {showPassword ? "🙈" : "👁️"}
              </button>

            </div>

          </div>

          {/* CONFIRM PASSWORD */}

          <div className="signup-field">

            <label>
              Confirm Password
            </label>

            <div className="signup-input-wrapper">

              <span>
                🔐
              </span>

              <input
                type={
                  showConfirmPassword
                    ? "text"
                    : "password"
                }
                name="confirmPassword"
                placeholder="Confirm your password"
                value={formData.confirmPassword}
                onChange={handleChange}
                required
              />

              <button
                type="button"
                className="signup-password-toggle"
                onClick={() =>
                  setShowConfirmPassword(
                    !showConfirmPassword
                  )
                }
              >
                {showConfirmPassword
                  ? "🙈"
                  : "👁️"}
              </button>

            </div>

          </div>

          {/* SUBMIT */}

          <button
            type="submit"
            className="signup-submit"
            disabled={loading}
          >

            {loading
              ? "Creating account..."
              : "Create Account"}

            {!loading && (
              <span>
                →
              </span>
            )}

          </button>

        </form>

        {/* LOGIN */}

        <div className="signup-login">

          <span>
            Already have an account?
          </span>

          <button
            type="button"
            onClick={onLogin}
          >
            Sign in
          </button>

        </div>

        {/* BACK */}

        <button
          type="button"
          className="signup-back"
          onClick={onBack}
        >
          ← Back
        </button>

        <div className="signup-security">
          🔐 Secure NIT Campus Access
        </div>

      </div>
    </div>
  );
}

export default Signup;