import { useState, useEffect, useCallback, useRef } from 'react'
import { useApi } from '../hooks/useApi'
import { useNotifications } from '../context/NotificationContext'
import { useWebSocket } from '../hooks/useWebSocket'
import { useNavigate } from 'react-router-dom'

// ─── Type config ─────────────────────────────────────────────────────────────
const TYPE_CONFIG = {
  new_match:            { icon:'🎯', bg:'var(--blue-bg)',   color:'var(--blue)',   label:'Match Found',         badgeClass:'badge-blue'   },
  offer_sent:           { icon:'📨', bg:'var(--amber-bg)',  color:'var(--amber)',  label:'Offer Sent',          badgeClass:'badge-amber'  },
  offer_received:       { icon:'📬', bg:'var(--teal-bg)',   color:'var(--teal)',   label:'Offer Received',      badgeClass:'badge-teal'   },
  offer_accepted:       { icon:'✅', bg:'var(--green-bg)',  color:'var(--green)',  label:'Offer Accepted',      badgeClass:'badge-green'  },
  offer_declined:       { icon:'❌', bg:'var(--red-bg)',    color:'var(--red)',    label:'Offer Declined',      badgeClass:'badge-red'    },
  offer_timeout:        { icon:'⏰', bg:'var(--red-bg)',    color:'var(--red)',    label:'Timed Out',           badgeClass:'badge-red'    },
  donor_registered:     { icon:'👤', bg:'var(--purple-bg)', color:'var(--purple)', label:'New Donor',           badgeClass:'badge-purple' },
  urgency_updated:      { icon:'🚨', bg:'var(--red-bg)',    color:'var(--red)',    label:'Critical Alert',      badgeClass:'badge-red'    },
  transplant_complete:  { icon:'🏥', bg:'var(--green-bg)',  color:'var(--green)',  label:'Transplant Complete', badgeClass:'badge-green'  },
  transplant_confirmed: { icon:'🏥', bg:'var(--green-bg)',  color:'var(--green)',  label:'Transplant Confirmed',badgeClass:'badge-green'  },
  match_computed:       { icon:'🔬', bg:'var(--blue-bg)',   color:'var(--blue)',   label:'Match Computed',      badgeClass:'badge-blue'   },
  default:              { icon:'🔔', bg:'var(--bg3)',        color:'var(--text2)', label:'Notification',        badgeClass:'badge-gray'   },
}

// Filter tabs — map to type keys
const FILTERS = [
  { label: 'All',                 key: 'all'               },
  { label: 'Critical Alert',      key: 'urgency_updated'   },
  { label: 'Match Found',         key: 'new_match'         },
  { label: 'New Donor',           key: 'donor_registered'  },
  { label: 'Offer',               key: 'offer_sent'        },
  { label: 'Transplant Complete', key: 'transplant_complete'},
]

function timeAgo(iso) {
  if (!iso) return ''
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins} min ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

// ─── Top critical banner (most recent unread urgency_updated / critical) ─────
function CriticalBanner({ notification, onDismiss }) {
  const navigate = useNavigate()
  if (!notification) return null
  return (
    <div style={{
      background: 'linear-gradient(135deg, rgba(220,38,38,0.08), rgba(220,38,38,0.04))',
      border: '1.5px solid rgba(220,38,38,0.25)',
      borderRadius: 14,
      padding: '18px 22px',
      marginBottom: 20,
      position: 'relative',
      animation: 'fadeSlideIn 0.3s ease both',
    }}>
      <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
        <div style={{
          width: 40, height: 40, borderRadius: 12, flexShrink: 0,
          background: 'rgba(220,38,38,0.12)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18,
          animation: 'pulse-ring 1.5s infinite',
        }}>
          ⚠️
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#dc2626', marginBottom: 5 }}>
            {notification.title}
          </div>
          <div style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.5, marginBottom: 12 }}>
            {notification.body}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {notification.related_organ_id && (
              <button
                onClick={() => navigate('/matching')}
                style={{
                  padding: '7px 16px', borderRadius: 8, border: 'none',
                  background: '#dc2626', color: '#fff',
                  fontSize: 12.5, fontWeight: 700, cursor: 'pointer',
                  transition: 'background 0.15s',
                }}
                onMouseEnter={e => e.currentTarget.style.background = '#b91c1c'}
                onMouseLeave={e => e.currentTarget.style.background = '#dc2626'}
              >
                Open Matching Engine
              </button>
            )}
            <span style={{ fontSize: 11.5, color: 'var(--text3)', fontWeight: 500 }}>
              {timeAgo(notification.created_at || notification.sent_at)}
            </span>
          </div>
        </div>
        <button
          onClick={onDismiss}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)', fontSize: 16, padding: '0 4px', lineHeight: 1 }}
        >✕</button>
      </div>
    </div>
  )
}

// ─── Single notification row ──────────────────────────────────────────────────
function NotifRow({ n, onMarkRead }) {
  const navigate  = useNavigate()
  const cfg       = TYPE_CONFIG[n.type] || TYPE_CONFIG.default
  const isUnread  = !n.is_read
  const isCritical = n.type === 'urgency_updated'
  const isMatch    = n.type === 'new_match'

  // derive organ/hospital from body heuristically
  const organ   = n.related_organ_id ? `Organ #${n.related_organ_id}` : null
  const offer   = n.related_offer_id ? `Offer #${n.related_offer_id}` : null

  return (
    <div
      style={{
        display: 'flex', gap: 14, padding: '16px 20px',
        borderBottom: '1px solid var(--border)',
        background: isUnread ? 'rgba(13,110,253,0.025)' : 'transparent',
        borderLeft: `3px solid ${isUnread ? (isCritical ? '#dc2626' : 'var(--accent)') : 'transparent'}`,
        transition: 'background 0.15s',
        cursor: isUnread ? 'pointer' : 'default',
        animation: 'fadeSlideIn 0.25s ease both',
      }}
      onClick={() => isUnread && onMarkRead(n.notification_id)}
      onMouseEnter={e => { if (isUnread) e.currentTarget.style.background = 'rgba(13,110,253,0.05)' }}
      onMouseLeave={e => { if (isUnread) e.currentTarget.style.background = 'rgba(13,110,253,0.025)' }}
    >
      {/* Icon */}
      <div style={{
        width: 42, height: 42, borderRadius: 12, flexShrink: 0,
        background: cfg.bg,
        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18,
      }}>
        {cfg.icon}
      </div>

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13.5, fontWeight: isUnread ? 700 : 600, color: 'var(--text)', marginBottom: 4 }}>
          {n.title}
        </div>
        <div style={{ fontSize: 12.5, color: 'var(--text2)', lineHeight: 1.5, marginBottom: 8 }}>
          {n.body}
        </div>

        {/* Tags row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
          <span className={`badge ${cfg.badgeClass}`} style={{ fontSize: 10.5 }}>{cfg.label}</span>
          {organ && <><span style={{ fontSize: 11, color: 'var(--text3)' }}>·</span><span style={{ fontSize: 11.5, color: 'var(--text2)', fontWeight: 500 }}>{organ}</span></>}
          {offer && <><span style={{ fontSize: 11, color: 'var(--text3)' }}>·</span><span style={{ fontSize: 11.5, color: 'var(--text2)', fontWeight: 500 }}>{offer}</span></>}
        </div>

        {/* Action buttons */}
        <div style={{ display: 'flex', gap: 8 }}>
          {isUnread && (
            <button
              onClick={e => { e.stopPropagation(); onMarkRead(n.notification_id) }}
              style={{
                padding: '4px 10px', borderRadius: 7, fontSize: 11.5, fontWeight: 600,
                border: '1px solid var(--border2)', background: 'transparent',
                color: 'var(--text2)', cursor: 'pointer',
              }}
            >
              View Details
            </button>
          )}
          {isMatch && n.related_organ_id && (
            <button
              onClick={e => { e.stopPropagation(); navigate('/matching') }}
              style={{
                padding: '4px 10px', borderRadius: 7, fontSize: 11.5, fontWeight: 700,
                border: '1.5px solid var(--accent)', background: 'transparent',
                color: 'var(--accent)', cursor: 'pointer',
              }}
            >
              Open Match
            </button>
          )}
          {isCritical && n.related_organ_id && (
            <button
              onClick={e => { e.stopPropagation(); navigate('/matching') }}
              style={{
                padding: '4px 10px', borderRadius: 7, fontSize: 11.5, fontWeight: 700,
                border: '1.5px solid #dc2626', background: 'transparent',
                color: '#dc2626', cursor: 'pointer',
              }}
            >
              Open Matching Engine
            </button>
          )}
        </div>
      </div>

      {/* Right: unread dot + time */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8, flexShrink: 0 }}>
        {isUnread && (
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--accent)' }} />
        )}
        <span style={{ fontSize: 11, color: 'var(--text3)', whiteSpace: 'nowrap', marginTop: isUnread ? 0 : 10 }}>
          {timeAgo(n.created_at || n.sent_at)}
        </span>
      </div>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function Notifications() {
  const { request }  = useApi()
  const { markAllRead: ctxMarkAllRead } = useNotifications()

  const [notifications, setNotifications] = useState([])
  const [loading,       setLoading]       = useState(true)
  const [refreshing,    setRefreshing]    = useState(false)
  const [error,         setError]         = useState('')
  const [page,          setPage]          = useState(1)
  const [hasMore,       setHasMore]       = useState(false)
  const [filter,        setFilter]        = useState('all')
  const [search,        setSearch]        = useState('')
  const [bannerDismissed, setBannerDismissed] = useState(false)

  // ── Fetch ─────────────────────────────────────────────────────────────────
  const load = useCallback(async (p = 1, isRefresh = false) => {
    if (p === 1) isRefresh ? setRefreshing(true) : setLoading(true)
    setError('')
    try {
      const data = await request('GET', `/api/notifications?page=${p}&limit=30`)
      const list = data?.notifications || []
      setNotifications(prev => p === 1 ? list : [...prev, ...list])
      setHasMore(data?.has_more || false)
      if (p === 1) setBannerDismissed(false)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [request])

  useEffect(() => { load(1) }, [load])

  // ── Live updates via WebSocket ────────────────────────────────────────────
  useWebSocket(useCallback((msg) => {
    // Backend broadcasts as { event, data, ts } — not msg.type
    const event = msg.event || msg.type
    const LIVE_EVENTS = ['offer_sent','offer_accepted','offer_declined','offer_received',
                         'match_computed','transplant_confirmed','notification','offer_update']
    if (LIVE_EVENTS.includes(event)) {
      const typeMap = {
        offer_sent: 'offer_sent', offer_accepted: 'offer_accepted',
        offer_declined: 'offer_declined', offer_received: 'offer_received',
        match_computed: 'new_match', transplant_confirmed: 'transplant_confirmed',
      }
      const newNotif = {
        notification_id: msg.data?.notification_id || `ws_${Date.now()}`,
        type: msg.data?.type || typeMap[event] || 'default',
        title: msg.data?.title || `${event.replace(/_/g,' ')} event`,
        body:  msg.data?.body  || JSON.stringify(msg.data || {}),
        related_organ_id: msg.data?.organ_id || null,
        related_offer_id: msg.data?.offer_id || null,
        is_read: false,
        created_at: msg.ts ? new Date(msg.ts).toISOString() : new Date().toISOString(),
      }
      setNotifications(prev => [newNotif, ...prev])
      if (newNotif.type === 'urgency_updated') setBannerDismissed(false)
    }
  }, []))

  // ── Mark read ─────────────────────────────────────────────────────────────
  async function handleMarkRead(id) {
    try {
      await request('PATCH', `/api/notifications/${id}/read`)
      setNotifications(prev => prev.map(n => n.notification_id === id ? { ...n, is_read: true } : n))
    } catch (e) { console.error(e) }
  }

  async function handleMarkAllRead() {
    try {
      await request('PATCH', '/api/notifications/read-all')
      ctxMarkAllRead()
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
    } catch (e) { console.error(e) }
  }

  // ── Derived values ────────────────────────────────────────────────────────
  const unread = notifications.filter(n => !n.is_read).length

  const criticalBanner = !bannerDismissed
    ? notifications.find(n => !n.is_read && (n.type === 'urgency_updated'))
    : null

  const filtered = notifications.filter(n => {
    const matchesFilter = filter === 'all' || n.type === filter
    const matchesSearch = !search ||
      n.title?.toLowerCase().includes(search.toLowerCase()) ||
      n.body?.toLowerCase().includes(search.toLowerCase())
    return matchesFilter && matchesSearch
  })

  return (
    <div style={{ animation: 'pageIn 0.35s var(--ease) both' }}>
      <style>{`
        @keyframes fadeSlideIn { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>

      {/* ── Header ── */}
      <div className="page-header mb-24">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <h1 className="page-title">Notifications <span>Center</span></h1>
            {unread > 0 && (
              <span style={{
                fontSize: 11, fontWeight: 800, background: '#dc2626', color: '#fff',
                borderRadius: 20, padding: '2px 8px', lineHeight: 1.4,
              }}>
                {unread}
              </span>
            )}
          </div>
          <p className="page-subtitle">Real-time alerts from the national transplant network</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {unread > 0 && (
            <button className="btn btn-ghost btn-sm" onClick={handleMarkAllRead}>
              Mark all as read
            </button>
          )}
          <button
            className="btn btn-outline btn-sm"
            onClick={() => load(1, true)}
            disabled={refreshing || loading}
            style={{ display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
              style={{ animation: refreshing ? 'spin 0.7s linear infinite' : 'none' }}>
              <polyline points="1 4 1 10 7 10"/>
              <path d="M3.51 15a9 9 0 1 0 .49-3.51"/>
            </svg>
            Refresh
          </button>
        </div>
      </div>

      {/* ── Critical banner ── */}
      {criticalBanner && (
        <CriticalBanner
          notification={criticalBanner}
          onDismiss={() => setBannerDismissed(true)}
        />
      )}

      {/* ── Search + filter bar ── */}
      <div className="card" style={{ marginBottom: 16, padding: '14px 18px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
          {/* Search */}
          <div style={{ position: 'relative', flex: '0 0 300px' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text3)" strokeWidth="2.5"
              style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
            </svg>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search notifications..."
              style={{
                width: '100%', padding: '9px 12px 9px 34px',
                border: '1.5px solid var(--border2)', borderRadius: 10,
                fontSize: 13, background: 'var(--bg)', color: 'var(--text)',
                fontFamily: 'var(--font)', outline: 'none',
              }}
              onFocus={e => e.target.style.borderColor = 'var(--accent)'}
              onBlur={e => e.target.style.borderColor = 'var(--border2)'}
            />
            {search && (
              <span onClick={() => setSearch('')} style={{
                position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                cursor: 'pointer', fontSize: 12, color: 'var(--text3)',
              }}>✕</span>
            )}
          </div>

          {/* Filter tabs */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap' }}>
            {FILTERS.map(f => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                style={{
                  padding: '6px 13px', borderRadius: 20, fontSize: 12.5, fontWeight: 600,
                  border: 'none', cursor: 'pointer', transition: 'all 0.15s',
                  background: filter === f.key ? 'var(--accent)' : 'transparent',
                  color: filter === f.key ? '#fff' : 'var(--text2)',
                }}
                onMouseEnter={e => { if (filter !== f.key) e.currentTarget.style.background = 'var(--bg3)' }}
                onMouseLeave={e => { if (filter !== f.key) e.currentTarget.style.background = 'transparent' }}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Error ── */}
      {error && (
        <div style={{
          background: 'var(--red-bg)', border: '1px solid #fca5a5',
          borderRadius: 12, padding: '12px 16px',
          color: 'var(--red)', fontSize: 13, marginBottom: 16,
        }}>
          {error}
        </div>
      )}

      {/* ── Notification list ── */}
      <div className="card">
        {loading ? (
          <div style={{ padding: '60px 0', textAlign: 'center' }}>
            <div className="spinner" style={{ margin: '0 auto 12px' }} />
            <div style={{ fontSize: 13, color: 'var(--text3)' }}>Loading notifications...</div>
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: '72px 0', textAlign: 'center' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🔔</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', marginBottom: 6 }}>
              {search || filter !== 'all' ? 'No matching notifications' : 'All caught up'}
            </div>
            <div style={{ fontSize: 13, color: 'var(--text3)' }}>
              {search || filter !== 'all' ? 'Try a different filter or search term' : 'New alerts will appear here in real time'}
            </div>
          </div>
        ) : (
          <>
            {filtered.map((n, i) => (
              <NotifRow
                key={n.notification_id || i}
                n={n}
                onMarkRead={handleMarkRead}
              />
            ))}

            {hasMore && filter === 'all' && !search && (
              <div style={{ textAlign: 'center', padding: '16px' }}>
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => { const np = page + 1; setPage(np); load(np) }}
                >
                  Load more
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* ── Footer count ── */}
      {!loading && filtered.length > 0 && (
        <div style={{ textAlign: 'center', fontSize: 11.5, color: 'var(--text3)', marginTop: 12, fontWeight: 500 }}>
          Showing {filtered.length} notification{filtered.length !== 1 ? 's' : ''}
          {unread > 0 && ` · ${unread} unread`}
        </div>
      )}
    </div>
  )
}