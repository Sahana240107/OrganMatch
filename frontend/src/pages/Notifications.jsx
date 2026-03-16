import { useState, useEffect } from 'react'
import { useApi } from '../hooks/useApi'
import { useNotifications } from '../context/NotificationContext'

const TYPE_STYLE = {
  match_computed: { bg: 'rgba(59,130,246,0.15)',  color: 'var(--blue)' },
  offer_sent:     { bg: 'rgba(245,158,11,0.15)',  color: 'var(--amber)' },
  offer_accepted: { bg: 'rgba(34,197,94,0.15)',   color: 'var(--accent)' },
  offer_declined: { bg: 'rgba(239,68,68,0.12)',   color: 'var(--red)' },
  offer_timeout:  { bg: 'rgba(239,68,68,0.08)',   color: 'var(--red)' },
  donor_registered:   { bg: 'rgba(167,139,250,0.12)', color: 'var(--purple)' },
  urgency_updated:    { bg: 'rgba(245,158,11,0.12)',  color: 'var(--amber)' },
  transplant_complete:{ bg: 'rgba(34,197,94,0.12)',   color: 'var(--accent)' },
  default:        { bg: 'rgba(255,255,255,0.06)',  color: 'var(--text2)' },
}

function timeAgo(iso) {
  if (!iso) return ''
  const diff = Date.now() - new Date(iso).getTime()
  const mins  = Math.floor(diff / 60000)
  if (mins < 1)  return 'just now'
  if (mins < 60) return `${mins} min ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24)  return `${hrs} hr ago`
  return `${Math.floor(hrs / 24)} days ago`
}

function Spinner() {
  return <div style={{ padding: 32, textAlign: 'center', color: 'var(--text3)', fontSize: 13 }}>Loading…</div>
}

export default function Notifications() {
  const { request }    = useApi()
  const { markAllRead } = useNotifications()

  const [notifications, setNotifications] = useState([])
  const [loading,       setLoading]       = useState(true)
  const [error,         setError]         = useState('')
  const [page,          setPage]          = useState(1)
  const [hasMore,       setHasMore]       = useState(false)

  async function load(p = 1) {
    if (p === 1) setLoading(true)
    setError('')
    try {
      const data = await request('GET', `/api/notifications?page=${p}&limit=20`)
      const list = data?.notifications || []
      setNotifications(prev => p === 1 ? list : [...prev, ...list])
      setHasMore(data?.has_more || false)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load(1) }, [])

  async function handleMarkAllRead() {
    try {
      await request('PATCH', '/api/notifications/read-all')
      markAllRead()
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
    } catch (e) {
      console.error(e)
    }
  }

  async function handleMarkRead(notifId) {
    try {
      await request('PATCH', `/api/notifications/${notifId}/read`)
      setNotifications(prev => prev.map(n => n.notification_id === notifId ? { ...n, is_read: true } : n))
    } catch (e) {
      console.error(e)
    }
  }

  const unreadCount = notifications.filter(n => !n.is_read).length

  return (
    <div>
      <div className="flex items-center justify-between mb-16">
        <div style={{ fontSize: 13, color: 'var(--text2)' }}>
          {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up'}
        </div>
        <button className="btn btn-ghost" style={{ fontSize: 12 }} onClick={handleMarkAllRead}>
          Mark All Read
        </button>
      </div>

      <div className="card">
        {error && <div style={{ color: 'var(--red)', fontSize: 12, padding: '12px 18px' }}>{error}</div>}

        {loading ? <Spinner /> : (
          <>
            {notifications.map((n, i) => {
              const style = TYPE_STYLE[n.notification_type] || TYPE_STYLE.default
              return (
                <div
                  key={n.notification_id}
                  className={`notif-item${!n.is_read ? ' unread' : ''}`}
                  style={{ borderBottom: i < notifications.length - 1 ? '1px solid var(--border)' : 'none' }}
                  onClick={() => !n.is_read && handleMarkRead(n.notification_id)}
                >
                  <div className="notif-icon" style={{ background: style.bg }}>
                    <svg style={{ width: 16, height: 16, fill: style.color }} viewBox="0 0 20 20">
                      <path d="M10 2a8 8 0 100 16A8 8 0 0010 2zm1 11H9v-2h2v2zm0-4H9V6h2v3z"/>
                    </svg>
                  </div>
                  <div style={{ flex: 1 }}>
                    <div className="notif-title">{n.title}</div>
                    {n.body && <div className="notif-body">{n.body}</div>}
                    <div className="notif-time">{timeAgo(n.created_at)}</div>
                  </div>
                  {!n.is_read && (
                    <div style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--accent)', flexShrink: 0, marginTop: 6 }} />
                  )}
                </div>
              )
            })}

            {!notifications.length && (
              <div style={{ padding: 48, textAlign: 'center', color: 'var(--text3)', fontSize: 13 }}>
                No notifications yet
              </div>
            )}

            {hasMore && (
              <div style={{ padding: 16, textAlign: 'center' }}>
                <button className="btn btn-ghost" onClick={() => { setPage(p => p + 1); load(page + 1) }}>
                  Load More
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
