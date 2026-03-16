import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Login() {
  const { login }   = useAuth()
  const navigate    = useNavigate()
  const [form, setForm]     = useState({ username: '', password: '' })
  const [error, setError]   = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login(form.username, form.password)
      navigate('/')
    } catch (err) {
      setError(err.message || 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh', background: 'var(--bg)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      {/* Background grid */}
      <div style={{
        position: 'fixed', inset: 0, pointerEvents: 'none',
        backgroundImage: 'linear-gradient(rgba(255,255,255,0.025) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.025) 1px,transparent 1px)',
        backgroundSize: '48px 48px',
      }} />

      <div style={{ width: 380, position: 'relative', zIndex: 1 }}>
        {/* Logo */}
        <div className="flex flex-col items-center mb-32" style={{ marginBottom: 32, alignItems: 'center' }}>
          <div className="logo-mark" style={{ width: 48, height: 48, borderRadius: 12, marginBottom: 16 }}>
            <svg viewBox="0 0 24 24" fill="white" width="26" height="26">
              <path d="M12 2C8 2 5 5 5 8.5c0 2 1 3.8 2.5 5L12 22l4.5-8.5C18 12.3 19 10.5 19 8.5 19 5 16 2 12 2zm0 9a2.5 2.5 0 110-5 2.5 2.5 0 010 5z"/>
            </svg>
          </div>
          <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: -0.5 }}>OrganMatch</div>
          <div style={{ fontSize: 12, color: 'var(--text2)', marginTop: 4, letterSpacing: 1, textTransform: 'uppercase' }}>
            National Transplant Coordination Platform
          </div>
        </div>

        <div className="card" style={{ padding: 28 }}>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Username</label>
              <input
                className="form-control"
                placeholder="Enter username"
                value={form.username}
                onChange={(e) => setForm({ ...form, username: e.target.value })}
                autoFocus
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Password</label>
              <input
                className="form-control"
                type="password"
                placeholder="Enter password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                required
              />
            </div>

            {error && (
              <div style={{
                background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)',
                borderRadius: 8, padding: '8px 12px', fontSize: 12, color: 'var(--red)', marginBottom: 14,
              }}>{error}</div>
            )}

            <button
              type="submit"
              className="btn btn-primary"
              style={{ width: '100%', justifyContent: 'center', padding: '10px', fontSize: 14 }}
              disabled={loading}
            >
              {loading ? 'Signing in…' : 'Sign In'}
            </button>
          </form>
        </div>

        <div style={{ textAlign: 'center', marginTop: 16, fontSize: 11, color: 'var(--text3)' }}>
          Authorized personnel only · All access is audited
        </div>
      </div>
    </div>
  )
}
