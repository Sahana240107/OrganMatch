import { useEffect, useRef, useState } from 'react'
import { Chart, registerables } from 'chart.js'
import { useApi } from '../hooks/useApi'
import KPICard from '../components/ui/KPICard'

Chart.register(...registerables)

function Spinner() {
  return <div style={{ padding: 32, textAlign: 'center', color: 'var(--text3)', fontSize: 13 }}>Loading…</div>
}

export default function Analytics() {
  const { request } = useApi()

  const lineRef    = useRef(null)
  const barRef     = useRef(null)
  const donutRef   = useRef(null)
  const lineChart  = useRef(null)
  const barChart   = useRef(null)
  const donutChart = useRef(null)

  const [kpis,         setKpis]         = useState(null)
  const [monthlyTrend, setMonthlyTrend] = useState([])
  const [organBreak,   setOrganBreak]   = useState([])
  const [urgencyDist,  setUrgencyDist]  = useState([])
  const [topHospitals, setTopHospitals] = useState([])
  const [bloodDist,    setBloodDist]    = useState([])
  const [loading,      setLoading]      = useState(true)
  const [error,        setError]        = useState('')

  useEffect(() => {
    async function load() {
      setLoading(true)
      setError('')
      try {
        const data = await request('GET', '/api/analytics/full')
        setKpis(data?.kpis             || null)
        setMonthlyTrend(data?.monthly_trend   || [])
        setOrganBreak(data?.organ_breakdown   || [])
        setUrgencyDist(data?.urgency_distribution || [])
        setTopHospitals(data?.top_hospitals   || [])
        setBloodDist(data?.blood_distribution  || [])
      } catch (e) {
        setError(e.message)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  // Monthly trend line chart
  useEffect(() => {
    if (!monthlyTrend.length || !lineRef.current) return
    lineChart.current?.destroy()
    lineChart.current = new Chart(lineRef.current, {
      type: 'line',
      data: {
        labels: monthlyTrend.map(t => t.month),
        datasets: [
          { label: 'This Year', data: monthlyTrend.map(t => t.current_year), borderColor: '#22c55e', backgroundColor: 'rgba(34,197,94,0.08)', tension: 0.4, fill: true, pointBackgroundColor: '#22c55e', pointRadius: 3 },
          { label: 'Last Year', data: monthlyTrend.map(t => t.prev_year),    borderColor: '#3b82f6', backgroundColor: 'transparent', tension: 0.4, borderDash: [4, 2], pointRadius: 2 },
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
  }, [monthlyTrend])

  // Organ breakdown bar chart
  useEffect(() => {
    if (!organBreak.length || !barRef.current) return
    barChart.current?.destroy()
    barChart.current = new Chart(barRef.current, {
      type: 'bar',
      data: {
        labels: organBreak.map(o => o.organ_type),
        datasets: [{ label: 'Transplants', data: organBreak.map(o => o.count), backgroundColor: ['#3b82f6','#f59e0b','#ef4444','#2dd4bf','#a78bfa','#fb7185','#94a3b8','#34d399'], borderRadius: 4, borderSkipped: false }],
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { ticks: { color: '#8892a8', font: { size: 10 } }, grid: { display: false } },
          y: { ticks: { color: '#8892a8', font: { size: 10 } }, grid: { color: 'rgba(255,255,255,0.04)' } },
        },
      },
    })
    return () => { barChart.current?.destroy(); barChart.current = null }
  }, [organBreak])

  // Urgency donut chart
  useEffect(() => {
    if (!urgencyDist.length || !donutRef.current) return
    donutChart.current?.destroy()
    donutChart.current = new Chart(donutRef.current, {
      type: 'doughnut',
      data: {
        labels: urgencyDist.map(u => u.label),
        datasets: [{ data: urgencyDist.map(u => u.count), backgroundColor: ['#ef4444','#f59e0b','#3b82f6','#4a5568'], borderColor: 'transparent' }],
      },
      options: {
        responsive: true, maintainAspectRatio: false, cutout: '60%',
        plugins: { legend: { position: 'bottom', labels: { color: '#8892a8', font: { size: 10 }, boxWidth: 10, padding: 8 } } },
      },
    })
    return () => { donutChart.current?.destroy(); donutChart.current = null }
  }, [urgencyDist])

  const maxHospCount = topHospitals[0]?.count || 1

  if (error) return <div style={{ padding: 32, textAlign: 'center', color: 'var(--red)', fontSize: 13 }}>Failed to load analytics: {error}</div>

  return (
    <div>
      <div className="grid-4 mb-20">
        <KPICard label="Match Success Rate"   value={kpis?.match_success_rate   ? `${kpis.match_success_rate}%`  : '—'} color="green" />
        <KPICard label="Avg Score"            value={kpis?.avg_match_score      ?? '—'}                                  color="blue" />
        <KPICard label="Organs Expired"       value={kpis?.organs_expired       ?? '—'}                                  color="amber" />
        <KPICard label="Avg Offer Resp. Time" value={kpis?.avg_response_time_hrs ? `${kpis.avg_response_time_hrs}h` : '—'} color="red" />
      </div>

      <div className="grid-2 mb-16">
        <div className="card">
          <div className="card-header"><span className="card-title">Monthly Transplant Trend</span></div>
          <div style={{ padding: '16px 18px', position: 'relative', height: 240 }}>
            {loading ? <Spinner /> : <canvas ref={lineRef} />}
          </div>
        </div>
        <div className="card">
          <div className="card-header"><span className="card-title">Transplants by Organ Type</span></div>
          <div style={{ padding: '16px 18px', position: 'relative', height: 240 }}>
            {loading ? <Spinner /> : <canvas ref={barRef} />}
          </div>
        </div>
      </div>

      <div className="grid-3">
        {/* Top hospitals */}
        <div className="card">
          <div className="card-header"><span className="card-title">Top Hospitals by Volume</span></div>
          <div style={{ padding: '12px 0' }}>
            {loading ? <Spinner /> : topHospitals.map((h, i) => {
              const COLORS = ['var(--accent)','var(--blue)','var(--teal)','var(--amber)','var(--purple)']
              return (
                <div key={i} className="flex items-center justify-between" style={{ padding: '8px 16px' }}>
                  <span style={{ fontSize: 12, flex: 1 }}>{h.name}</span>
                  <div className="score-bar-wrap" style={{ width: 120 }}>
                    <div className="score-bar">
                      <div className="score-bar-fill" style={{ width: `${(h.count / maxHospCount) * 100}%`, background: COLORS[i % COLORS.length] }} />
                    </div>
                    <span className="score-val">{h.count}</span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Urgency donut */}
        <div className="card">
          <div className="card-header"><span className="card-title">Urgency Distribution</span></div>
          <div style={{ padding: '16px 18px', position: 'relative', height: 200 }}>
            {loading ? <Spinner /> : <canvas ref={donutRef} />}
          </div>
        </div>

        {/* Blood group */}
        <div className="card">
          <div className="card-header"><span className="card-title">Blood Group Distribution</span></div>
          <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
            {loading ? <Spinner /> : bloodDist.map((b, i) => {
              const COLORS = ['var(--amber)','var(--blue)','var(--accent)','var(--purple)','var(--text2)']
              const color  = COLORS[i % COLORS.length]
              return (
                <div key={b.blood_group}>
                  <div className="flex items-center justify-between mb-4">
                    <span style={{ fontSize: 12 }}>{b.blood_group}</span>
                    <span style={{ fontSize: 12, fontFamily: 'var(--mono)', color }}>{b.percentage}%</span>
                  </div>
                  <div className="score-bar">
                    <div className="score-bar-fill" style={{ width: `${b.percentage}%`, background: color }} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
