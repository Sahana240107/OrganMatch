import { useState, useEffect } from 'react'
import { useApi } from '../hooks/useApi'
import OrganPill from '../components/ui/OrganPill'
import ScoreBar from '../components/ui/ScoreBar'
import KPICard from '../components/ui/KPICard'
import { urgencyClass } from '../utils/formatters'
import { ORGAN_TYPES } from '../utils/constants'

const BG_ROW = { status_1a: 'rgba(239,68,68,0.04)', status_1b: 'rgba(245,158,11,0.03)' }

function Spinner() {
  return <div style={{ padding: 32, textAlign: 'center', color: 'var(--text3)', fontSize: 13 }}>Loading…</div>
}

export default function WaitingList() {
  const { request } = useApi()

  const [recipients,   setRecipients]   = useState([])
  const [counts,       setCounts]       = useState({})
  const [organFilter,  setOrgan]        = useState('')
  const [bgFilter,     setBg]           = useState('')
  const [loading,      setLoading]      = useState(true)
  const [error,        setError]        = useState('')

  useEffect(() => {
    async function load() {
      setLoading(true)
      setError('')
      try {
        const [listData, countData] = await Promise.all([
          request('GET', '/api/recipients/waiting-list'),
          request('GET', '/api/analytics/waiting-list-counts'),
        ])
        setRecipients(listData?.recipients || [])
        setCounts(countData?.counts || {})
      } catch (e) {
        setError(e.message)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const filtered = recipients.filter(r => {
    if (organFilter && r.organ_needed !== organFilter) return false
    if (bgFilter    && r.blood_group  !== bgFilter)    return false
    return true
  })

  return (
    <div>
      <div className="grid-4 mb-16">
        <KPICard label="Kidney" value={counts.kidney  ?? '—'} sub={counts.kidney_avg_wait  ? `Avg wait: ${counts.kidney_avg_wait} mo`  : ''} color="blue" />
        <KPICard label="Heart"  value={counts.heart   ?? '—'} sub={counts.heart_avg_wait   ? `Avg wait: ${counts.heart_avg_wait} mo`   : ''} color="red" />
        <KPICard label="Liver"  value={counts.liver   ?? '—'} sub={counts.liver_avg_wait   ? `Avg wait: ${counts.liver_avg_wait} mo`   : ''} color="amber" />
        <KPICard label="Lung"   value={counts.lung    ?? '—'} sub={counts.lung_avg_wait    ? `Avg wait: ${counts.lung_avg_wait} mo`    : ''} color="green" />
      </div>

      <div className="card">
        <div className="card-header">
          <span className="card-title">Waiting List — Priority Order</span>
          <div className="flex gap-8">
            <select className="form-control" style={{ width: 'auto', fontSize: 12, padding: '5px 10px' }} value={organFilter} onChange={e => setOrgan(e.target.value)}>
              <option value="">All Organs</option>
              {ORGAN_TYPES.map(o => <option key={o} value={o}>{o}</option>)}
            </select>
            <select className="form-control" style={{ width: 'auto', fontSize: 12, padding: '5px 10px' }} value={bgFilter} onChange={e => setBg(e.target.value)}>
              <option value="">All Blood Groups</option>
              {['A+','A-','B+','B-','AB+','AB-','O+','O-'].map(b => <option key={b}>{b}</option>)}
            </select>
          </div>
        </div>

        {error && <div style={{ color: 'var(--red)', fontSize: 12, padding: '12px 18px' }}>{error}</div>}

        {loading ? <Spinner /> : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>#</th><th>Recipient</th><th>Organ</th><th>Urgency Score</th><th>Blood</th><th>PRA%</th><th>Hospital</th><th>Wait Time</th><th>Status</th></tr>
              </thead>
              <tbody>
                {filtered.map((r, idx) => {
                  const urgScore = r.urgency_score ?? 0
                  const rank     = idx + 1
                  const rankColor = r.medical_urgency === 'status_1a' ? 'var(--red)' : r.medical_urgency === 'status_1b' ? 'var(--amber)' : 'var(--text2)'
                  return (
                    <tr key={r.recipient_id} style={{ background: BG_ROW[r.medical_urgency] || 'transparent' }}>
                      <td style={{ fontFamily: 'var(--mono)', fontWeight: 700, color: rankColor }}>{rank}</td>
                      <td><strong>R-{r.recipient_id}</strong> {r.full_name}</td>
                      <td><OrganPill type={r.organ_needed} /></td>
                      <td style={{ minWidth: 140 }}><ScoreBar score={urgScore} /></td>
                      <td>{r.blood_group}</td>
                      <td>
                        <span className={`badge ${r.pra_percent >= 70 ? 'badge-red' : r.pra_percent >= 30 ? 'badge-amber' : 'badge-green'}`}>
                          {r.pra_percent}%
                        </span>
                      </td>
                      <td>{r.hospital?.name || '—'}</td>
                      <td>{r.wait_months != null ? `${r.wait_months} mo` : '—'}</td>
                      <td><span className={urgencyClass(r.medical_urgency)}>STATUS {r.medical_urgency?.replace('status_','').toUpperCase()}</span></td>
                    </tr>
                  )
                })}
                {!filtered.length && (
                  <tr><td colSpan={9} style={{ textAlign: 'center', color: 'var(--text3)', padding: 32 }}>No recipients found</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
