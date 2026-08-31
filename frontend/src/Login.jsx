import { useState } from "react";
import "./App.css";

function Login({ onBack, onLoginSuccess, onSignup }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("student");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  // =====================================================
  // NORMAL LOGIN
  // =====================================================

  const handleLogin = async (e) => {
    e.preventDefault();

    if (!email || !password) {
      alert("Please enter email and password.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(
        "http://localhost:5000/api/auth/login",
        {
          method: "POST",

          headers: {
            "Content-Type": "application/json",
          },

          body: JSON.stringify({
            email: email.trim().toLowerCase(),
            password,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        alert(data.message || "Invalid email or password");
        return;
      }

      const loggedInUser = data.user;

      // Check selected role
      const selectedRole = role.toUpperCase();
      const actualRole = loggedInUser.role;

      if (selectedRole !== actualRole) {
        alert(
          "This account is registered as " +
            actualRole +
            ", not " +
            selectedRole +
            "."
        );

        return;
      }

      alert("Login successful!");

      onLoginSuccess(loggedInUser);

    } catch (error) {
      console.error("Login error:", error);

      alert(
        "Unable to connect to server. Is backend running?"
      );
    } finally {
      setLoading(false);
    }
  };

  // =====================================================
  // GOOGLE LOGIN
  // =====================================================

  const handleGoogleLogin = () => {
    alert(
      "Google Sign-In will be connected in the next step."
    );
  };

  // =====================================================
  // UI
  // =====================================================

  return (
    <div className="login-page">

      {/* Background */}

      <div className="login-glow glow-one"></div>
      <div className="login-glow glow-two"></div>


      {/* Login Card */}

      <div className="login-card">

        {/* Brand */}

        <div className="login-brand">

          <div className="login-icon">
            🏫
          </div>

          <div className="login-brand-text">

            <strong>
              Campus Civic
            </strong>

            <span>
              Campus Issue Management
            </span>

          </div>

        </div>


        {/* Heading */}

        <div className="login-heading">

          <p>
            WELCOME BACK
          </p>

          <h1>
            Sign in to your account
          </h1>

          <span>
            Access your Campus Civic dashboard
          </span>

        </div>


        {/* Google Login */}

        <button
          type="button"
          className="google-login-btn"
          onClick={handleGoogleLogin}
        >

          <span className="google-icon">
            G
          </span>

          <span>
            Continue with Google
          </span>

        </button>


        {/* Divider */}

        <div className="login-divider">

          <span></span>

          <p>
            OR CONTINUE WITH EMAIL
          </p>

          <span></span>

        </div>


        {/* Role Selection */}

        <div className="role-section">

          <label>
            Continue as
          </label>

          <div className="role-options">

            {/* Student */}

            <button
              type="button"
              className={
                role === "student"
                  ? "role-btn active"
                  : "role-btn"
              }
              onClick={() => setRole("student")}
            >

              <span className="role-btn-icon">
                🎓
              </span>

              <span className="role-btn-text">

                <strong>
                  Student
                </strong>

                <small>
                  Report & track issues
                </small>

              </span>

              {role === "student" && (
                <span className="role-selected">
                  ✓
                </span>
              )}

            </button>


            {/* Faculty */}

            <button
              type="button"
              className={
                role === "faculty"
                  ? "role-btn active"
                  : "role-btn"
              }
              onClick={() => setRole("faculty")}
            >

              <span className="role-btn-icon">
                👩‍🏫
              </span>

              <span className="role-btn-text">

                <strong>
                  Faculty
                </strong>

                <small>
                  Report campus issues
                </small>

              </span>

              {role === "faculty" && (
                <span className="role-selected">
                  ✓
                </span>
              )}

            </button>


            {/* Administrator */}

            <button
              type="button"
              className={
                role === "admin"
                  ? "role-btn active admin-role"
                  : "role-btn"
              }
              onClick={() => setRole("admin")}
            >

              <span className="role-btn-icon">
                🛡️
              </span>

              <span className="role-btn-text">

                <strong>
                  Administrator
                </strong>

                <small>
                  Manage & resolve complaints
                </small>

              </span>

              {role === "admin" && (
                <span className="role-selected">
                  ✓
                </span>
              )}

            </button>

          </div>

        </div>


        {/* Login Form */}

        <form onSubmit={handleLogin}>

          {/* Email */}

          <div className="login-field">

            <label>
              Email Address
            </label>

            <div className="input-wrapper">

              <span className="input-icon">
                ✉️
              </span>

              <input
                type="email"
                placeholder="you@nit.edu.in"
                value={email}
                onChange={(e) =>
                  setEmail(e.target.value)
                }
                required
              />

            </div>

          </div>


          {/* Password */}

          <div className="login-field">

            <label>
              Password
            </label>

            <div className="input-wrapper">

              <span className="input-icon">
                🔒
              </span>

              <input
                type={
                  showPassword
                    ? "text"
                    : "password"
                }
                placeholder="Enter your password"
                value={password}
                onChange={(e) =>
                  setPassword(e.target.value)
                }
                required
              />

              <button
                type="button"
                className="password-toggle"
                onClick={() =>
                  setShowPassword(
                    !showPassword
                  )
                }
              >
                {showPassword
                  ? "🙈"
                  : "👁️"}
              </button>

            </div>

          </div>


          {/* Login Button */}

          <button
            type="submit"
            className="login-submit"
            disabled={loading}
          >

            <span>
              {loading
                ? "Signing in..."
                : "Sign in as " +
                  role.charAt(0).toUpperCase() +
                  role.slice(1)}
            </span>

            {!loading && (
              <span>
                →
              </span>
            )}

          </button>

        </form>


        {/* Create Account */}

        <div className="signup-prompt">

          <span>
            Don't have an account?
          </span>

          <button
            type="button"
            className="signup-link-btn"
            onClick={onSignup}
          >
            Create an account →
          </button>

        </div>


        {/* Back */}

        <button
          type="button"
          className="back-home"
          onClick={onBack}
        >
          ← Back to Home
        </button>


        {/* Security */}

        <div className="login-security">

          <span>
            🔐
          </span>

          Secure Campus Civic Access

        </div>

      </div>

    </div>
  );
}

export default Login;