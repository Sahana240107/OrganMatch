import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useNotifications } from '../../context/NotificationContext'
import { useApi } from '../../hooks/useApi'

const PAGE_LABELS = {
  '/':             'Dashboard',
  '/matching':     'Matching Engine',
  '/donors':       'Donors',
  '/recipients':   'Recipients',
  '/waiting':      'Waiting List',
  '/offers':       'Offer Workflow',
  '/map':          'Location Map',
  '/hospitals':    'Hospitals',
  '/history':      'Transplant History',
  '/analytics':    'Analytics',
  '/notifications':'Notifications',
  '/register-donor':    'Register Donor',
  '/register-recipient':'Register Recipient',
}

const TICKER_DEFAULTS = [
  { color: 'blue',  label: 'System Operational — All services running normally' },
  { color: '',      label: 'OrganMatch v2.0 — Real-time matching engine active' },
  { color: 'amber', label: 'Donor registration open 24/7 — Contact your coordinator' },
  { color: '',      label: 'UNOS-compatible scoring algorithm — 7-component weighted matching' },
  { color: 'blue',  label: 'WebSocket live updates enabled — Dashboard refreshes in real-time' },
]

export default function Topbar({ path }) {
  const navigate             = useNavigate()
  const { user }             = useAuth()
  const { unreadCount }      = useNotifications()
  const { request }          = useApi()
  const [stats, setStats]    = useState(null)
  const [tickers, setTickers] = useState(TICKER_DEFAULTS)

  const label = PAGE_LABELS[path] || 'OrganMatch'

  useEffect(() => {
    request('GET', '/api/analytics/summary')
      .then(d => {
        setStats(d)
        const live = [
          d.active_organs > 0
            ? { color: 'blue',  label: `${d.active_organs} organ(s) active — awaiting allocation` }
            : null,
          d.status_1a > 0
            ? { color: 'red',   label: `🚨 ${d.status_1a} Status 1A patient(s) — critical priority` }
            : null,
          d.waiting_recipients > 0
            ? { color: '',      label: `${d.waiting_recipients} recipients on waiting list` }
            : null,
          d.pending_offers > 0
            ? { color: 'amber', label: `${d.pending_offers} offer(s) awaiting response` }
            : null,
          ...TICKER_DEFAULTS,
        ].filter(Boolean)
        setTickers(live)
      })
      .catch(() => {})
  }, [])

  const tickerDouble = [...tickers, ...tickers]

  return (
    <>
      <header className="topbar">
        <div className="topbar-breadcrumb">
          <span style={{ color: 'var(--text3)' }}>OrganMatch /&nbsp;</span>
          <strong>{label}</strong>
        </div>

        {stats && (
          <div className="flex items-center gap-8" style={{ fontSize: 12 }}>
            {stats.status_1a > 0 && (
              <span className="info-pill critical">
                🚨 {stats.status_1a} Critical
              </span>
            )}
            <span className="info-pill">
              <span style={{ width:7, height:7, borderRadius:'50%', background:'var(--green)', display:'inline-block' }}/>
              {stats.active_organs || 0} Active Organs
            </span>
          </div>
        )}

        <div className="topbar-actions">
          <button
            className="icon-btn"
            title="Register Donor"
            onClick={() => navigate('/register-donor')}
          >
            <svg viewBox="0 0 20 20" fill="currentColor">
              <path d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z"/>
            </svg>
          </button>

          <button
            className="icon-btn"
            title="Notifications"
            onClick={() => navigate('/notifications')}
          >
            <svg viewBox="0 0 20 20" fill="currentColor">
              <path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z"/>
            </svg>
            {unreadCount > 0 && <span className="notif-dot" />}
          </button>
        </div>
      </header>

      <div className="status-ticker">
        <div className="ticker-inner">
          {tickerDouble.map((t, i) => (
            <span key={i} className="ticker-item">
              <span className={`ticker-dot${t.color ? ` ${t.color}` : ''}`} />
              {t.label}
            </span>
          ))}
        </div>
      </div>
    </>
  )
}
