import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApi } from '../hooks/useApi'
import OrganPill from '../components/ui/OrganPill'
import { formatDate } from '../utils/formatters'
import { BLOOD_GROUPS } from '../utils/constants'

const STATUS_MAP = {
  active:           { cls: 'badge-green', label: 'Active' },
  organs_allocated: { cls: 'badge-blue',  label: 'Allocated' },
  expired:          { cls: 'badge-gray',  label: 'Expired' },
  withdrawn:        { cls: 'badge-red',   label: 'Withdrawn' },
}

function Spinner() {
  return <div style={{ padding: 40, textAlign: 'center', color: 'var(--text3)', fontSize: 13 }}>Loading…</div>
}

export default function Donors() {
  const navigate = useNavigate()
  const { request } = useApi()

  const [donors,     setDonors]  = useState([])
  const [loading,    setLoading] = useState(true)
  const [error,      setError]   = useState('')
  const [search,     setSearch]  = useState('')
  const [typeFilter, setType]    = useState('')
  const [bgFilter,   setBg]      = useState('')
  const [page,       setPage]    = useState(1)
  const [hasMore,    setHasMore] = useState(false)

  const load = useCallback(async (p = 1, reset = false) => {
    if (p === 1) setLoading(true)
    setError('')
    try {
      const params = new URLSearchParams({ page: p, limit: 20 })
      if (search)     params.set('search',      search)
      if (typeFilter) params.set('donor_type',  typeFilter)
      if (bgFilter)   params.set('blood_group', bgFilter)

      const data = await request('GET', `/api/donors?${params}`)
      const list = data?.donors || []
      setDonors(prev => (p === 1 || reset) ? list : [...prev, ...list])
      setHasMore(data?.has_more || false)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [search, typeFilter, bgFilter])

  useEffect(() => { setPage(1); load(1, true) }, [search, typeFilter, bgFilter])

  async function handleWithdraw(donorId) {
    if (!confirm('Mark this donor as withdrawn? This cannot be undone.')) return
    try {
      await request('DELETE', `/api/donors/${donorId}`)
      load(1, true)
    } catch (e) { alert('Failed: ' + e.message) }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-16">
        <div className="flex gap-8">
          <input className="form-control" placeholder="Search by name or ID…" style={{ width: 220 }} value={search} onChange={e => setSearch(e.target.value)} />
          <select className="form-control" style={{ width:'auto' }} value={typeFilter} onChange={e => setType(e.target.value)}>
            <option value="">All Types</option>
            <option value="deceased">Deceased</option>
            <option value="living">Living</option>
          </select>
          <select className="form-control" style={{ width:'auto' }} value={bgFilter} onChange={e => setBg(e.target.value)}>
            <option value="">All Blood Groups</option>
            {BLOOD_GROUPS.map(b => <option key={b}>{b}</option>)}
          </select>
        </div>
        <button className="btn btn-primary" onClick={() => navigate('/register-donor')}>+ Register Donor</button>
      </div>

      {error && (
        <div style={{ background:'rgba(239,68,68,0.1)', border:'1px solid rgba(239,68,68,0.2)', borderRadius:8, padding:'10px 14px', fontSize:12, color:'var(--red)', marginBottom:14 }}>
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
                    <th>Donor ID</th><th>Name</th><th>Type</th><th>Age / Sex</th>
                    <th>Blood</th><th>Hospital</th><th>Organs</th><th>Status</th><th>Registered</th><th></th>
                  </tr>
                </thead>
                <tbody>
                  {donors.map(d => {
                    const s = STATUS_MAP[d.status] || { cls:'badge-gray', label: d.status }
                    const organList = typeof d.organs === 'string' ? (JSON.parse(d.organs) || []) : (d.organs || [])
                    const hospital  = typeof d.hospital === 'string' ? JSON.parse(d.hospital) : (d.hospital || {})
                    return (
                      <tr key={d.donor_id}>
                        <td style={{ fontFamily:'var(--mono)', color:'var(--text2)' }}>D-{d.donor_id}</td>
                        <td style={{ fontWeight:500 }}>{d.full_name}</td>
                        <td><span className={`badge ${d.donor_type==='deceased'?'badge-red':'badge-blue'}`}>{d.donor_type==='deceased'?'Deceased':'Living'}</span></td>
                        <td>{d.age} / {d.sex}</td>
                        <td><strong>{d.blood_group}</strong></td>
                        <td>{hospital.name || d.hospital_name || '—'}</td>
                        <td>
                          <div className="flex gap-4" style={{ flexWrap:'wrap' }}>
                            {organList.filter(Boolean).map((o, idx) => <OrganPill key={o?.organ_id ?? idx} type={o?.organ_type} />)}
                            {!organList.length && <span className="text-muted" style={{ fontSize:11 }}>—</span>}
                          </div>
                        </td>
                        <td><span className={`badge ${s.cls} badge-dot`}>{s.label}</span></td>
                        <td className="text-muted">{formatDate(d.created_at)}</td>
                        <td>
                          {d.status === 'active' && (
                            <button className="btn btn-danger" style={{ fontSize:11, padding:'3px 8px' }} onClick={() => handleWithdraw(d.donor_id)}>Withdraw</button>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                  {!donors.length && !loading && (
                    <tr><td colSpan={10} style={{ textAlign:'center', color:'var(--text3)', padding:40 }}>No donors found</td></tr>
                  )}
                </tbody>
              </table>
            </div>
            {hasMore && (
              <div style={{ padding:16, textAlign:'center' }}>
                <button className="btn btn-ghost" disabled={loading} onClick={() => { const next = page+1; setPage(next); load(next) }}>
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