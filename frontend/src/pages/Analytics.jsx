import { useEffect, useRef, useState, useCallback } from 'react'
import { Chart, registerables } from 'chart.js'
import { useApi } from '../hooks/useApi'

Chart.register(...registerables)

const GRID_COLOR  = 'rgba(15,30,70,0.06)'
const TICK_COLOR  = '#9aa3bc'
const ORGAN_ICONS = { kidney:'🫘', heart:'❤️', liver:'🫀', lung:'🫁', pancreas:'🧬', cornea:'👁️', bone:'🦴', small_intestine:'🔬' }
const ORGAN_COLORS= { kidney:'#0d6efd', heart:'#dc2626', liver:'#f59e0b', lung:'#06b6d4', pancreas:'#8b5cf6', cornea:'#ec4899', bone:'#64748b', small_intestine:'#16a34a' }
const URGENCY_COLORS = ['#dc2626','#d97706','#0d6efd','#64748b']
const URGENCY_LABELS = ['Status 1A','Status 1B','Status 2','Status 3']

function Spinner() {
  return <div className="spinner-page"><div className="spinner"/><span>Loading…</span></div>
}

// ── Radial gauge (SVG) ───────────────────────────────────────────────────────
function Gauge({ pct, color, label, value }) {
  const r = 36, circ = 2 * Math.PI * r
  const dash = (Math.min(100, Math.max(0, pct)) / 100) * circ
  return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:6 }}>
      <div style={{ position:'relative', width:88, height:88 }}>
        <svg width="88" height="88" viewBox="0 0 88 88">
          <circle cx="44" cy="44" r={r} fill="none" stroke="var(--bg3,#f1f5f9)" strokeWidth="9"/>
          <circle cx="44" cy="44" r={r} fill="none" stroke={color} strokeWidth="9"
            strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
            transform="rotate(-90 44 44)" style={{ transition:'stroke-dasharray 1s ease' }}/>
        </svg>
        <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center' }}>
          <span style={{ fontSize:14, fontWeight:900, color, lineHeight:1 }}>{value}</span>
        </div>
      </div>
      <span style={{ fontSize:11, color:'var(--text2)', fontWeight:600, textAlign:'center' }}>{label}</span>
    </div>
  )
}

// ── Urgency — donut + count list ─────────────────────────────────────────────
function UrgencyPanel({ urgencyDist, loading }) {
  const canvasRef = useRef(null)
  const chartRef  = useRef(null)

  useEffect(() => {
    if (!canvasRef.current || !urgencyDist.length) return
    chartRef.current?.destroy()
    chartRef.current = new Chart(canvasRef.current, {
      type: 'doughnut',
      data: {
        labels: urgencyDist.map(u => u.label),
        datasets: [{
          data: urgencyDist.map(u => u.count),
          backgroundColor: URGENCY_COLORS.slice(0, urgencyDist.length),
          borderWidth: 3,
          borderColor: '#fff',
        }],
      },
      options: {
        responsive: true, maintainAspectRatio: false, cutout: '60%',
        plugins: { legend: { display: false } },
      },
    })
    return () => chartRef.current?.destroy()
  }, [urgencyDist])

  const total = urgencyDist.reduce((s, u) => s + u.count, 0) || 1

  return (
    <div className="card">
      <div className="card-header"><span className="card-title">Urgency Distribution</span></div>
      <div style={{ padding:'16px 20px' }}>
        {loading ? <Spinner /> : urgencyDist.length === 0
          ? <div className="empty-state"><div style={{ color:'var(--text3)', fontSize:12 }}>No data yet</div></div>
          : <div style={{ display:'flex', gap:20, alignItems:'center' }}>
              {/* Donut chart */}
              <div style={{ position:'relative', width:130, height:130, flexShrink:0 }}>
                <canvas ref={canvasRef} />
                <div style={{ position:'absolute', inset:0, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center' }}>
                  <span style={{ fontSize:20, fontWeight:900, color:'var(--text)', lineHeight:1 }}>{total}</span>
                  <span style={{ fontSize:9, color:'var(--text3)', textTransform:'uppercase', letterSpacing:'0.5px', marginTop:2 }}>total</span>
                </div>
              </div>
              {/* Count list */}
              <div style={{ flex:1, display:'flex', flexDirection:'column', gap:9 }}>
                {urgencyDist.map((u, i) => {
                  const color = URGENCY_COLORS[i]
                  const pct   = Math.round((u.count / total) * 100)
                  return (
                    <div key={u.label} style={{ display:'flex', alignItems:'center', gap:8 }}>
                      <div style={{ width:9, height:9, borderRadius:2, background:color, flexShrink:0 }} />
                      <span style={{ fontSize:12, fontWeight:500, color:'var(--text)', flex:1 }}>{u.label}</span>
                      <span style={{ fontSize:13, fontWeight:800, color, fontFamily:'var(--mono)', minWidth:28, textAlign:'right' }}>{u.count}</span>
                      <span style={{ fontSize:10, color:'var(--text3)', minWidth:30, textAlign:'right' }}>{pct}%</span>
                    </div>
                  )
                })}
              </div>
            </div>
        }
      </div>
    </div>
  )
}

// ── Organ donut ──────────────────────────────────────────────────────────────
function OrganDonut({ organBreak, loading }) {
  const canvasRef = useRef(null)
  const chartRef  = useRef(null)
  const colors    = organBreak.map(o => ORGAN_COLORS[o.organ_type] || '#64748b')
  useEffect(() => {
    if (!canvasRef.current || !organBreak.length) return
    chartRef.current?.destroy()
    chartRef.current = new Chart(canvasRef.current, {
      type: 'doughnut',
      data: {
        labels: organBreak.map(o => o.organ_type),
        datasets: [{ data: organBreak.map(o => o.count || 0), backgroundColor: colors, borderWidth: 2, borderColor: '#fff' }],
      },
      options: {
        responsive: true, maintainAspectRatio: false, cutout: '62%',
        plugins: { legend: { display: false } },
      },
    })
    return () => chartRef.current?.destroy()
  }, [organBreak])

  const total = organBreak.reduce((s, o) => s + (o.count || 0), 0) || 0
  const sorted = [...organBreak].sort((a, b) => (b.count || 0) - (a.count || 0))

  return (
    <div className="card">
      <div className="card-header">
        <span className="card-title">Transplants by Organ</span>
        <span style={{ fontSize:11, color:'var(--text3)' }}>total: {total}</span>
      </div>
      <div style={{ padding:'16px 20px', display:'flex', gap:20, alignItems:'center' }}>
        {loading ? <Spinner /> : organBreak.length === 0
          ? <div className="empty-state"><div style={{ color:'var(--text3)', fontSize:12 }}>No data yet</div></div>
          : <>
              <div style={{ position:'relative', width:120, height:120, flexShrink:0 }}>
                <canvas ref={canvasRef} width="120" height="120" />
                <div style={{ position:'absolute', inset:0, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center' }}>
                  <span style={{ fontSize:20, fontWeight:900, color:'var(--text)' }}>{total}</span>
                  <span style={{ fontSize:9, color:'var(--text3)', textTransform:'uppercase', letterSpacing:'0.5px' }}>total</span>
                </div>
              </div>
              <div style={{ flex:1, display:'flex', flexDirection:'column', gap:7 }}>
                {sorted.slice(0, 5).map((o, i) => {
                  const color = ORGAN_COLORS[o.organ_type] || '#64748b'
                  const pct   = Math.round(((o.count || 0) / total) * 100)
                  return (
                    <div key={o.organ_type} style={{ display:'flex', alignItems:'center', gap:8 }}>
                      <span style={{ fontSize:13 }}>{ORGAN_ICONS[o.organ_type] || '🫀'}</span>
                      <span style={{ fontSize:11, fontWeight:500, color:'var(--text)', flex:1, textTransform:'capitalize' }}>{o.organ_type?.replace('_',' ')}</span>
                      <span style={{ fontSize:12, fontWeight:800, color, fontFamily:'var(--mono)' }}>{o.count || 0}</span>
                      <span style={{ fontSize:10, color:'var(--text3)', minWidth:28, textAlign:'right' }}>{pct}%</span>
                    </div>
                  )
                })}
              </div>
            </>
        }
      </div>
    </div>
  )
}

// ── Thin horizontal bar — hospitals by success rate ──────────────────────────
function HospitalBarChart({ topHospitals, loading }) {
  const sorted = [...topHospitals].sort((a, b) => (b.success_rate ?? b.transplants ?? 0) - (a.success_rate ?? a.transplants ?? 0))
  const BAR_COLORS = ['#0d6efd','#7c3aed','#16a34a','#d97706','#06b6d4','#ec4899','#64748b','#dc2626']
  const maxVal = Math.max(...sorted.map(h => h.success_rate ?? h.transplants ?? h.count ?? 0), 1)

  return (
    <div className="card">
      <div className="card-header"><span className="card-title">Top Hospitals by Success Rate</span></div>
      <div style={{ padding:'16px 20px' }}>
        {loading ? <Spinner /> : sorted.length === 0
          ? <div className="empty-state"><div style={{ color:'var(--text3)', fontSize:12 }}>No hospital data yet</div></div>
          : <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
              {sorted.map((h, i) => {
                const val   = h.success_rate ?? h.transplants ?? h.count ?? 0
                const pct   = (val / maxVal) * 100
                const color = BAR_COLORS[i % BAR_COLORS.length]
                const name  = (h.hospital || h.name || '').split(' ').slice(0, 3).join(' ')
                const label = h.success_rate != null ? `${h.success_rate}%` : val
                return (
                  <div key={i} style={{ display:'flex', alignItems:'center', gap:10 }}>
                    {/* Hospital name */}
                    <div style={{ width:120, flexShrink:0, fontSize:11.5, fontWeight:500, color:'var(--text2)', textAlign:'right', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
                      {name}
                    </div>
                    {/* Left label */}
                    <span style={{ fontSize:11, fontWeight:700, color, width:34, textAlign:'right', flexShrink:0 }}>
                      {label}
                    </span>
                    {/* Thin bar */}
                    <div style={{ flex:1, height:4, background:'var(--bg3)', borderRadius:999, overflow:'hidden' }}>
                      <div style={{
                        height:'100%',
                        width:`${pct}%`,
                        background: color,
                        borderRadius: 999,
                        transition: 'width 0.8s cubic-bezier(0.34,1.56,0.64,1)',
                        animation: 'barGrow 0.8s ease both',
                      }} />
                    </div>
                    {/* Right label */}
                    <span style={{ fontSize:11, fontWeight:700, color, width:34, flexShrink:0 }}>
                      {label}
                    </span>
                  </div>
                )
              })}
            </div>
        }
      </div>
    </div>
  )
}

// ── Graft success radial gauges ──────────────────────────────────────────────
function GraftGauges({ transplantSum, loading }) {
  const organs = transplantSum?.by_organ || []
  return (
    <div className="card">
      <div className="card-header"><span className="card-title">Graft Success by Organ</span></div>
      <div style={{ padding:'16px 20px' }}>
        {loading ? <Spinner /> : organs.length === 0
          ? <div className="empty-state"><div style={{ color:'var(--text3)', fontSize:12 }}>No outcome data yet</div></div>
          : <div style={{ display:'flex', flexWrap:'wrap', gap:20, justifyContent:'center' }}>
              {organs.map(o => {
                const rate  = o.count > 0 ? Math.round((o.successful / o.count) * 100) : 0
                const color = rate >= 80 ? '#16a34a' : rate >= 60 ? '#0d6efd' : rate >= 40 ? '#f59e0b' : '#dc2626'
                return (
                  <Gauge key={o.organ_type} pct={rate} color={color}
                    label={`${ORGAN_ICONS[o.organ_type] || '🫀'} ${o.organ_type?.replace('_',' ')}`}
                    value={`${rate}%`} />
                )
              })}
            </div>
        }
      </div>
    </div>
  )
}

// ── Waiting list — pie chart + count list ────────────────────────────────────
function WaitingList({ waitingCounts, loading }) {
  const canvasRef = useRef(null)
  const chartRef  = useRef(null)
  const sorted    = [...waitingCounts].sort((a,b) => (b.count||0) - (a.count||0))
  const colors    = sorted.map(r => ORGAN_COLORS[r.organ_type] || '#64748b')
  useEffect(() => {
    if (!canvasRef.current || !sorted.length) return
    chartRef.current?.destroy()
    chartRef.current = new Chart(canvasRef.current, {
      type: 'pie',
      data: {
        labels: sorted.map(r => r.organ_type?.replace('_',' ')),
        datasets: [{ data: sorted.map(r => r.count||0), backgroundColor: colors, borderWidth: 3, borderColor: '#fff' }],
      },
      options: { responsive:true, maintainAspectRatio:false, plugins:{ legend:{ display:false } } },
    })
    return () => chartRef.current?.destroy()
  }, [waitingCounts])
  const total = sorted.reduce((s,r) => s + (r.count||0), 0) || 1
  return (
    <div className="card">
      <div className="card-header"><span className="card-title">Waiting List by Organ</span></div>
      <div style={{ padding:'16px 20px', display:'flex', gap:20, alignItems:'center' }}>
        {loading ? <Spinner /> : sorted.length === 0
          ? <div className="empty-state"><div style={{ color:'var(--text3)', fontSize:12 }}>No waiting list data</div></div>
          : <>
              <div style={{ width:150, height:150, flexShrink:0 }}><canvas ref={canvasRef} /></div>
              <div style={{ flex:1, display:'flex', flexDirection:'column', gap:7 }}>
                {sorted.map((r, i) => {
                  const color = colors[i]
                  const pct   = Math.round(((r.count||0) / total) * 100)
                  return (
                    <div key={r.organ_type} style={{ display:'flex', alignItems:'center', gap:7, animation:'fadeSlideIn 0.3s ease both', animationDelay:`${i*0.05}s` }}>
                      <div style={{ width:9, height:9, borderRadius:2, background:color, flexShrink:0 }} />
                      <span style={{ fontSize:13 }}>{ORGAN_ICONS[r.organ_type]||'🫀'}</span>
                      <span style={{ fontSize:12, fontWeight:500, color:'var(--text)', flex:1, textTransform:'capitalize' }}>{r.organ_type?.replace('_',' ')}</span>
                      <span style={{ fontSize:12, fontWeight:800, color, fontFamily:'var(--mono)' }}>{r.count||0}</span>
                      <span style={{ fontSize:10, color:'var(--text3)', minWidth:28, textAlign:'right' }}>{pct}%</span>
                      {r.avg_wait && <span style={{ fontSize:10, color:'var(--text3)', minWidth:34, textAlign:'right' }}>~{r.avg_wait}mo</span>}
                    </div>
                  )
                })}
              </div>
            </>
        }
      </div>
    </div>
  )
}

// ── HLA bar chart ────────────────────────────────────────────────────────────
function HLAChart({ hlaStats, loading }) {
  const canvasRef = useRef(null)
  const chartRef  = useRef(null)
  useEffect(() => {
    if (!canvasRef.current || !hlaStats.length) return
    chartRef.current?.destroy()
    chartRef.current = new Chart(canvasRef.current, {
      type: 'bar',
      data: {
        labels: hlaStats.map(h => `${h.matches}/6`),
        datasets: [{
          data: hlaStats.map(h => h.count),
          backgroundColor: hlaStats.map(h =>
            h.matches>=5?'#16a34a':h.matches>=4?'#06b6d4':h.matches>=3?'#0d6efd':h.matches>=2?'#f59e0b':h.matches>=1?'#ec4899':'#dc2626'
          ),
          borderRadius: 6, borderSkipped: false,
        }],
      },
      options: {
        responsive:true, maintainAspectRatio:false,
        plugins:{ legend:{display:false} },
        scales:{
          x:{ ticks:{color:TICK_COLOR,font:{size:11}}, grid:{display:false} },
          y:{ ticks:{color:TICK_COLOR,font:{size:10}}, grid:{color:GRID_COLOR}, beginAtZero:true },
        },
      },
    })
    return () => chartRef.current?.destroy()
  }, [hlaStats])

  return (
    <div className="card">
      <div className="card-header">
        <span className="card-title">HLA Match Distribution</span>
        <span className="badge badge-blue" style={{ fontSize:10 }}>M3 Engine</span>
      </div>
      <div style={{ padding:'16px 20px', height:220, position:'relative' }}>
        {loading ? <Spinner /> : hlaStats.length === 0
          ? <div className="empty-state"><div style={{ color:'var(--text3)', fontSize:12 }}>No match data yet</div></div>
          : <canvas ref={canvasRef} />
        }
      </div>
    </div>
  )
}

// ── Main page ────────────────────────────────────────────────────────────────
export default function Analytics() {
  const { request } = useApi()
  const lineRef   = useRef(null)
  const lineChart = useRef(null)

  const [kpis,         setKpis]         = useState(null)
  const [matchKpis,    setMatchKpis]    = useState(null)
  const [monthlyTrend, setMonthlyTrend] = useState([])
  const [organBreak,   setOrganBreak]   = useState([])
  const [urgencyDist,  setUrgencyDist]  = useState([])
  const [topHospitals, setTopHospitals] = useState([])
  const [hlaStats,     setHlaStats]     = useState([])
  const [transplantSum,setTransplantSum]= useState(null)
  const [waitingCounts,setWaitingCounts]= useState([])
  const [loading,      setLoading]      = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    async function safe(p) { try { return await p } catch { return null } }
    const [fullData, trendsData, transplantData, hlaData, matchData, waitData] = await Promise.all([
      safe(request('GET', '/api/analytics/full')),
      safe(request('GET', '/api/analytics/trends')),
      safe(request('GET', '/api/analytics/transplant-summary')),
      safe(request('GET', '/api/matches/hla-stats')),
      safe(request('GET', '/api/analytics/matching-kpis')),
      safe(request('GET', '/api/analytics/waiting-list-counts')),
    ])
    const s = fullData?.summary || {}
    setKpis({
      total_transplants: s.total_transplants ?? transplantData?.total ?? '—',
      survival_rate:     transplantData?.survival_rate ?? '—',
      graft_failures:    transplantData?.graft_failures ?? '—',
      total_waiting:     s.total_waiting ?? '—',
    })
    setMatchKpis(matchData)
    setTopHospitals(fullData?.top_hospitals || [])
    setMonthlyTrend(trendsData?.daily_trend  || [])
    setOrganBreak(  trendsData?.organ_counts || [])
    setTransplantSum(transplantData)
    setUrgencyDist([
      { label:'Status 1A', count: s.total_1a ?? 0 },
      { label:'Status 1B', count: s.total_1b ?? 0 },
      { label:'Status 2',  count: s.total_2  ?? 0 },
      { label:'Status 3',  count: s.total_3  ?? 0 },
    ].filter(u => u.count > 0))
    setHlaStats(hlaData?.distribution || [])
    setWaitingCounts(waitData?.by_organ || [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  // Line chart
  useEffect(() => {
    if (!lineRef.current || !monthlyTrend.length) return
    lineChart.current?.destroy()
    lineChart.current = new Chart(lineRef.current, {
      type: 'line',
      data: {
        labels: monthlyTrend.map(t => t.label),
        datasets: [
          { label:'Transplants', data:monthlyTrend.map(t=>t.transplants), borderColor:'#0d6efd', backgroundColor:'rgba(13,110,253,0.08)', tension:0.4, fill:true, pointBackgroundColor:'#0d6efd', pointRadius:3, borderWidth:2 },
          { label:'New Donors',  data:monthlyTrend.map(t=>t.donors||0),  borderColor:'#16a34a', backgroundColor:'rgba(22,163,74,0.06)',  tension:0.4, fill:true, pointBackgroundColor:'#16a34a', pointRadius:3, borderWidth:2 },
        ],
      },
      options: {
        responsive:true, maintainAspectRatio:false,
        plugins:{ legend:{ labels:{ color:TICK_COLOR, font:{size:11}, boxWidth:10 }}},
        scales:{
          x:{ ticks:{color:TICK_COLOR,font:{size:10}}, grid:{color:GRID_COLOR} },
          y:{ ticks:{color:TICK_COLOR,font:{size:10}}, grid:{color:GRID_COLOR}, beginAtZero:true },
        },
      },
    })
    return () => lineChart.current?.destroy()
  }, [monthlyTrend, loading])

  const matchRate = parseFloat(matchKpis?.match_rate) || 0
  const survival  = parseFloat(kpis?.survival_rate)   || 0

  return (
    <div>
      <style>{`
        @keyframes fadeSlideIn { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
        @keyframes barGrow { from{width:0} }
      `}</style>

      <div className="page-header mb-24">
        <div>
          <h1 className="page-title">Analytics <span>Report</span></h1>
          <p className="page-subtitle">Platform-wide transplant outcomes, matching performance & waiting list intelligence</p>
        </div>
        <button className="btn btn-outline btn-sm" onClick={load}>↻ Refresh</button>
      </div>

      {/* KPI row */}
      <div className="grid-4 mb-24">
        {[
          { label:'Total Transplants', value:kpis?.total_transplants??'—', color:'#0d6efd',
            icon:<svg viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/></svg> },
          { label:'Graft Survival',    value:kpis?.survival_rate!=null?`${kpis.survival_rate}%`:'—', color:'#16a34a',
            icon:<svg viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd"/></svg> },
          { label:'Waiting Patients',  value:kpis?.total_waiting??'—', color:'#7c3aed',
            icon:<svg viewBox="0 0 20 20" fill="currentColor"><path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17.555 16.549A9.97 9.97 0 0110 19a9.97 9.97 0 01-7.555-3.451A2 2 0 014 13h12a2 2 0 012 3l-.445-.451z"/></svg> },
          { label:'Graft Failures',    value:kpis?.graft_failures??'—', color:'#dc2626',
            icon:<svg viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd"/></svg> },
        ].map((k,i)=>(
          <div key={i} className="kpi-card" style={{'--kpi-color':k.color, animationDelay:`${i*0.06}s`}}>
            <div className="flex items-center justify-between">
              <div className="kpi-label">{k.label}</div>
              <div className="kpi-icon">{k.icon}</div>
            </div>
            <div className="kpi-value">{k.value}</div>
          </div>
        ))}
      </div>

      {/* Matching engine performance */}
      {!loading && matchKpis && (
        <div className="card mb-20">
          <div className="card-header">
            <span className="card-title">Matching Engine Performance</span>
            <span className="badge badge-blue" style={{fontSize:10}}>Live</span>
          </div>
          <div style={{padding:'20px 24px', display:'flex', alignItems:'center', gap:40, flexWrap:'wrap'}}>
            <Gauge pct={matchRate} color="#0d6efd" label="Match Rate"    value={matchKpis.match_rate||'—'} />
            <Gauge pct={survival}  color="#16a34a" label="Graft Survival" value={kpis?.survival_rate!=null?`${kpis.survival_rate}%`:'—'} />
            <div style={{width:1,height:80,background:'var(--border)',flexShrink:0}}/>
            {[
              { label:'Available Organs', value:matchKpis.available_organs??'—', color:'#0d6efd' },
              { label:'Total Candidates', value:matchKpis.total_candidates??'—', color:'#7c3aed' },
              { label:'Feasible Matches', value:matchKpis.feasible_matches??'—', color:'#16a34a' },
              { label:'Avg Match Score',  value:matchKpis.avg_score??'—',        color:'#f59e0b' },
              { label:'Top Score',        value:matchKpis.top_score??'—',        color:'#06b6d4' },
            ].map((s,i)=>(
              <div key={i} style={{textAlign:'center', minWidth:90}}>
                <div style={{fontSize:24,fontWeight:900,color:s.color,lineHeight:1,fontFamily:'var(--mono)'}}>{s.value}</div>
                <div style={{fontSize:11,color:'var(--text3)',marginTop:5,fontWeight:500}}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Row 1: Line chart + Organ donut */}
      <div className="grid-2 mb-20">
        <div className="card">
          <div className="card-header"><span className="card-title">Daily Activity — Last 30 Days</span></div>
          <div style={{padding:'16px 20px', height:240, position:'relative'}}>
            {loading ? <Spinner/> : monthlyTrend.length > 0
              ? <canvas ref={lineRef}/>
              : <div className="empty-state"><div style={{color:'var(--text3)',fontSize:12}}>No trend data yet</div></div>
            }
          </div>
        </div>
        <OrganDonut organBreak={organBreak} loading={loading} />
      </div>

      {/* Row 2: Urgency donut + HLA bar + Graft gauges */}
      <div className="grid-3 mb-20">
        <UrgencyPanel urgencyDist={urgencyDist} loading={loading} />
        <HLAChart hlaStats={hlaStats} loading={loading} />
        <GraftGauges transplantSum={transplantSum} loading={loading} />
      </div>

      {/* Row 3: Waiting list (no pie) + Hospital thin bars */}
      <div className="grid-2 mb-20">
        <WaitingList waitingCounts={waitingCounts} loading={loading} />
        <HospitalBarChart topHospitals={topHospitals} loading={loading} />
      </div>
    </div>
  )
}