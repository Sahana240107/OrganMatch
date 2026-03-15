import { useEffect, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Chart, registerables } from 'chart.js'
import { useApi } from '../hooks/useApi'
import KPICard from '../components/ui/KPICard'
import OrganPill from '../components/ui/OrganPill'
import ScoreBar from '../components/ui/ScoreBar'
import { urgencyClass, formatTime } from '../utils/formatters'
import { URGENCY_LABELS } from '../utils/constants'

Chart.register(...registerables)

const STATUS_BADGE = {
  offer_sent: 'badge-green', pending: 'badge-amber', matched: 'badge-blue',
  accepted: 'badge-teal', declined: 'badge-red',
}
const STATUS_LABEL = {
  offer_sent: 'Offer Sent', pending: 'Pending', matched: 'Matched',
  accepted: 'Accepted', declined: 'Declined',
}

function Spinner() {
  return <div style={{ padding: 32, textAlign: 'center', color: 'var(--text3)', fontSize: 13 }}>Loading…</div>
}

export default function Dashboard() {
  const navigate    = useNavigate()
  const { request } = useApi()
  const donutRef    = useRef(null)
  const lineRef     = useRef(null)
  const donutChart  = useRef(null)
  const lineChart   = useRef(null)

  const [kpis,        setKpis]        = useState(null)
  const [matches,     setMatches]     = useState([])
  const [activity,    setActivity]    = useState([])
  const [activeOffer, setActiveOffer] = useState(null)
  const [organCounts, setOrganCounts] = useState([])
  const [trend,       setTrend]       = useState([])
  const [loading,     setLoading]     = useState(true)
  const [error,       setError]       = useState('')

  const [secs, setSecs] = useState(0)
  useEffect(() => {
    if (!activeOffer?.response_deadline) return
    function calc() {
      setSecs(Math.max(0, Math.floor((new Date(activeOffer.response_deadline) - Date.now()) / 1000)))
    }
    calc()
    const id = setInterval(calc, 1000)
    return () => clearInterval(id)
  }, [activeOffer])

  useEffect(() => {
    async function load() {
      setLoading(true)
      setError('')
      try {
        const [kpiData, matchData, notifData, offerData, analyticsData] = await Promise.all([
          request('GET', '/api/analytics/summary'),
          request('GET', '/api/matches/recent'),
          request('GET', '/api/notifications?limit=5'),
          request('GET', '/api/offers/pending?limit=1'),
          request('GET', '/api/analytics/trends'),
        ])
        setKpis(kpiData)
        setMatches(matchData?.matches || [])
        setActivity(notifData?.notifications || [])
        setActiveOffer(offerData?.offers?.[0] || null)
        setOrganCounts(analyticsData?.organ_counts || [])
        setTrend(analyticsData?.daily_trend || [])
      } catch (e) {
        setError(e.message)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  useEffect(() => {
    if (!organCounts.length || !donutRef.current) return
    donutChart.current?.destroy()
    donutChart.current = new Chart(donutRef.current, {
      type: 'doughnut',
      data: {
        labels: organCounts.map(o => o.organ_type),
        datasets: [{ data: organCounts.map(o => o.count), backgroundColor: ['#3b82f6','#ef4444','#f59e0b','#2dd4bf','#a78bfa','#fb7185','#94a3b8','#34d399'], borderColor: 'transparent' }],
      },
      options: { responsive: true, maintainAspectRatio: false, cutout: '65%', plugins: { legend: { position: 'right', labels: { color: '#8892a8', font: { size: 11 }, boxWidth: 10, padding: 8 } } } },
    })
    return () => { donutChart.current?.destroy(); donutChart.current = null }
  }, [organCounts])

  useEffect(() => {
    if (!trend.length || !lineRef.current) return
    lineChart.current?.destroy()
    lineChart.current = new Chart(lineRef.current, {
      type: 'line',
      data: {
        labels: trend.map(t => t.label),
        datasets: [
          { label: 'Transplants', data: trend.map(t => t.transplants), borderColor: '#22c55e', backgroundColor: 'rgba(34,197,94,0.08)', tension: 0.4, fill: true, pointBackgroundColor: '#22c55e', pointRadius: 4 },
          { label: 'Donors',      data: trend.map(t => t.donors),      borderColor: '#3b82f6', backgroundColor: 'rgba(59,130,246,0.05)', tension: 0.4, fill: false, pointBackgroundColor: '#3b82f6', pointRadius: 4 },
        ],
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { labels: { color: '#8892a8', font: { size: 11 }, boxWidth: 10 } } },
        scales: {
          x: { ticks: { color: '#8892a8', font: { size: 10 } }, grid: { color: 'rgba(255,255,255,0.04)' } },
          y: { ticks: { color: '#8892a8', font: { size: 10 } }, grid: { color: 'rgba(255,255,255,0.04)' } },
        },
      },
    })
    return () => { lineChart.current?.destroy(); lineChart.current = null }
  }, [trend])

  if (error) return <div style={{ padding: 32, textAlign: 'center', color: 'var(--red)', fontSize: 13 }}>Failed to load: {error}</div>

  return (
    <div>
      <div className="grid-4 mb-20">
        <KPICard label="Active Organs"      value={kpis?.active_organs      ?? '—'} color="green" />
        <KPICard label="Waiting Recipients" value={kpis?.waiting_recipients ?? '—'} color="blue" />
        <KPICard label="Pending Offers"     value={kpis?.pending_offers     ?? '—'} color="amber" />
        <KPICard label="Status 1A / 1B"     value={kpis ? `${kpis.status_1a ?? 0} / ${kpis.status_1b ?? 0}` : '—'} color="red" />
      </div>

      <div className="grid-2-1 mb-16">
        <div className="card">
          <div className="card-header">
            <span className="card-title">Recent Matches</span>
            <button className="btn btn-ghost" style={{ padding: '4px 10px', fontSize: 12 }} onClick={() => navigate('/matching')}>View All</button>
          </div>
          {loading ? <Spinner /> : (
            <div className="table-wrap">
              <table>
                <thead><tr><th>Organ</th><th>Donor</th><th>Top Recipient</th><th>Score</th><th>Urgency</th><th>Status</th></tr></thead>
                <tbody>
                  {matches.map((m, i) => (
                    <tr key={i}>
                      <td><OrganPill type={m.organ_type} /></td>
                      <td style={{ fontFamily: 'var(--mono)', color: 'var(--text2)' }}>D-{m.donor_id}</td>
                      <td>R-{m.recipient_id} · {m.hospital}</td>
                      <td style={{ minWidth: 120 }}><ScoreBar score={m.total_score} /></td>
                      <td><span className={urgencyClass(m.medical_urgency)}>{URGENCY_LABELS[m.medical_urgency]}</span></td>
                      <td><span className={`badge ${STATUS_BADGE[m.status] || 'badge-gray'} badge-dot`}>{STATUS_LABEL[m.status] || m.status}</span></td>
                    </tr>
                  ))}
                  {!matches.length && <tr><td colSpan={6} style={{ textAlign: 'center', color: 'var(--text3)', padding: 24 }}>No recent matches</td></tr>}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-16">
          {activeOffer ? (
            <div className="offer-timer">
              <div style={{ fontSize: 11, color: 'var(--text2)', letterSpacing: '0.5px', textTransform: 'uppercase', marginBottom: 8 }}>
                ⚡ Active Offer — {activeOffer.organ?.organ_type} (D-{activeOffer.organ?.donor_id})
              </div>
              <div className="timer-display">{formatTime(secs)}</div>
              <div className="timer-label">Time Remaining to Respond</div>
              <div className="flex gap-8 mt-12">
                <button className="btn btn-primary" style={{ flex: 1 }} onClick={() => navigate('/offers')}>View Offer</button>
              </div>
            </div>
          ) : (
            <div className="offer-timer" style={{ opacity: 0.5 }}>
              <div style={{ fontSize: 13, color: 'var(--text2)', textAlign: 'center', padding: 8 }}>No active offers</div>
            </div>
          )}
          <div className="card">
            <div className="card-header"><span className="card-title">Organ Type Breakdown</span></div>
            <div style={{ padding: '16px 18px', position: 'relative', height: 200 }}>
              {loading ? <Spinner /> : <canvas ref={donutRef} />}
            </div>
          </div>
        </div>
      </div>

      <div className="grid-2">
        <div className="card">
          <div className="card-header"><span className="card-title">Activity Feed</span></div>
          <div style={{ padding: '12px 18px' }}>
            {loading ? <Spinner /> : (
              <div className="timeline">
                {activity.map((n, i) => (
                  <div key={i} className="tl-item">
                    <div className="tl-dot" style={{ background: 'rgba(59,130,246,0.15)' }}>
                      <svg style={{ width: 12, height: 12, fill: 'var(--blue)' }} viewBox="0 0 20 20"><path d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11H9v2h2V7zm0 4H9v6h2v-6z"/></svg>
                    </div>
                    <div className="tl-content">
                      <div className="tl-label">{n.title}</div>
                      <div className="tl-meta">{n.body} · {n.created_at ? new Date(n.created_at).toLocaleTimeString() : ''}</div>
                    </div>
                  </div>
                ))}
                {!activity.length && <div style={{ color: 'var(--text3)', fontSize: 12, textAlign: 'center', padding: 16 }}>No recent activity</div>}
              </div>
            )}
          </div>
        </div>
        <div className="card">
          <div className="card-header"><span className="card-title">Transplants — Last 30 Days</span></div>
          <div style={{ padding: '16px 18px', position: 'relative', height: 240 }}>
            {loading ? <Spinner /> : <canvas ref={lineRef} />}
          </div>
        </div>
      </div>
    </div>
  )
}
