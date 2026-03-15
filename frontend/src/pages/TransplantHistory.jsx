import { useState, useEffect } from 'react'
import { useApi } from '../hooks/useApi'
import OrganPill from '../components/ui/OrganPill'
import KPICard from '../components/ui/KPICard'
import { formatDate } from '../utils/formatters'

const OUTCOME_MAP = {
  successful:    { cls: 'badge-green',  label: 'Successful' },
  monitoring:    { cls: 'badge-amber',  label: 'Monitoring' },
  graft_failure: { cls: 'badge-red',    label: 'Graft Failure' },
  rejected:      { cls: 'badge-red',    label: 'Rejected' },
}

function Spinner() {
  return <div style={{ padding: 32, textAlign: 'center', color: 'var(--text3)', fontSize: 13 }}>Loading…</div>
}

export default function TransplantHistory() {
  const { request } = useApi()

  const [records, setRecords]   = useState([])
  const [summary, setSummary]   = useState(null)
  const [loading, setLoading]   = useState(true)
  const [error,   setError]     = useState('')
  const [page,    setPage]      = useState(1)
  const [hasMore, setHasMore]   = useState(false)

  useEffect(() => {
    async function load() {
      setLoading(true)
      setError('')
      try {
        const [recordData, summaryData] = await Promise.all([
          request('GET', `/api/transplants?page=${page}&limit=20`),
          request('GET', '/api/analytics/transplant-summary'),
        ])
        setRecords(prev => page === 1 ? (recordData?.transplants || []) : [...prev, ...(recordData?.transplants || [])])
        setHasMore(recordData?.has_more || false)
        setSummary(summaryData)
      } catch (e) {
        setError(e.message)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [page])

  return (
    <div>
      <div className="grid-4 mb-20">
        <KPICard label="Total Transplants" value={summary?.total      ?? '—'} color="green" />
        <KPICard label="1-Year Survival"   value={summary?.survival_rate ? `${summary.survival_rate}%` : '—'} color="blue" />
        <KPICard label="Avg Ischemic Time" value={summary?.avg_ischemic_hours ? `${summary.avg_ischemic_hours}h` : '—'} color="amber" />
        <KPICard label="Graft Failures"    value={summary?.graft_failures ?? '—'} color="red" />
      </div>

      <div className="card">
        <div className="card-header">
          <span className="card-title">Transplant Records</span>
          <button className="btn btn-ghost" style={{ fontSize: 12, padding: '4px 10px' }}>Export CSV</button>
        </div>

        {error && <div style={{ color: 'var(--red)', fontSize: 12, padding: '12px 18px' }}>{error}</div>}

        {loading && page === 1 ? <Spinner /> : (
          <>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Transplant ID</th><th>Organ</th><th>Donor</th><th>Recipient</th>
                    <th>Hospital</th><th>Date</th><th>Ischemic Time</th><th>Match Score</th><th>Outcome</th>
                  </tr>
                </thead>
                <tbody>
                  {records.map(t => {
                    const o = OUTCOME_MAP[t.outcome] || { cls: 'badge-gray', label: t.outcome || '—' }
                    const scoreColor = t.match_score >= 80 ? 'var(--accent)' : t.match_score >= 65 ? 'var(--blue)' : 'var(--amber)'
                    const ischemicHrs = t.ischemic_time_minutes ? `${Math.floor(t.ischemic_time_minutes / 60)}h ${t.ischemic_time_minutes % 60}m` : 'N/A'
                    return (
                      <tr key={t.transplant_id}>
                        <td style={{ fontFamily: 'var(--mono)', color: 'var(--text2)' }}>TX-{t.transplant_id}</td>
                        <td>{t.organ?.organ_type ? <OrganPill type={t.organ.organ_type} /> : '—'}</td>
                        <td style={{ fontFamily: 'var(--mono)', color: 'var(--text2)' }}>D-{t.donor_id}</td>
                        <td style={{ fontFamily: 'var(--mono)', color: 'var(--text2)' }}>R-{t.recipient_id}</td>
                        <td>{t.hospital?.name || '—'}</td>
                        <td>{formatDate(t.transplant_date)}</td>
                        <td style={{ fontFamily: 'var(--mono)' }}>{ischemicHrs}</td>
                        <td>
                          {t.match_score != null
                            ? <span style={{ fontFamily: 'var(--mono)', fontWeight: 600, color: scoreColor }}>{t.match_score}</span>
                            : '—'}
                        </td>
                        <td><span className={`badge ${o.cls}`}>{o.label}</span></td>
                      </tr>
                    )
                  })}
                  {!records.length && (
                    <tr><td colSpan={9} style={{ textAlign: 'center', color: 'var(--text3)', padding: 32 }}>No transplant records found</td></tr>
                  )}
                </tbody>
              </table>
            </div>
            {hasMore && (
              <div style={{ padding: 16, textAlign: 'center' }}>
                <button className="btn btn-ghost" onClick={() => setPage(p => p + 1)} disabled={loading}>
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
