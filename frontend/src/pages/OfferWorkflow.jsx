import { useState, useEffect } from 'react'
import { useApi } from '../hooks/useApi'
import OrganPill from '../components/ui/OrganPill'
import { formatTime } from '../utils/formatters'

const STATUS_BADGE = { declined: 'badge-red', pending: 'badge-amber', standby: 'badge-gray', sent: 'badge-blue', accepted: 'badge-green', timeout: 'badge-gray', cancelled: 'badge-gray' }
const STATUS_LABEL = { declined: 'Declined', pending: 'Pending', standby: 'Standby', sent: 'Sent', accepted: 'Accepted', timeout: 'Timeout', cancelled: 'Cancelled' }

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
  const color = secs < 3600 ? 'var(--amber)' : 'var(--text2)'
  return <span style={{ fontFamily: 'var(--mono)', color }}>{formatTime(secs)}</span>
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

  async function load() {
    setLoading(true)
    setError('')
    try {
      const data = await request('GET', '/api/offers/pending')
      const list = data?.offers || []
      setOffers(list)
      // Most urgent pending offer becomes the active one
      const active = list.find(o => o.status === 'pending') || null
      setActiveOffer(active)
      // Load cascade history for the active offer's organ
      if (active?.organ_id) {
        const cascadeData = await request('GET', `/api/offers?organ_id=${active.organ_id}`)
        setCascade(cascadeData?.offers || [])
      }
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  async function handleAccept(offer) {
    try {
      await request('PATCH', `/api/offers/${offer.offer_id}/accept`, { notes: '' })
      await load()
    } catch (e) { alert('Failed to accept: ' + e.message) }
  }

  async function handleDecline(offer) {
    const reason = prompt('Decline reason (optional):') || ''
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

  return (
    <div className="grid-2">
      {/* Left — active cascade */}
      <div>
        <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>
          {activeOffer
            ? `Active Offer Cascade — ${activeOffer.organ?.organ_type?.toUpperCase()} ORG-${activeOffer.organ_id}`
            : 'Offer Cascade'}
        </div>

        {loading ? <Spinner /> : error ? (
          <div style={{ color: 'var(--red)', fontSize: 12 }}>{error}</div>
        ) : activeOffer ? (
          <>
            <div className="offer-timer mb-16">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>
                    Round {activeOffer.cascade_round} · R-{activeOffer.recipient_id} · {activeOffer.recipient?.full_name || '—'}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text2)' }}>
                    {activeOffer.receiving_hospital?.name} · {activeOffer.recipient?.medical_urgency?.toUpperCase()} · {activeOffer.recipient?.blood_group}
                  </div>
                </div>
                {activeOffer.organ?.organ_type && <OrganPill type={activeOffer.organ.organ_type} />}
              </div>
              <div className="timer-display" style={{ color: activeSecs < 1800 ? 'var(--red)' : 'var(--amber)' }}>
                {formatTime(activeSecs)}
              </div>
              <div className="timer-label">Time Remaining to Respond</div>
              <div className="flex gap-8 mt-12">
                <button className="btn btn-primary" style={{ flex: 1 }} onClick={() => handleAccept(activeOffer)}>✓ Accept Offer</button>
                <button className="btn btn-danger"  style={{ flex: 1 }} onClick={() => handleDecline(activeOffer)}>✕ Decline</button>
              </div>
            </div>

            {cascade.length > 0 && (
              <>
                <div style={{ fontSize: 12, color: 'var(--text2)', fontWeight: 500, marginBottom: 8, letterSpacing: '0.5px', textTransform: 'uppercase' }}>
                  Cascade History
                </div>
                <div className="offer-cascade">
                  {cascade.map(r => {
                    const dotColor = r.status === 'declined' || r.status === 'timeout' ? 'var(--red)' : r.status === 'pending' ? 'var(--amber)' : r.status === 'accepted' ? 'var(--accent)' : 'var(--surface3)'
                    const isActive = r.offer_id === activeOffer.offer_id
                    return (
                      <div key={r.offer_id} className="cascade-item">
                        <div className="cascade-dot" style={{ background: dotColor }} />
                        <div className="offer-card-inner"
                          style={isActive ? { borderColor: 'rgba(245,158,11,0.25)', background: 'rgba(245,158,11,0.04)' } : {}}
                        >
                          <div className="flex items-center justify-between mb-4">
                            <span style={{ fontWeight: 600, fontSize: 13 }}>
                              Round {r.cascade_round} · R-{r.recipient_id} · {r.recipient?.full_name || '—'}
                            </span>
                            <span className={`badge ${STATUS_BADGE[r.status] || 'badge-gray'}`}>{STATUS_LABEL[r.status] || r.status}</span>
                          </div>
                          <div className="flex gap-8 text-muted text-sm">
                            <span>{r.receiving_hospital?.name || '—'}</span>
                            <span>·</span>
                            <span>{r.offered_at ? new Date(r.offered_at).toLocaleTimeString() : '—'}</span>
                          </div>
                          {r.decline_reason && (
                            <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 6 }}>Reason: {r.decline_reason}</div>
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

      {/* Right — all pending offers */}
      <div>
        <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>All Pending Offers</div>
        <div className="card">
          {loading ? <Spinner /> : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr><th>Organ</th><th>Recipient</th><th>Time Left</th><th>Round</th><th>Status</th></tr>
                </thead>
                <tbody>
                  {offers.map(o => (
                    <tr key={o.offer_id} style={{ cursor: 'pointer' }} onClick={() => setActiveOffer(o)}>
                      <td>{o.organ?.organ_type ? <OrganPill type={o.organ.organ_type} /> : '—'}</td>
                      <td style={{ fontFamily: 'var(--mono)', color: 'var(--text2)' }}>R-{o.recipient_id}</td>
                      <td><LiveTimer deadlineISO={o.response_deadline} /></td>
                      <td>{o.cascade_round}</td>
                      <td><span className={`badge ${STATUS_BADGE[o.status] || 'badge-gray'} badge-dot`}>{STATUS_LABEL[o.status] || o.status}</span></td>
                    </tr>
                  ))}
                  {!offers.length && (
                    <tr><td colSpan={5} style={{ textAlign: 'center', color: 'var(--text3)', padding: 32 }}>No pending offers</td></tr>
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
