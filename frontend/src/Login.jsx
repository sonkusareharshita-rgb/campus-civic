import { useState } from "react";
import "./App.css";

function Login({ onBack, onLoginSuccess }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("student");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();

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
            email,
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

      console.log("Login response:", loggedInUser);

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

  return (
    <div className="login-page">
      {/* BACKGROUND DECORATION */}

      <div className="login-glow glow-one"></div>
      <div className="login-glow glow-two"></div>

      <div className="login-card">
        {/* BRAND */}

        <div className="login-brand">
          <div className="login-icon">🏫</div>

          <div>
            <strong>Campus Civic</strong>

            <span>Campus Issue Management</span>
          </div>
        </div>

        {/* HEADING */}

        <div className="login-heading">
          <p>WELCOME BACK</p>

          <h1>Sign in to your account</h1>

          <span>
            Access your Campus Civic dashboard
          </span>
        </div>

        {/* ROLE */}

        <div className="role-section">
          <label>Continue as</label>

          <div className="role-options">
            {/* STUDENT */}

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
                <strong>Student</strong>

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

            {/* FACULTY */}

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
                <strong>Faculty</strong>

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

            {/* ADMIN */}

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
                <strong>Administrator</strong>

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

        {/* LOGIN FORM */}

        <form onSubmit={handleLogin}>
          {/* EMAIL */}

          <div className="login-field">
            <label>Email Address</label>

            <div className="input-wrapper">
              <span className="input-icon">✉️</span>

              <input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) =>
                  setEmail(e.target.value)
                }
                required
              />
            </div>
          </div>

          {/* PASSWORD */}

          <div className="login-field">
            <label>Password</label>

            <div className="input-wrapper">
              <span className="input-icon">🔒</span>

              <input
                type={
                  showPassword ? "text" : "password"
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
                  setShowPassword(!showPassword)
                }
                aria-label={
                  showPassword
                    ? "Hide password"
                    : "Show password"
                }
              >
                {showPassword ? "🙈" : "👁️"}
              </button>
            </div>
          </div>

          {/* LOGIN BUTTON */}

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

            {!loading && <span>→</span>}
          </button>
        </form>

        {/* BACK */}

        <button
          type="button"
          className="back-home"
          onClick={onBack}
        >
          ← Back to Home
        </button>

        <div className="login-security">
          🔐 Secure Campus Civic Access
        </div>
      </div>
    </div>
  );
}

export default Login;