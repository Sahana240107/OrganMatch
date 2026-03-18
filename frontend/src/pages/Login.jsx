import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Login() {
  const { login }   = useAuth()
  const navigate    = useNavigate()
  const [form, setForm]   = useState({ username: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login(form.username, form.password)
      navigate('/')
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Invalid credentials')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-page">
      {/* Decorative dots */}
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}>
        {[...Array(6)].map((_, i) => (
          <div key={i} style={{
            position: 'absolute',
            borderRadius: '50%',
            border: '1px solid rgba(13,110,253,0.08)',
            width: (i + 1) * 160,
            height: (i + 1) * 160,
            top: '50%', left: '50%',
            transform: 'translate(-50%, -50%)',
          }} />
        ))}
      </div>

      <div className="login-card">
        <div className="login-logo">
          <svg viewBox="0 0 24 24" fill="white" width="26" height="26">
            <path d="M12 21.593c-5.63-5.539-11-10.297-11-14.402 0-3.791 3.068-5.191 5.281-5.191 1.312 0 4.151.501 5.719 4.457 1.59-3.968 4.464-4.447 5.726-4.447 2.54 0 5.274 1.621 5.274 5.181 0 4.069-5.136 8.625-11 14.402z"/>
          </svg>
        </div>

        <div className="login-title">OrganMatch</div>
        <div className="login-sub">
          National Transplant Coordination Platform<br/>
          <span style={{ fontSize: 12, color: 'var(--text3)' }}>Authorized personnel only · All access is audited</span>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group mb-16">
            <label className="form-label">Username</label>
            <input
              className="form-control"
              placeholder="Enter your username"
              value={form.username}
              onChange={e => setForm({ ...form, username: e.target.value })}
              autoFocus
              required
              autoComplete="username"
            />
          </div>

          <div className="form-group mb-20">
            <label className="form-label">Password</label>
            <input
              className="form-control"
              type="password"
              placeholder="Enter your password"
              value={form.password}
              onChange={e => setForm({ ...form, password: e.target.value })}
              required
              autoComplete="current-password"
            />
          </div>

          {error && (
            <div style={{
              background: 'var(--red-bg)', border: '1px solid #fca5a5',
              borderRadius: 10, padding: '10px 14px', fontSize: 13,
              color: 'var(--red)', marginBottom: 16,
            }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            className="btn btn-primary btn-lg"
            style={{ width: '100%', justifyContent: 'center' }}
            disabled={loading}
          >
            {loading ? (
              <><div className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} /> Signing in…</>
            ) : (
              <>
                <svg viewBox="0 0 20 20" fill="currentColor" style={{ width: 16, height: 16 }}>
                  <path fillRule="evenodd" d="M3 3a1 1 0 011 1v12a1 1 0 11-2 0V4a1 1 0 011-1zm10.293 9.293a1 1 0 001.414 1.414l3-3a1 1 0 000-1.414l-3-3a1 1 0 10-1.414 1.414L14.586 9H7a1 1 0 100 2h7.586l-1.293 1.293z" clipRule="evenodd"/>
                </svg>
                Sign In to Platform
              </>
            )}
          </button>
        </form>

        <div style={{ marginTop: 24, padding: '14px', background: 'var(--bg3)', borderRadius: 12, fontSize: 12 }}>
          <div style={{ color: 'var(--text3)', marginBottom: 6, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.6px', fontSize: 10 }}>Demo Credentials</div>
          <div style={{ color: 'var(--text2)' }}>Username: <strong style={{ fontFamily: 'var(--mono)', color: 'var(--text)' }}>coordinator</strong></div>
          <div style={{ color: 'var(--text2)' }}>Password: <strong style={{ fontFamily: 'var(--mono)', color: 'var(--text)' }}>organmatch2024</strong></div>
        </div>
      </div>
    </div>
  )
}
