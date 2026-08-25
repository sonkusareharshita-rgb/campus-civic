import { useState } from 'react'
import './App.css'

function Login({ onBack, onLoginSuccess }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const handleLogin = async (e) => {
    e.preventDefault()

    try {
      const response = await fetch(
        'http://localhost:5000/api/auth/login',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email: email,
            password: password,
          }),
        }
      )

      const data = await response.json()

      if (response.ok) {
        alert('Login successful! 🎉')

        console.log('Login response:', data)

        onLoginSuccess()
      } else {
        alert(data.message || 'Invalid email or password')
      }

    } catch (error) {

      console.error('Login error:', error)

      alert(
        'Unable to connect to server. Is backend running?'
      )
    }
  }

  return (
    <div className="login-page">

      <div className="login-card">

        <div className="login-icon">
          🏫
        </div>

        <h1>
          Welcome Back
        </h1>

        <p className="login-subtitle">
          Login to your Campus Civic account
        </p>

        <form onSubmit={handleLogin}>

          <label>
            Email
          </label>

          <input
            type="email"
            placeholder="Enter your email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <label>
            Password
          </label>

          <input
            type="password"
            placeholder="Enter your password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          <button
            type="submit"
            className="login-submit"
          >
            Login
          </button>

        </form>

        <button
          type="button"
          className="back-home"
          onClick={onBack}
        >
          ← Back
        </button>

      </div>

    </div>
  )
}

export default Login