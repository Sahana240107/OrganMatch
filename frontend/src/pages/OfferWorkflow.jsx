import { useState, useEffect } from 'react'
import { useApi } from '../hooks/useApi'
import OrganPill from '../components/ui/OrganPill'
import { formatTime } from '../utils/formatters'

const STATUS_BADGE = {
  declined:  'badge-red',
  pending:   'badge-amber',
  timeout:   'badge-red',
  accepted:  'badge-green',
  cancelled: 'badge-gray',
}
const STATUS_LABEL = {
  declined:  'Declined',
  pending:   'Pending',
  timeout:   'Timed Out',
  accepted:  'Accepted',
  cancelled: 'Cancelled',
}

function parseJson(val) {
  if (!val || typeof val === 'object') return val || {}
  try { return JSON.parse(val) } catch { return {} }
}

function normalize(o) {
  return {
    ...o,
    organ:              parseJson(o.organ),
    recipient:          parseJson(o.recipient),
    receiving_hospital: parseJson(o.receiving_hospital),
  }
}

function LiveTimer({ deadlineISO }) {
  const [secs, setSecs] = useState(0)
  useEffect(() => {
    if (!deadlineISO) return
    function calc() { setSecs(Math.max(0, Math.floor((new Date(deadlineISO) - Date.now()) / 1000))) }
    calc()
    const id = setInterval(calc, 1000)
    return () => clearInterval(id)
  }, [deadlineISO])
  if (!deadlineISO) return <span style={{ fontFamily: 'var(--mono)' }}>——</span>
  if (secs === 0) return <span style={{ fontFamily: 'var(--mono)', color: 'var(--red)' }}>EXPIRED</span>
  return <span style={{ fontFamily: 'var(--mono)', color: secs < 3600 ? 'var(--amber)' : 'var(--text2)' }}>{formatTime(secs)}</span>
}

function Spinner() {
  return <div style={{ padding: 32, textAlign: 'center', color: 'var(--text3)', fontSize: 13 }}>Loading…</div>
}

export default function OfferWorkflow() {
  const { request } = useApi()

  const [offers,      setOffers]      = useState([])
  const [activeOffer, setActiveOffer] = useState(null)
  const [cascade,     setCascade]     = useState([])
  const [loading,     setLoading]     = useState(true)
  const [error,       setError]       = useState('')
  const [filter,      setFilter]      = useState('all')

  async function load() {
    setLoading(true)
    setError('')
    try {
      // /api/offers/recent returns ALL offers (any status) so seed data is visible
      const data = await request('GET', '/api/offers/recent')
      const list = (data?.offers || []).map(normalize)
      setOffers(list)

      // Auto-select the most urgent pending offer
      const active = list.find(o => o.status === 'pending') || null
      setActiveOffer(active)
      if (active?.organ_id) loadCascade(active.organ_id)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  async function loadCascade(organId) {
    try {
      const data = await request('GET', `/api/offers?organ_id=${organId}`)
      setCascade((data?.offers || []).map(normalize))
    } catch (e) {
      console.error('cascade load:', e.message)
    }
  }

  useEffect(() => { load() }, [])

  async function handleSelectOffer(offer) {
    setActiveOffer(offer)
    if (offer?.organ_id) loadCascade(offer.organ_id)
  }

  async function handleAccept(offer) {
    if (!confirm(`Accept offer for ${offer.organ?.organ_type?.toUpperCase()} → ${offer.recipient?.full_name}?`)) return
    try {
      await request('PATCH', `/api/offers/${offer.offer_id}/accept`, { notes: '' })
      await load()
    } catch (e) { alert('Failed to accept: ' + e.message) }
  }

  async function handleDecline(offer) {
    const reason = prompt('Decline reason (required):')
    if (!reason?.trim()) return
    try {
      await request('PATCH', `/api/offers/${offer.offer_id}/decline`, { decline_reason: reason })
      await load()
    } catch (e) { alert('Failed to decline: ' + e.message) }
  }

  const [activeSecs, setActiveSecs] = useState(0)
  useEffect(() => {
    if (!activeOffer?.response_deadline) return
    function calc() { setActiveSecs(Math.max(0, Math.floor((new Date(activeOffer.response_deadline) - Date.now()) / 1000))) }
    calc()
    const id = setInterval(calc, 1000)
    return () => clearInterval(id)
  }, [activeOffer])

  const displayed = filter === 'pending' ? offers.filter(o => o.status === 'pending') : offers

  return (
    <div className="grid-2">

      {/* ── Left: active offer + cascade history ──────────────────────────── */}
      <div>
        <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>
          {activeOffer
            ? `Active Offer — ${activeOffer.organ?.organ_type?.toUpperCase()} ORG-${activeOffer.organ_id}`
            : 'Offer Cascade'}
        </div>

        {loading ? <Spinner /> : error ? (
          <div style={{ color: 'var(--red)', fontSize: 12, padding: 12, background: 'rgba(239,68,68,0.08)', borderRadius: 8 }}>
            {error}
          </div>
        ) : activeOffer ? (
          <>
            <div className="offer-timer mb-16">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>
                    Round {activeOffer.cascade_round ?? 1} · R-{activeOffer.recipient_id} · {activeOffer.recipient?.full_name || '—'}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text2)' }}>
                    {activeOffer.receiving_hospital?.name || '—'}
                    {activeOffer.recipient?.medical_urgency
                      ? ` · ${activeOffer.recipient.medical_urgency.replace('status_','').toUpperCase()}` : ''}
                    {activeOffer.recipient?.blood_group ? ` · ${activeOffer.recipient.blood_group}` : ''}
                  </div>
                </div>
                {activeOffer.organ?.organ_type && <OrganPill type={activeOffer.organ.organ_type} />}
              </div>

              <div className="timer-display"
                style={{ color: activeSecs === 0 ? 'var(--red)' : activeSecs < 1800 ? 'var(--amber)' : 'var(--amber)' }}>
                {activeSecs === 0 ? 'EXPIRED' : formatTime(activeSecs)}
              </div>
              <div className="timer-label">
                {activeOffer.status === 'pending' && activeSecs > 0
                  ? 'Time Remaining to Respond'
                  : `Status: ${STATUS_LABEL[activeOffer.status] || activeOffer.status}`}
              </div>

              {activeOffer.status === 'pending' && activeSecs > 0 && (
                <div className="flex gap-8 mt-12">
                  <button className="btn btn-primary" style={{ flex: 1 }} onClick={() => handleAccept(activeOffer)}>
                    ✓ Accept Offer
                  </button>
                  <button className="btn btn-danger" style={{ flex: 1 }} onClick={() => handleDecline(activeOffer)}>
                    ✕ Decline
                  </button>
                </div>
              )}
            </div>

            {cascade.length > 0 && (
              <>
                <div style={{ fontSize: 12, color: 'var(--text2)', fontWeight: 500, marginBottom: 8, letterSpacing: '0.5px', textTransform: 'uppercase' }}>
                  Cascade History
                </div>
                <div className="offer-cascade">
                  {cascade.map(r => {
                    const dotColor = r.status === 'declined' || r.status === 'timeout'
                      ? 'var(--red)'
                      : r.status === 'pending' ? 'var(--amber)'
                      : r.status === 'accepted' ? 'var(--accent)'
                      : 'var(--surface3)'
                    const isActive = r.offer_id === activeOffer.offer_id
                    return (
                      <div key={r.offer_id} className="cascade-item">
                        <div className="cascade-dot" style={{ background: dotColor }} />
                        <div className="offer-card-inner"
                          style={isActive ? { borderColor: 'rgba(245,158,11,0.25)', background: 'rgba(245,158,11,0.04)' } : {}}>
                          <div className="flex items-center justify-between mb-4">
                            <span style={{ fontWeight: 600, fontSize: 13 }}>
                              Round {r.cascade_round ?? 1} · R-{r.recipient_id} · {r.recipient?.full_name || '—'}
                            </span>
                            <span className={`badge ${STATUS_BADGE[r.status] || 'badge-gray'}`}>
                              {STATUS_LABEL[r.status] || r.status}
                            </span>
                          </div>
                          <div className="flex gap-8 text-muted" style={{ fontSize: 12 }}>
                            <span>{r.receiving_hospital?.name || '—'}</span>
                            <span>·</span>
                            <span>{r.offered_at ? new Date(r.offered_at).toLocaleTimeString() : '—'}</span>
                          </div>
                          {r.decline_reason && (
                            <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 6 }}>
                              Reason: {r.decline_reason}
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </>
            )}
          </>
        ) : (
          <div style={{ textAlign: 'center', color: 'var(--text3)', fontSize: 13, padding: 40 }}>
            No active offers requiring response
          </div>
        )}
      </div>

      {/* ── Right: offers table ───────────────────────────────────────────── */}
      <div>
        <div className="flex items-center justify-between mb-12">
          <div style={{ fontSize: 14, fontWeight: 600 }}>
            All Offers
            {offers.length > 0 && (
              <span style={{ marginLeft: 8, fontSize: 11, background: 'rgba(100,116,139,0.2)', color: 'var(--text2)', padding: '2px 8px', borderRadius: 10 }}>
                {offers.length}
              </span>
            )}
          </div>
          <div className="flex gap-6">
            {['all', 'pending'].map(f => (
              <button key={f}
                className={`btn ${filter === f ? 'btn-primary' : 'btn-ghost'}`}
                style={{ fontSize: 11, padding: '4px 10px' }}
                onClick={() => setFilter(f)}>
                {f === 'all' ? 'All' : 'Pending Only'}
              </button>
            ))}
          </div>
        </div>

        <div className="card">
          {loading ? <Spinner /> : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Organ</th><th>Recipient</th><th>Hospital</th>
                    <th>Deadline</th><th>Round</th><th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {displayed.map(o => (
                    <tr key={o.offer_id}
                      style={{
                        cursor: 'pointer',
                        background: activeOffer?.offer_id === o.offer_id ? 'rgba(245,158,11,0.05)' : '',
                        opacity: o.status !== 'pending' ? 0.65 : 1,
                      }}
                      onClick={() => handleSelectOffer(o)}>
                      <td>{o.organ?.organ_type ? <OrganPill type={o.organ.organ_type} /> : '—'}</td>
                      <td>
                        <div style={{ fontFamily: 'var(--mono)', color: 'var(--text2)', fontSize: 11 }}>R-{o.recipient_id}</div>
                        <div style={{ fontSize: 11 }}>{o.recipient?.full_name || '—'}</div>
                      </td>
                      <td style={{ fontSize: 11, color: 'var(--text2)' }}>{o.receiving_hospital?.name || '—'}</td>
                      <td>
                        {o.status === 'pending'
                          ? <LiveTimer deadlineISO={o.response_deadline} />
                          : <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--text3)' }}>
                              {o.response_deadline ? new Date(o.response_deadline).toLocaleDateString() : '—'}
                            </span>}
                      </td>
                      <td style={{ fontFamily: 'var(--mono)', fontSize: 12 }}>{o.cascade_round ?? 1}</td>
                      <td>
                        <span className={`badge ${STATUS_BADGE[o.status] || 'badge-gray'} badge-dot`}>
                          {STATUS_LABEL[o.status] || o.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {!displayed.length && (
                    <tr>
                      <td colSpan={6} style={{ textAlign: 'center', color: 'var(--text3)', padding: 32 }}>
                        No offers found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}