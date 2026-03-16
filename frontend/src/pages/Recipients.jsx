import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApi } from '../hooks/useApi'
import OrganPill from '../components/ui/OrganPill'
import { urgencyClass } from '../utils/formatters'
import { URGENCY_LABELS, ORGAN_TYPES, BLOOD_GROUPS } from '../utils/constants'

const STATUS_MAP = {
  waiting: { cls: 'badge-blue', label: 'Waiting' },
  offer_received: { cls: 'badge-amber', label: 'Offer Recv.' },
  transplanted: { cls: 'badge-green', label: 'Transplanted' },
  suspended: { cls: 'badge-gray', label: 'Suspended' },
  removed: { cls: 'badge-red', label: 'Removed' },
}

function praClass(pra) {
  if (pra >= 70) return 'badge-red'
  if (pra >= 30) return 'badge-amber'
  return 'badge-green'
}

function Spinner() {
  return <div style={{ padding: 40, textAlign: 'center', color: 'var(--text3)', fontSize: 13 }}>Loading…</div>
}

export default function Recipients() {
  const navigate = useNavigate()
  const { request } = useApi()

  const [recipients, setRecipients] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [organFilter, setOrgan] = useState('')
  const [urgencyFilter, setUrgency] = useState('')
  const [bgFilter, setBg] = useState('')
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(false)

  const load = useCallback(async (p = 1, reset = false) => {
    if (p === 1) setLoading(true)
    setError('')
    try {
      const params = new URLSearchParams({ page: p, limit: 20 })
      if (search) params.set('search', search)
      if (organFilter) params.set('organ_needed', organFilter)
      if (urgencyFilter) params.set('medical_urgency', urgencyFilter)
      if (bgFilter) params.set('blood_group', bgFilter)

      const data = await request('GET', `/api/recipients?${params}`)
      const list = data?.recipients || []
      setRecipients(prev => (p === 1 || reset) ? list : [...prev, ...list])
      setHasMore(data?.has_more || false)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [search, organFilter, urgencyFilter, bgFilter])

  useEffect(() => {
    setPage(1)
    load(1, true)
  }, [search, organFilter, urgencyFilter, bgFilter])

  async function handleUrgencyUpdate(recipientId, newUrgency) {
    try {
      await request('PATCH', `/api/recipients/${recipientId}/urgency`, { medical_urgency: newUrgency })
      load(1, true)
    } catch (e) {
      alert('Failed to update urgency: ' + e.message)
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-16">
        <div className="flex gap-8">
          <input
            className="form-control"
            placeholder="Search by name or ID…"
            style={{ width: 220 }}
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <select className="form-control" style={{ width: 'auto' }} value={organFilter} onChange={e => setOrgan(e.target.value)}>
            <option value="">All Organs</option>
            {ORGAN_TYPES.map(o => <option key={o} value={o}>{o}</option>)}
          </select>
          <select className="form-control" style={{ width: 'auto' }} value={urgencyFilter} onChange={e => setUrgency(e.target.value)}>
            <option value="">All Urgencies</option>
            <option value="status_1a">1A</option>
            <option value="status_1b">1B</option>
            <option value="status_2">2</option>
            <option value="status_3">3</option>
          </select>
          <select className="form-control" style={{ width: 'auto' }} value={bgFilter} onChange={e => setBg(e.target.value)}>
            <option value="">All Blood Groups</option>
            {BLOOD_GROUPS.map(b => <option key={b}>{b}</option>)}
          </select>
        </div>
        <button className="btn btn-primary" onClick={() => navigate('/register-recipient')}>
          + Register Recipient
        </button>
      </div>

      {error && (
        <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8, padding: '10px 14px', fontSize: 12, color: 'var(--red)', marginBottom: 14 }}>
          {error}
        </div>
      )}

      <div className="card">
        {loading && page === 1 ? <Spinner /> : (
          <>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Name</th>
                    <th>Age / Sex</th>
                    <th>Blood</th>
                    <th>Organ Needed</th>
                    <th>Urgency</th>
                    <th>PRA%</th>
                    <th>Hospital</th>
                    <th>Wait</th>
                    <th>Status</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {recipients.map(r => {
                    const s = STATUS_MAP[r.status] || { cls: 'badge-gray', label: r.status }
                    return (
                      <tr key={r.recipient_id}>
                        <td style={{ fontFamily: 'var(--mono)', color: 'var(--text2)' }}>R-{r.recipient_id}</td>
                        <td style={{ fontWeight: 500 }}>{r.full_name}</td>
                        <td>{r.age} / {r.sex}</td>
                        <td><strong>{r.blood_group}</strong></td>
                        <td><OrganPill type={r.organ_needed} /></td>
                        <td>
                          <span className={urgencyClass(r.medical_urgency)}>
                            {URGENCY_LABELS[r.medical_urgency] || '—'}
                          </span>
                        </td>
                        <td>
                          <span className={`badge ${praClass(r.pra_percent)}`}>{r.pra_percent}%</span>
                        </td>
                        <td>{r.hospital?.name || '—'}</td>
                        <td>{r.wait_months != null ? `${r.wait_months} mo` : '—'}</td>
                        <td><span className={`badge ${s.cls} badge-dot`}>{s.label}</span></td>
                        <td>
                          {r.status === 'waiting' && (
                            <select
                              className="form-control"
                              style={{ width: 'auto', fontSize: 11, padding: '3px 6px' }}
                              value={r.medical_urgency}
                              onChange={e => handleUrgencyUpdate(r.recipient_id, e.target.value)}
                            >
                              <option value="status_1a">1A</option>
                              <option value="status_1b">1B</option>
                              <option value="status_2">2</option>
                              <option value="status_3">3</option>
                            </select>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                  {!recipients.length && !loading && (
                    <tr>
                      <td colSpan={11} style={{ textAlign: 'center', color: 'var(--text3)', padding: 40 }}>
                        No recipients found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {hasMore && (
              <div style={{ padding: 16, textAlign: 'center' }}>
                <button
                  className="btn btn-ghost"
                  disabled={loading}
                  onClick={() => { setPage(p => p + 1); load(page + 1) }}
                >
                  {loading ? 'Loading…' : 'Load More'}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}